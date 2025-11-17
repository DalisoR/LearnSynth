import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  FileText,
  Trophy,
  MessageSquare,
  BarChart,
  Settings,
  UserPlus,
  Crown,
  Shield,
  User,
  Eye,
  Plus,
  Upload,
  Calendar,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import GroupChatRoom from '@/components/GroupChatRoom';
import { groupsAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { StudyGroup, GroupMember, GroupDocument, GroupQuiz, GroupDiscussion, GroupAnalytics } from '@/types/api';

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [documents, setDocuments] = useState<GroupDocument[]>([]);
  const [quizzes, setQuizzes] = useState<GroupQuiz[]>([]);
  const [discussions, setDiscussions] = useState<GroupDiscussion[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (groupId) {
      loadGroupDetails();
    }
  }, [groupId]);

  const loadGroupDetails = async () => {
    try {
      const [groupData, membersData, documentsData, quizzesData, discussionsData, analyticsData] =
        await Promise.all([
          groupsAPI.getById(groupId!),
          groupsAPI.getMembers(groupId!),
          groupsAPI.getMaterials(groupId!),
          groupsAPI.getQuizzes(groupId!),
          groupsAPI.getDiscussions(groupId!),
          groupsAPI.getAnalytics(groupId!),
        ]);

      setGroup(groupData.group);
      setMembers(membersData.members || []);
      setDocuments(documentsData.documents || []);
      setQuizzes(quizzesData.quizzes || []);
      setDiscussions(discussionsData.discussions || []);
      setAnalytics(analyticsData.analytics || {});
    } catch (error) {
      console.error('Failed to load group details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-red-600" />;
      case 'instructor':
        return <Shield className="w-4 h-4 text-purple-600" />;
      case 'member':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'observer':
        return <Eye className="w-4 h-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getRoleBadgeColor = (role: string) => {
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

  const getQuizStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading group...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-xl text-gray-600">Group not found</p>
          <Button onClick={() => navigate('/groups')} className="mt-4">
            Back to Groups
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate('/groups')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{group.name}</h1>
            <Badge className={getRoleBadgeColor(group.user_role || 'member')}>
              {group.user_role}
            </Badge>
          </div>
          {group.description && (
            <p className="text-gray-600">{group.description}</p>
          )}
        </div>
        <Button variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Group Stats Bar */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{members.length}</div>
            <div className="text-sm text-gray-600">Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{documents.length}</div>
            <div className="text-sm text-gray-600">Documents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{quizzes.length}</div>
            <div className="text-sm text-gray-600">Quizzes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{analytics?.avgQuizScore || 0}%</div>
            <div className="text-sm text-gray-600">Avg Score</div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">📋 Overview</TabsTrigger>
          <TabsTrigger value="members">👥 Members</TabsTrigger>
          <TabsTrigger value="materials">📚 Materials</TabsTrigger>
          <TabsTrigger value="quizzes">🏆 Quizzes</TabsTrigger>
          <TabsTrigger value="discussions">💬 Discussions</TabsTrigger>
          <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Welcome Card */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">📢 Welcome back!</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Upcoming</h3>
                  <div className="space-y-2">
                    {quizzes.filter(q => q.status === 'scheduled').slice(0, 2).map(quiz => (
                      <div key={quiz.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded">
                        <Trophy className="w-5 h-5 text-blue-600" />
                        <div className="flex-1">
                          <div className="font-medium">{quiz.title}</div>
                          <div className="text-sm text-gray-600">
                            {quiz.scheduled_for ? new Date(quiz.scheduled_for).toLocaleString() : 'No date set'}
                          </div>
                        </div>
                      </div>
                    ))}
                    {quizzes.filter(q => q.status === 'scheduled').length === 0 && (
                      <p className="text-gray-500 text-sm">No upcoming quizzes</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Recent Activity</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <div className="font-medium">New member joined</div>
                        <div className="text-sm text-gray-600">2 hours ago</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded">
                      <FileText className="w-5 h-5 text-purple-600" />
                      <div className="flex-1">
                        <div className="font-medium">Document uploaded</div>
                        <div className="text-sm text-gray-600">5 hours ago</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Group Progress</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Completion</span>
                      <span>68%</span>
                    </div>
                    <Progress value={68} className="h-2" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Trophy className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Take Quiz</h3>
                    <p className="text-sm text-gray-600">Test your knowledge</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Study Materials</h3>
                    <p className="text-sm text-gray-600">Access shared documents</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Group Chat</h3>
                    <p className="text-sm text-gray-600">Discuss with members</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <BarChart className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">View Analytics</h3>
                    <p className="text-sm text-gray-600">Track progress</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Members ({members.length})</h2>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Members
              </Button>
            </div>

            <div className="space-y-4">
              {/* Owner */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Owner</h3>
                {members
                  .filter(m => m.role === 'owner')
                  .map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {member.users.full_name?.charAt(0) || member.users.email.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{member.users.full_name || member.users.email}</div>
                          <div className="text-sm text-gray-600">Joined {new Date(member.joined_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <Badge className={getRoleBadgeColor(member.role)}>
                        <Crown className="w-3 h-3 mr-1" />
                        Owner
                      </Badge>
                    </div>
                  ))}
              </div>

              {/* Instructors */}
              {members.filter(m => m.role === 'instructor').length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Instructors</h3>
                  {members
                    .filter(m => m.role === 'instructor')
                    .map(member => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {member.users.full_name?.charAt(0) || member.users.email.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{member.users.full_name || member.users.email}</div>
                            <div className="text-sm text-gray-600">Joined {new Date(member.joined_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <Badge className={getRoleBadgeColor(member.role)}>
                          <Shield className="w-3 h-3 mr-1" />
                          Instructor
                        </Badge>
                      </div>
                    ))}
                </div>
              )}

              {/* Members */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Members</h3>
                <div className="space-y-2">
                  {members
                    .filter(m => m.role === 'member')
                    .map(member => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {member.users.full_name?.charAt(0) || member.users.email.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{member.users.full_name || member.users.email}</div>
                            <div className="text-sm text-gray-600">Joined {new Date(member.joined_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <Badge className={getRoleBadgeColor(member.role)}>
                          <User className="w-3 h-3 mr-1" />
                          Member
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Shared Materials</h2>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600">No documents shared yet</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {documents.map(doc => (
                  <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{doc.documents.title}</h3>
                        <p className="text-sm text-gray-600">{doc.category}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{doc.documents.file_type}</Badge>
                          {doc.is_pinned && (
                            <Badge className="bg-yellow-100 text-yellow-800">📌 Pinned</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Uploaded {new Date(doc.shared_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Quizzes Tab */}
        <TabsContent value="quizzes">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Group Quizzes</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Quiz
              </Button>
            </div>

            {quizzes.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600">No quizzes created yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {quizzes.map(quiz => (
                  <Card key={quiz.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{quiz.title}</h3>
                          <Badge className={getQuizStatusColor(quiz.status)}>
                            {quiz.status}
                          </Badge>
                        </div>
                        {quiz.description && (
                          <p className="text-sm text-gray-600 mb-2">{quiz.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {quiz.scheduled_for && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(quiz.scheduled_for).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline">Take Quiz</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Discussions Tab */}
        <TabsContent value="discussions">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Discussions</h2>
              <Button>
                <MessageSquare className="w-4 h-4 mr-2" />
                New Discussion
              </Button>
            </div>

            {discussions.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600">No discussions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {discussions.map(discussion => (
                  <Card key={discussion.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-600 font-medium">
                          {discussion.users.full_name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{discussion.users.full_name || discussion.users.email}</span>
                          <span className="text-sm text-gray-600">
                            {new Date(discussion.created_at).toLocaleDateString()}
                          </span>
                          {discussion.is_pinned && (
                            <Badge className="bg-yellow-100 text-yellow-800">📌 Pinned</Badge>
                          )}
                        </div>
                        {discussion.title && (
                          <h3 className="font-semibold mb-2">{discussion.title}</h3>
                        )}
                        <p className="text-gray-700">{discussion.content}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Group Overview</h2>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="text-center p-4 bg-blue-50 rounded">
                  <div className="text-3xl font-bold text-blue-600">{analytics?.totalMembers || 0}</div>
                  <div className="text-sm text-gray-600">Total Members</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded">
                  <div className="text-3xl font-bold text-green-600">{analytics?.activeMembers || 0}</div>
                  <div className="text-sm text-gray-600">Active Today</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded">
                  <div className="text-3xl font-bold text-purple-600">{analytics?.avgQuizScore || 0}%</div>
                  <div className="text-sm text-gray-600">Avg Quiz Score</div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {analytics?.recentActivity?.map((activity: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 p-3 border rounded">
                    <BarChart className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <div className="text-sm">{activity.date}</div>
                      <pre className="text-xs text-gray-600">{JSON.stringify(activity.metrics, null, 2)}</pre>
                    </div>
                  </div>
                ))}
                {!analytics?.recentActivity?.length && (
                  <p className="text-gray-600 text-sm">No recent activity</p>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
