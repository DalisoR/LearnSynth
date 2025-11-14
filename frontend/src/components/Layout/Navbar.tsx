import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  BookOpen,
  Home,
  MessageSquare,
  Calendar,
  Users,
  Settings,
  Library,
  Brain,
  LogOut,
} from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const { user } = useAuth();

  const handleSignOut = async () => {
    const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

    if (useMockAuth) {
      localStorage.removeItem('mockUser');
      window.location.href = '/signin';
      return;
    }

    await supabase.auth.signOut();
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/books', icon: Library, label: 'My Books' },
    { to: '/knowledge', icon: Brain, label: 'Knowledge Base' },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
    { to: '/study', icon: Calendar, label: 'Study Planner' },
    { to: '/groups', icon: Users, label: 'Groups' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">LearnSynth</h1>
        </div>
        <div className="hidden md:flex items-center gap-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to}>
              <Button
                variant={location.pathname === to ? 'default' : 'ghost'}
                size="sm"
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <>
              <span className="text-sm text-gray-600 hidden sm:inline">
                {user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
