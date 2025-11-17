import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();

  const shortcuts: Shortcut[] = [
    {
      key: 'k',
      ctrlKey: true,
      action: () => {
        const event = new CustomEvent('openCommandPalette');
        window.dispatchEvent(event);
      },
      description: 'Open command palette',
    },
    {
      key: '/',
      ctrlKey: true,
      action: () => {
        const event = new CustomEvent('openCommandPalette');
        window.dispatchEvent(event);
      },
      description: 'Search',
    },
    {
      key: 'g',
      ctrlKey: true,
      action: () => {
        // Will show navigation hints
        const event = new CustomEvent('openCommandPalette', { detail: { section: 'navigation' } });
        window.dispatchEvent(event);
      },
      description: 'Go to page',
    },
    {
      key: '1',
      ctrlKey: true,
      action: () => navigate('/'),
      description: 'Go to Dashboard',
    },
    {
      key: '2',
      ctrlKey: true,
      action: () => navigate('/books'),
      description: 'Go to My Books',
    },
    {
      key: '3',
      ctrlKey: true,
      action: () => navigate('/knowledge'),
      description: 'Go to Knowledge Base',
    },
    {
      key: '4',
      ctrlKey: true,
      action: () => navigate('/chat'),
      description: 'Go to AI Chat',
    },
    {
      key: '5',
      ctrlKey: true,
      action: () => navigate('/study'),
      description: 'Go to Study Planner',
    },
    {
      key: '6',
      ctrlKey: true,
      action: () => navigate('/groups'),
      description: 'Go to Groups',
    },
    {
      key: '7',
      ctrlKey: true,
      action: () => navigate('/flashcards'),
      description: 'Go to Flashcards',
    },
    {
      key: '8',
      ctrlKey: true,
      action: () => navigate('/analytics'),
      description: 'Go to Analytics',
    },
    {
      key: 'Escape',
      action: () => {
        const event = new CustomEvent('closeCommandPalette');
        window.dispatchEvent(event);
      },
      description: 'Close modal/command palette',
    },
  ];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          !!event.ctrlKey === !!shortcut.ctrlKey &&
          !!event.shiftKey === !!shortcut.shiftKey &&
          !!event.altKey === !!shortcut.altKey &&
          !!event.metaKey === !!shortcut.metaKey
        ) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return { shortcuts };
};

// Helper hook for showing keyboard shortcuts help
export const useKeyboardShortcutsHelp = () => {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '?' && event.shiftKey) {
        event.preventDefault();
        setShowHelp((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { showHelp, setShowHelp };
};