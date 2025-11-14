import { useState, useEffect } from 'react';
import { Users, Plus, BarChart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { groupsAPI } from '@/services/api';
import { StudyGroup } from '@/types/api';

export default function Groups() {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const data = await groupsAPI.getAll();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    const name = prompt('Enter group name:');
    if (!name) return;

    try {
      await groupsAPI.create({ name });
      loadGroups();
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-8 h-8" />
          Study Groups
        </h1>
        <Button onClick={createGroup} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold mb-2">No Groups Yet</h2>
          <p className="text-gray-600 mb-4">
            Create a study group to collaborate with others
          </p>
          <Button onClick={createGroup}>Create Your First Group</Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                {group.is_private && (
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    Private
                  </span>
                )}
              </div>

              <h3 className="text-xl font-semibold mb-2">{group.name}</h3>

              {group.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {group.description}
                </p>
              )}

              <div className="text-sm text-gray-500 mb-4">
                <p>Created {new Date(group.created_at).toLocaleDateString()}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Group
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <BarChart className="w-4 h-4" />
                  Analytics
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
