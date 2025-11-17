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
    <div className="max-w-4xl mx-auto p-3 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Settings</h1>

      <div className="space-y-4 md:space-y-6">
        {/* Profile Settings */}
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-4">
            <User className="w-5 h-5" />
            <h2 className="text-lg md:text-xl font-semibold">Profile</h2>
          </div>
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <p className="text-gray-600 text-sm md:text-base">{user?.email}</p>
            </div>
            <Button onClick={handleUpdateProfile} className="w-full md:w-auto">Update Profile</Button>
          </div>
        </Card>

        {/* Theme Settings */}
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-4">
            {theme === 'light' ? (
              <Sun className="w-5 h-5" />
            ) : theme === 'dark' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
            <h2 className="text-lg md:text-xl font-semibold">Appearance</h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              onClick={() => setTheme('light')}
              className="flex-1 md:flex-none"
            >
              Light
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              onClick={() => setTheme('dark')}
              className="flex-1 md:flex-none"
            >
              Dark
            </Button>
            <Button
              variant={theme === 'system' ? 'default' : 'outline'}
              onClick={() => setTheme('system')}
              className="flex-1 md:flex-none"
            >
              System
            </Button>
          </div>
        </Card>

        {/* Account Settings */}
        <Card className="p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Account</h2>
          <div className="space-y-3 md:space-y-4">
            <Button
              variant="destructive"
              onClick={() => supabase.auth.signOut()}
              className="w-full md:w-auto"
            >
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
