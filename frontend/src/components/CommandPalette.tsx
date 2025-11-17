import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Command,
  Home,
  BookOpen,
  Brain,
  MessageSquare,
  Calendar,
  Users,
  CreditCard,
  BarChart3,
  FileText,
  Map,
  Settings,
  Download,
  X,
  Sparkles,
} from 'lucide-react';

interface Command {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'navigation' | 'actions' | 'resources';
  shortcut?: string;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'View your learning overview',
      icon: <Home className="w-5 h-5" />,
      action: () => navigate('/'),
      category: 'navigation',
      shortcut: '⌘1',
    },
    {
      id: 'books',
      title: 'My Books',
      description: 'Manage your documents',
      icon: <BookOpen className="w-5 h-5" />,
      action: () => navigate('/books'),
      category: 'navigation',
      shortcut: '⌘2',
    },
    {
      id: 'knowledge',
      title: 'Knowledge Base',
      description: 'Organize learning subjects',
      icon: <Brain className="w-5 h-5" />,
      action: () => navigate('/knowledge'),
      category: 'navigation',
      shortcut: '⌘3',
    },
    {
      id: 'chat',
      title: 'AI Chat',
      description: 'Chat with your AI tutor',
      icon: <MessageSquare className="w-5 h-5" />,
      action: () => navigate('/chat'),
      category: 'navigation',
      shortcut: '⌘4',
    },
    {
      id: 'study',
      title: 'Study Planner',
      description: 'Plan your study sessions',
      icon: <Calendar className="w-5 h-5" />,
      action: () => navigate('/study'),
      category: 'navigation',
      shortcut: '⌘5',
    },
    {
      id: 'groups',
      title: 'Study Groups',
      description: 'Collaborate with others',
      icon: <Users className="w-5 h-5" />,
      action: () => navigate('/groups'),
      category: 'navigation',
      shortcut: '⌘6',
    },
    {
      id: 'flashcards',
      title: 'Flashcards',
      description: 'Spaced repetition learning',
      icon: <CreditCard className="w-5 h-5" />,
      action: () => navigate('/flashcards'),
      category: 'navigation',
      shortcut: '⌘7',
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'View your progress',
      icon: <BarChart3 className="w-5 h-5" />,
      action: () => navigate('/analytics'),
      category: 'navigation',
      shortcut: '⌘8',
    },
    {
      id: 'practice',
      title: 'Practice Problems',
      description: 'Generate AI problems',
      icon: <FileText className="w-5 h-5" />,
      action: () => navigate('/practice-problems'),
      category: 'resources',
    },
    {
      id: 'mindmaps',
      title: 'Mind Maps',
      description: 'Create visual maps',
      icon: <Map className="w-5 h-5" />,
      action: () => navigate('/mind-maps'),
      category: 'resources',
    },
    {
      id: 'lessons',
      title: 'AI Lessons',
      description: 'Comprehensive lessons',
      icon: <Sparkles className="w-5 h-5" />,
      action: () => navigate('/comprehensive-lessons'),
      category: 'resources',
    },
    {
      id: 'subscription',
      title: 'Subscription',
      description: 'Manage billing',
      icon: <CreditCard className="w-5 h-5" />,
      action: () => navigate('/subscription'),
      category: 'actions',
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'App preferences',
      icon: <Settings className="w-5 h-5" />,
      action: () => navigate('/settings'),
      category: 'actions',
    },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleClose = () => {
      setIsOpen(false);
      setSearch('');
    };

    window.addEventListener('openCommandPalette', handleOpen);
    window.addEventListener('closeCommandPalette', handleClose);

    return () => {
      window.removeEventListener('openCommandPalette', handleOpen);
      window.removeEventListener('closeCommandPalette', handleClose);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (command: Command) => {
    command.action();
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 outline-none text-lg"
          />
          <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
            <Command className="w-3 h-3" />
            K
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {Object.entries(groupedCommands).map(([category, cmds]) => (
            <div key={category}>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                {category}
              </div>
              {cmds.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="text-gray-600">{cmd.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium">{cmd.title}</div>
                    {cmd.description && (
                      <div className="text-sm text-gray-500">{cmd.description}</div>
                    )}
                  </div>
                  {cmd.shortcut && (
                    <div className="text-xs text-gray-400">{cmd.shortcut}</div>
                  )}
                </button>
              ))}
            </div>
          ))}

          {filteredCommands.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">
              No results found for "{search}"
            </div>
          )}
        </div>

        <div className="border-t p-3 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Press</span>
            <kbd className="px-2 py-1 bg-white border rounded text-xs">/</kbd>
            <span>to search</span>
          </div>
        </div>
      </div>
    </div>
  );
}