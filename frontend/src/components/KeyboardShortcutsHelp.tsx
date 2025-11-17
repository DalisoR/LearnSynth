import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Command } from 'lucide-react';

interface Shortcut {
  key: string;
  action: string;
  description?: string;
}

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts: Shortcut[] = [
  {
    key: '⌘ K / Ctrl K',
    action: 'Open Command Palette',
    description: 'Quick access to all features',
  },
  {
    key: '⌘ / / Ctrl /',
    action: 'Search',
    description: 'Open search bar',
  },
  {
    key: '⌘ 1',
    action: 'Go to Dashboard',
  },
  {
    key: '⌘ 2',
    action: 'Go to My Books',
  },
  {
    key: '⌘ 3',
    action: 'Go to Knowledge Base',
  },
  {
    key: '⌘ 4',
    action: 'Go to AI Chat',
  },
  {
    key: '⌘ 5',
    action: 'Go to Study Planner',
  },
  {
    key: '⌘ 6',
    action: 'Go to Groups',
  },
  {
    key: '⌘ 7',
    action: 'Go to Flashcards',
  },
  {
    key: '⌘ 8',
    action: 'Go to Analytics',
  },
  {
    key: 'Esc',
    action: 'Close Modal',
  },
  {
    key: 'Shift + ?',
    action: 'Show Shortcuts',
    description: 'This help panel',
  },
];

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Command className="w-5 h-5" />
            <CardTitle>Keyboard Shortcuts</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {/* Global Shortcuts */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                Global
              </h3>
              <div className="space-y-2">
                {shortcuts.slice(0, 3).map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{shortcut.action}</div>
                      {shortcut.description && (
                        <div className="text-xs text-gray-500">{shortcut.description}</div>
                      )}
                    </div>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Shortcuts */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                Navigation
              </h3>
              <div className="space-y-2">
                {shortcuts.slice(3, 11).map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{shortcut.action}</div>
                    </div>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            {/* Utility Shortcuts */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                Utilities
              </h3>
              <div className="space-y-2">
                {shortcuts.slice(11).map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{shortcut.action}</div>
                      {shortcut.description && (
                        <div className="text-xs text-gray-500">{shortcut.description}</div>
                      )}
                    </div>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Press Esc to close</span>
              <span>⏱️ Saves time, increases productivity</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeyboardShortcutsHelp;