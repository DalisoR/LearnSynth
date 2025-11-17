import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, FileText, BookOpen, Eye, Brain, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

export default function KBAnalytics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<any>(null);
  const [popularContent, setPopularContent] = useState<any[]>([]);
  const [embeddingsStats, setEmbeddingsStats] = useState<any>(null);

  useEffect(() => {
    if (id && user) {
      loadAnalytics();
    }
  }, [id, user]);

  const loadAnalytics = async () => {
    if (!id || !user) return;

    setLoading(true);
    try {
      const [usageRes, popularRes, embeddingsRes] = await Promise.all([
        fetch(`http://localhost:4000/api/analytics/kb/${id}/usage`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`http://localhost:4000/api/analytics/kb/${id}/popular-content`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`http://localhost:4000/api/analytics/kb/${id}/embeddings-stats`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const usageData = await usageRes.json();
      const popularData = await popularRes.json();
      const embeddingsData = await embeddingsRes.json();

      setUsage(usageData);
      setPopularContent(popularData.documents || []);
      setEmbeddingsStats(embeddingsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl font-semibold text-gray-800">Loading Analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/knowledge/${id}`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              KB Analytics
            </h1>
            <p className="text-gray-600 mt-2">Detailed insights and statistics</p>
          </div>
        </div>

        {/* Overview Stats */}
        {usage && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Lessons</p>
                    <p className="text-3xl font-bold text-indigo-600">{usage.totalLessons}</p>
                  </div>
                  <div className="p-4 bg-indigo-100 rounded-full">
                    <Brain className="w-8 h-8 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Views</p>
                    <p className="text-3xl font-bold text-purple-600">{usage.totalViews}</p>
                  </div>
                  <div className="p-4 bg-purple-100 rounded-full">
                    <Eye className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Documents</p>
                    <p className="text-3xl font-bold text-pink-600">{usage.totalDocuments}</p>
                  </div>
                  <div className="p-4 bg-pink-100 rounded-full">
                    <FileText className="w-8 h-8 text-pink-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Chapters</p>
                    <p className="text-3xl font-bold text-orange-600">{usage.totalChapters}</p>
                  </div>
                  <div className="p-4 bg-orange-100 rounded-full">
                    <BookOpen className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Embeddings Coverage */}
        {embeddingsStats && (
          <Card className="border-0 shadow-lg bg-white mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">Embedding Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-semibold">{embeddingsStats.coverage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full transition-all"
                    style={{ width: `${embeddingsStats.coverage}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total Chunks</p>
                    <p className="text-xl font-bold text-gray-800">{embeddingsStats.totalChunks}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Embeddings</p>
                    <p className="text-xl font-bold text-gray-800">{embeddingsStats.totalEmbeddings}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <Badge variant={embeddingsStats.status === 'complete' ? 'default' : 'secondary'}>
                      {embeddingsStats.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Teaching Styles Distribution */}
        {usage && Object.keys(usage.teachingStyleDistribution).length > 0 && (
          <Card className="border-0 shadow-lg bg-white mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">Teaching Style Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(usage.teachingStyleDistribution).map(([style, count]: [string, any]) => (
                  <div key={style} className="flex items-center justify-between">
                    <span className="capitalize font-medium text-gray-700">{style}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-48 bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full"
                          style={{
                            width: `${(count / usage.totalLessons) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-gray-600 w-12 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Popular Documents */}
        {popularContent.length > 0 && (
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-2xl">Most Popular Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {popularContent.slice(0, 5).map((doc, index) => (
                  <div key={doc.id} className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{doc.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {doc.totalViews} views
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {doc.chapters?.length || 0} chapters
                        </span>
                        <Badge variant="outline">{doc.file_type}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
