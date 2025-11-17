import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Users, Circle } from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

interface OnlineUser {
  userId: string;
  userName: string;
}

interface GroupChatRoomProps {
  groupId: string;
  currentUserId: string;
  currentUserName: string;
}

export default function GroupChatRoom({ groupId, currentUserId, currentUserName }: GroupChatRoomProps) {
  const { socket, isConnected, joinGroup, leaveGroup, sendGroupMessage, sendTypingIndicator } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Join group on mount
  useEffect(() => {
    if (isConnected && groupId) {
      joinGroup(groupId);
    }

    return () => {
      if (groupId) {
        leaveGroup(groupId);
      }
    };
  }, [isConnected, groupId]);

  // Listen for real-time events
  useEffect(() => {
    if (!socket) return;

    // Handle incoming messages
    socket.on('group:message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    // Handle user joined
    socket.on('user:joined', (data: { userId: string; timestamp: string }) => {
      console.log('User joined:', data.userId);
    });

    // Handle user left
    socket.on('user:left', (data: { userId: string; timestamp: string }) => {
      console.log('User left:', data.userId);
    });

    // Handle online users list
    socket.on('group:online-users', (data: { users: string[] }) => {
      // In a real app, you'd fetch user details from API
      setOnlineUsers(data.users.map(userId => ({ userId, userName: userId.substring(0, 8) })));
    });

    // Handle user status changes
    socket.on('user:status', (data: { userId: string; status: 'online' | 'offline' }) => {
      if (data.status === 'online') {
        setOnlineUsers(prev => {
          if (!prev.find(u => u.userId === data.userId)) {
            return [...prev, { userId: data.userId, userName: data.userId.substring(0, 8) }];
          }
          return prev;
        });
      } else {
        setOnlineUsers(prev => prev.filter(u => u.userId !== data.userId));
      }
    });

    // Handle typing indicators
    socket.on('group:typing', (data: { userId: string; userName: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (data.isTyping) {
          newSet.add(data.userName);
        } else {
          newSet.delete(data.userName);
        }
        return newSet;
      });
    });

    return () => {
      socket.off('group:message');
      socket.off('user:joined');
      socket.off('user:left');
      socket.off('group:online-users');
      socket.off('user:status');
      socket.off('group:typing');
    };
  }, [socket]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() || !isConnected) return;

    sendGroupMessage(groupId, inputMessage);
    setInputMessage('');
    sendTypingIndicator(groupId, false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);

    // Send typing indicator
    sendTypingIndicator(groupId, true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(groupId, false);
    }, 2000);
  };

  const formatTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'HH:mm');
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with online users */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Group Chat</CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{onlineUsers.length} online</span>
              <Circle
                className={`w-2 h-2 ${isConnected ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'}`}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages container */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.userId === currentUserId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    msg.userId === currentUserId
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {msg.userId !== currentUserId && (
                    <div className="text-xs font-semibold mb-1 opacity-75">
                      {msg.userName}
                    </div>
                  )}
                  <div className="text-sm break-words">{msg.message}</div>
                  <div className={`text-xs mt-1 ${
                    msg.userId === currentUserId ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Typing indicator */}
          {typingUsers.size > 0 && (
            <div className="text-sm text-gray-500 italic">
              {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Message input */}
        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={handleInputChange}
              placeholder={isConnected ? "Type a message..." : "Connecting..."}
              disabled={!isConnected}
              className="flex-1"
              maxLength={1000}
            />
            <Button
              type="submit"
              disabled={!inputMessage.trim() || !isConnected}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
