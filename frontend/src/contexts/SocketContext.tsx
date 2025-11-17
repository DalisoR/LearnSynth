import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  sendGroupMessage: (groupId: string, message: string) => void;
  sendTypingIndicator: (groupId: string, isTyping: boolean) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinGroup: () => {},
  leaveGroup: () => {},
  sendGroupMessage: () => {},
  sendTypingIndicator: () => {},
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      // Disconnect socket if user logs out
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Connect to Socket.io server
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        userId: user.id,
      },
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Socket.io connected:', newSocket.id);
      setIsConnected(true);

      // Register user
      newSocket.emit('user:register', { userId: user.id });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket.io disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const joinGroup = (groupId: string) => {
    if (socket && user) {
      socket.emit('group:join', { groupId, userId: user.id });
      console.log('Joined group:', groupId);
    }
  };

  const leaveGroup = (groupId: string) => {
    if (socket && user) {
      socket.emit('group:leave', { groupId, userId: user.id });
      console.log('Left group:', groupId);
    }
  };

  const sendGroupMessage = (groupId: string, message: string) => {
    if (socket && user) {
      socket.emit('group:message', {
        groupId,
        userId: user.id,
        userName: user.email || 'Anonymous',
        message,
      });
    }
  };

  const sendTypingIndicator = (groupId: string, isTyping: boolean) => {
    if (socket && user) {
      socket.emit('group:typing', {
        groupId,
        userId: user.id,
        userName: user.email || 'Anonymous',
        isTyping,
      });
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    joinGroup,
    leaveGroup,
    sendGroupMessage,
    sendTypingIndicator,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
