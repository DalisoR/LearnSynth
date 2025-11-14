import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User, Moon, Sun, Monitor } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [theme, setTheme] = useState('light');

  const handleUpdateProfile = async () => {
    // This would update the user's profile
    alert('Profile update functionality would go here');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Profile Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Profile</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <p className="text-gray-600">{user?.email}</p>
            </div>
            <Button onClick={handleUpdateProfile}>Update Profile</Button>
          </div>
        </Card>

        {/* Theme Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            {theme === 'light' ? (
              <Sun className="w-5 h-5" />
            ) : theme === 'dark' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
            <h2 className="text-xl font-semibold">Appearance</h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              onClick={() => setTheme('light')}
            >
              Light
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              onClick={() => setTheme('dark')}
            >
              Dark
            </Button>
            <Button
              variant={theme === 'system' ? 'default' : 'outline'}
              onClick={() => setTheme('system')}
            >
              System
            </Button>
          </div>
        </Card>

        {/* Account Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Account</h2>
          <div className="space-y-4">
            <Button
              variant="destructive"
              onClick={() => supabase.auth.signOut()}
            >
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
