import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/Logo';
import {
  Home,
  MessageSquare,
  Calendar,
  Users,
  Settings,
  Library,
  Brain,
  LogOut,
  Menu,
  X,
  Download,
  BarChart3,
  CreditCard,
  BookOpen,
  Map,
  ChevronDown,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {}

export default function Navbar({}: NavbarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    };

    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreMenuOpen]);

  const handleSignOut = async () => {
    const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

    if (useMockAuth) {
      localStorage.removeItem('mockUser');
      window.location.href = '/signin';
      return;
    }

    await supabase.auth.signOut();
  };

  // Primary navigation items - shown directly in navbar
  const primaryNavItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/books', icon: Library, label: 'My Books' },
    { to: '/knowledge', icon: Brain, label: 'Knowledge Base' },
    { to: '/chat', icon: MessageSquare, label: 'AI Chat' },
    { to: '/study', icon: Calendar, label: 'Study Planner' },
    { to: '/groups', icon: Users, label: 'Groups' },
  ];

  // Secondary navigation items - shown in dropdown
  const secondaryNavItems = [
    { to: '/flashcards', icon: CreditCard, label: 'Flashcards' },
    { to: '/practice-problems', icon: BookOpen, label: 'Practice' },
    { to: '/mind-maps', icon: Map, label: 'Mind Maps' },
    { to: '/comprehensive-lessons', icon: Sparkles, label: 'AI Lessons' },
    { to: '/downloads', icon: Download, label: 'Downloads' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/subscription', icon: CreditCard, label: 'Subscription' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  // Close dropdown when clicking outside
  const handleMoreClick = () => {
    setMoreMenuOpen(!moreMenuOpen);
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/">
            <Logo size="md" useImage={true} />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex flex-wrap items-start gap-2 ml-12 max-w-4xl">
            {primaryNavItems.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to}>
                <Button
                  variant={location.pathname === to ? 'default' : 'ghost'}
                  size="sm"
                  className="flex items-center gap-2 h-9"
                >
                  <Icon className="w-4 h-4" />
                  <span className="whitespace-nowrap">{label}</span>
                </Button>
              </Link>
            ))}

            {/* More Dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMoreClick}
                className="flex items-center gap-2 h-9"
              >
                <MoreHorizontal className="w-4 h-4" />
                <span className="whitespace-nowrap">More</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
              </Button>

              {moreMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 py-3 z-50">
                  <div className="grid grid-cols-2 gap-2 px-3">
                    {secondaryNavItems.map(({ to, icon: Icon, label }) => (
                      <Link key={to} to={to} onClick={() => setMoreMenuOpen(false)}>
                        <Button
                          variant={location.pathname === to ? 'default' : 'ghost'}
                          size="sm"
                          className="w-full justify-start text-sm h-10"
                        >
                          <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{label}</span>
                        </Button>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center gap-2">
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

          {/* Mobile Hamburger Menu */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-10 w-10 p-0"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden
          ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Logo size="sm" showText={false} useImage={true} />
              <h2 className="text-lg font-bold text-gray-900">Menu</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(false)}
              className="h-10 w-10 p-0"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-4 border-b bg-gray-50">
              <div className="text-sm font-medium text-gray-900">{user.email}</div>
              <div className="text-xs text-gray-500 mt-1">Signed in</div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Primary Navigation */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                  Primary
                </div>
                {primaryNavItems.map(({ to, icon: Icon, label }) => (
                  <Link key={to} to={to} onClick={handleNavClick}>
                    <div
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                        ${location.pathname === to
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="text-base">{label}</span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Secondary Navigation */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                  Tools & Settings
                </div>
                <div className="space-y-1">
                  {secondaryNavItems.map(({ to, icon: Icon, label }) => (
                    <Link key={to} to={to} onClick={handleNavClick}>
                      <div
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                          ${location.pathname === to
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                          }
                        `}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-base">{label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          {user && (
            <div className="p-4 border-t">
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  handleSignOut();
                  handleNavClick();
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
