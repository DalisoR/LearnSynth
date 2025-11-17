import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  BarChart,
  Settings,
  UserPlus,
  FileText,
  MessageSquare,
  Calendar,
  Trophy,
  Lock,
  Globe,
  Shield,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { groupsAPI } from '@/services/api';
import { StudyGroup } from '@/types/api';

export default function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    type: 'study' as 'study' | 'class' | 'private' | 'community',
    privacy: 'private' as 'public' | 'private' | 'hidden',
  });

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

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) return;

    try {
      await groupsAPI.create(newGroup);
      setShowCreateDialog(false);
      setNewGroup({
        name: '',
        description: '',
        type: 'study',
        privacy: 'private',
      });
      loadGroups();
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleJoinGroup = async (groupId: string, privacy: string) => {
    try {
      if (privacy === 'public') {
        await groupsAPI.join(groupId);
      } else {
        await groupsAPI.requestToJoin(groupId);
      }
      loadGroups();
    } catch (error) {
      console.error('Failed to join group:', error);
    }
  };

  const getGroupTypeIcon = (type: string) => {
    switch (type) {
      case 'study':
        return '📚';
      case 'class':
        return '🎓';
      case 'private':
        return '🔒';
      case 'community':
        return '🌐';
      default:
        return '👥';
    }
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'public':
        return <Globe className="w-4 h-4" />;
      case 'private':
        return <Lock className="w-4 h-4" />;
      case 'hidden':
        return <Shield className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'bg-red-100 text-red-800';
      case 'instructor':
        return 'bg-purple-100 text-purple-800';
      case 'member':
        return 'bg-blue-100 text-blue-800';
      case 'observer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 md:w-8 md:h-8" />
            <span>Study Groups</span>
          </h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            Collaborate with others and learn together
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 w-full md:w-auto">
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Create Group</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-4 md:p-6">
            <DialogHeader>
              <DialogTitle>Create a New Study Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Biology 101 Study Group"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What will this group focus on?"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Group Type</Label>
                <Select
                  value={newGroup.type}
                  onValueChange={(value: any) => setNewGroup({ ...newGroup, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="study">📚 Study Group</SelectItem>
                    <SelectItem value="class">🎓 Instructor-Led Class</SelectItem>
                    <SelectItem value="private">🔒 Private Study Circle</SelectItem>
                    <SelectItem value="community">🌐 Public Community</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="privacy">Privacy</Label>
                <Select
                  value={newGroup.privacy}
                  onValueChange={(value: any) => setNewGroup({ ...newGroup, privacy: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select privacy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Public - Anyone can join
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Private - Request to join
                      </div>
                    </SelectItem>
                    <SelectItem value="hidden">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Hidden - Invite only
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGroup}>
                  Create Group
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold mb-2">No Groups Yet</h2>
          <p className="text-gray-600 mb-4">
            Create a study group to collaborate with others and learn together
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            Create Your First Group
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card
              key={group.id}
              className="p-4 md:p-6 hover:shadow-lg transition-all duration-200 cursor-pointer touch-manipulation"
              onClick={() => navigate(`/groups/${group.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="text-2xl">{getGroupTypeIcon(group.type)}</div>
                  <div className="flex items-center gap-1 text-gray-600">
                    {getPrivacyIcon(group.privacy)}
                    <span className="text-xs capitalize">{group.privacy}</span>
                  </div>
                </div>
                {group.user_role && (
                  <Badge className={getRoleBadgeColor(group.user_role)}>
                    {group.user_role}
                  </Badge>
                )}
              </div>

              <h3 className="text-xl font-semibold mb-2">{group.name}</h3>

              {group.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {group.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>Members</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(group.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/groups/${group.id}`);
                  }}
                >
                  View Group
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/groups/${group.id}/analytics`);
                  }}
                >
                  <BarChart className="w-4 h-4" />
                  Analytics
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {groups.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Invite Members</h3>
                  <p className="text-sm text-gray-600">Grow your groups</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Share Materials</h3>
                  <p className="text-sm text-gray-600">Upload documents</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Trophy className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Create Quiz</h3>
                  <p className="text-sm text-gray-600">Test knowledge</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-full">
                  <MessageSquare className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Start Discussion</h3>
                  <p className="text-sm text-gray-600">Collaborate</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
