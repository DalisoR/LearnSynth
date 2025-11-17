import { useState, useEffect } from 'react';
import { BookOpen, MessageSquare, Calendar, TrendingUp, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { documentsAPI, srsAPI, subjectsAPI } from '@/services/api';
import { DashboardSkeleton } from '@/components/SkeletonLoader';

export default function Dashboard() {
  const [stats, setStats] = useState({
    documents: 0,
    subjects: 0,
    dueReviews: 0,
  });
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [docsData, srsData, subjectsData] = await Promise.all([
        documentsAPI.getAll(),
        srsAPI.getDue(),
        subjectsAPI.getAll(),
      ]);

      setStats({
        documents: docsData.documents?.length || 0,
        subjects: subjectsData.subjects?.length || 0,
        dueReviews: srsData.items?.length || 0,
      });

      setRecentDocuments(docsData.documents?.slice(0, 3) || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Books',
      value: stats.documents,
      icon: BookOpen,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Knowledge Bases',
      value: stats.subjects,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      title: 'Due for Review',
      value: stats.dueReviews,
      icon: Calendar,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-3 md:p-6">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-6">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600 text-sm md:text-base">Welcome back! Here's what's happening with your learning.</p>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3 mb-6 md:mb-8">
        {statCards.map((stat, idx) => (
          <Card key={idx} className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl md:text-3xl font-bold">{stat.value}</p>
              </div>
              <div className={`p-2 md:p-3 rounded-full ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Mobile: Stack cards vertically */}
      <div className="space-y-4 md:space-y-6 md:grid md:grid-cols-2 md:gap-6">
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-semibold">Recent Books</h2>
            <Link to="/books">
              <Button variant="ghost" size="sm" className="text-xs md:text-sm">View All</Button>
            </Link>
          </div>
          {recentDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No books uploaded yet</p>
              <Link to="/books">
                <Button className="mt-4">Upload Your First Book</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-sm text-gray-500">{doc.file_type.toUpperCase()}</p>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 md:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <span>Quick Actions</span>
            </h2>
          </div>
          <div className="space-y-3">
            <Link to="/books" className="block">
              <Button className="w-full justify-start h-12 text-sm md:text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <BookOpen className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">My Books</div>
                  <div className="text-xs opacity-90">Upload & manage textbooks</div>
                </div>
              </Button>
            </Link>
            <Link to="/knowledge" className="block">
              <Button variant="outline" className="w-full justify-start h-12 text-sm md:text-base border-blue-200 hover:bg-blue-50">
                <TrendingUp className="w-5 h-5 mr-3 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">Knowledge Base</div>
                  <div className="text-xs text-gray-600">Create study subjects</div>
                </div>
              </Button>
            </Link>
            <Link to="/chat" className="block">
              <Button variant="outline" className="w-full justify-start h-12 text-sm md:text-base border-blue-200 hover:bg-blue-50">
                <MessageSquare className="w-5 h-5 mr-3 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">AI Chat</div>
                  <div className="text-xs text-gray-600">Ask questions anytime</div>
                </div>
              </Button>
            </Link>
            <Link to="/study" className="block">
              <Button variant="outline" className="w-full justify-start h-12 text-sm md:text-base border-blue-200 hover:bg-blue-50">
                <Calendar className="w-5 h-5 mr-3 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">Study Planner</div>
                  <div className="text-xs text-gray-600">Plan your learning</div>
                </div>
              </Button>
            </Link>
            <Link to="/groups" className="block">
              <Button variant="outline" className="w-full justify-start h-12 text-sm md:text-base border-blue-200 hover:bg-blue-50">
                <Users className="w-5 h-5 mr-3 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">Study Groups</div>
                  <div className="text-xs text-gray-600">Collaborate with others</div>
                </div>
              </Button>
            </Link>
            {stats.dueReviews > 0 && (
              <Link to="/study" className="block">
                <Button className="w-full justify-start h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  <Calendar className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Review Due</div>
                    <div className="text-xs opacity-90">{stats.dueReviews} items to review</div>
                  </div>
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
