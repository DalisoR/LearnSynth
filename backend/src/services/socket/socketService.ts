import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import logger from '../../utils/logger';
import config from '../../config/config';

interface UserSocket extends Socket {
  userId?: string;
  groupId?: string;
}

class SocketService {
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socket IDs
  private groupRooms: Map<string, Set<string>> = new Map(); // groupId -> Set of user IDs

  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: [config.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean),
        credentials: true,
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket: UserSocket) => {
      logger.info('Client connected', { socketId: socket.id });

      // Handle user authentication and registration
      socket.on('user:register', (data: { userId: string }) => {
        socket.userId = data.userId;

        // Add socket to user's socket set
        if (!this.userSockets.has(data.userId)) {
          this.userSockets.set(data.userId, new Set());
        }
        this.userSockets.get(data.userId)!.add(socket.id);

        logger.info('User registered', { userId: data.userId, socketId: socket.id });

        // Notify user's online status to their groups
        this.broadcastUserStatus(data.userId, 'online');
      });

      // Handle joining a group room
      socket.on('group:join', (data: { groupId: string; userId: string }) => {
        socket.groupId = data.groupId;
        socket.userId = data.userId;

        // Join the Socket.io room
        socket.join(`group:${data.groupId}`);

        // Track user in group
        if (!this.groupRooms.has(data.groupId)) {
          this.groupRooms.set(data.groupId, new Set());
        }
        this.groupRooms.get(data.groupId)!.add(data.userId);

        logger.info('User joined group', {
          userId: data.userId,
          groupId: data.groupId,
          socketId: socket.id
        });

        // Notify others in the group
        socket.to(`group:${data.groupId}`).emit('user:joined', {
          userId: data.userId,
          timestamp: new Date().toISOString(),
        });

        // Send current online users in the group
        const onlineUsers = this.getGroupOnlineUsers(data.groupId);
        socket.emit('group:online-users', { users: onlineUsers });
      });

      // Handle leaving a group room
      socket.on('group:leave', (data: { groupId: string; userId: string }) => {
        socket.leave(`group:${data.groupId}`);

        // Remove user from group tracking
        if (this.groupRooms.has(data.groupId)) {
          this.groupRooms.get(data.groupId)!.delete(data.userId);
        }

        logger.info('User left group', { userId: data.userId, groupId: data.groupId });

        // Notify others
        socket.to(`group:${data.groupId}`).emit('user:left', {
          userId: data.userId,
          timestamp: new Date().toISOString(),
        });
      });

      // Handle group chat messages
      socket.on('group:message', (data: {
        groupId: string;
        userId: string;
        message: string;
        userName: string;
      }) => {
        const messageData = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          groupId: data.groupId,
          userId: data.userId,
          userName: data.userName,
          message: data.message,
          timestamp: new Date().toISOString(),
        };

        // Broadcast to all users in the group including sender
        this.io!.to(`group:${data.groupId}`).emit('group:message', messageData);

        logger.info('Group message sent', {
          groupId: data.groupId,
          userId: data.userId,
          messageLength: data.message.length
        });
      });

      // Handle typing indicators
      socket.on('group:typing', (data: { groupId: string; userId: string; userName: string; isTyping: boolean }) => {
        socket.to(`group:${data.groupId}`).emit('group:typing', {
          userId: data.userId,
          userName: data.userName,
          isTyping: data.isTyping,
        });
      });

      // Handle collaborative note updates
      socket.on('note:update', (data: {
        noteId: string;
        content: string;
        userId: string;
        cursorPosition?: number;
      }) => {
        // Broadcast to others editing the same note
        socket.broadcast.emit('note:remote-update', {
          noteId: data.noteId,
          content: data.content,
          userId: data.userId,
          cursorPosition: data.cursorPosition,
          timestamp: new Date().toISOString(),
        });
      });

      // Handle cursor position updates for collaborative editing
      socket.on('note:cursor', (data: {
        noteId: string;
        userId: string;
        userName: string;
        position: number;
      }) => {
        socket.broadcast.emit('note:remote-cursor', data);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        if (socket.userId) {
          // Remove socket from user's set
          const userSocketSet = this.userSockets.get(socket.userId);
          if (userSocketSet) {
            userSocketSet.delete(socket.id);
            if (userSocketSet.size === 0) {
              this.userSockets.delete(socket.userId);
              // User is completely offline
              this.broadcastUserStatus(socket.userId, 'offline');
            }
          }

          // Remove from group rooms
          if (socket.groupId && this.groupRooms.has(socket.groupId)) {
            this.groupRooms.get(socket.groupId)!.delete(socket.userId);
          }
        }

        logger.info('Client disconnected', { socketId: socket.id, userId: socket.userId });
      });
    });

    logger.info('✅ Socket.io server initialized');
  }

  // Get all online users in a group
  private getGroupOnlineUsers(groupId: string): string[] {
    const groupUsers = this.groupRooms.get(groupId);
    if (!groupUsers) return [];

    return Array.from(groupUsers).filter(userId =>
      this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0
    );
  }

  // Broadcast user online/offline status to their groups
  private broadcastUserStatus(userId: string, status: 'online' | 'offline'): void {
    // Find all groups this user is in
    this.groupRooms.forEach((users, groupId) => {
      if (users.has(userId)) {
        this.io!.to(`group:${groupId}`).emit('user:status', {
          userId,
          status,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  // Send a message to a specific user (all their connected devices)
  sendToUser(userId: string, event: string, data: any): void {
    const socketIds = this.userSockets.get(userId);
    if (socketIds && this.io) {
      socketIds.forEach(socketId => {
        this.io!.to(socketId).emit(event, data);
      });
    }
  }

  // Send a message to a specific group
  sendToGroup(groupId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`group:${groupId}`).emit(event, data);
    }
  }

  // Get Socket.io server instance
  getIO(): SocketIOServer | null {
    return this.io;
  }

  // Get online user count
  getOnlineUserCount(): number {
    return this.userSockets.size;
  }

  // Get online users in a group
  getGroupOnlineUserCount(groupId: string): number {
    return this.getGroupOnlineUsers(groupId).length;
  }
}

export default new SocketService();
