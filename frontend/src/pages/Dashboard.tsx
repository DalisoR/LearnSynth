import { useState, useEffect } from 'react';
import { BookOpen, MessageSquare, Calendar, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { documentsAPI, srsAPI, subjectsAPI } from '@/services/api';

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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your learning.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        {statCards.map((stat, idx) => (
          <Card key={idx} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Books</h2>
            <Link to="/books">
              <Button variant="ghost" size="sm">View All</Button>
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

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Quick Actions</h2>
            <MessageSquare className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <Link to="/books" className="block">
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="w-4 h-4 mr-2" />
                Upload New Book
              </Button>
            </Link>
            <Link to="/knowledge" className="block">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="w-4 h-4 mr-2" />
                Create Knowledge Base
              </Button>
            </Link>
            <Link to="/chat" className="block">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="w-4 h-4 mr-2" />
                Ask AI Tutor
              </Button>
            </Link>
            {stats.dueReviews > 0 && (
              <Link to="/study" className="block">
                <Button className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  Review ({stats.dueReviews} due)
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
