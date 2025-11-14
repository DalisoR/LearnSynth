import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Book, Award, TrendingUp, Clock, Lock, CheckCircle, PlayCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Chapter {
  id: string;
  title: string;
  chapterNumber: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  userProgress: number;
  difficulty: string;
  estimatedReadTime: number;
}

interface Analytics {
  totalChapters: number;
  completedChapters: number;
  inProgressChapters: number;
  averageScore: number;
  totalTimeSpent: number;
  masteryDistribution: {
    novice: number;
    developing: number;
    proficient: number;
    mastered: number;
  };
}

const LearningDashboard: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (documentId && user) {
      fetchChapters();
      fetchAnalytics();
    }
  }, [documentId, user]);

  const fetchChapters = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/learning/chapters/${documentId}?userId=${user?.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      if (data.success) {
        setChapters(data.chapters);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/learning/analytics/${documentId}?userId=${user?.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleChapterClick = (chapter: Chapter) => {
    if (chapter.isUnlocked) {
      navigate(`/learning/chapter/${chapter.id}`);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Adaptive Learning Dashboard</h1>
        <p className="text-gray-600">Track your progress and continue learning</p>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.completedChapters}/{analytics.totalChapters}
              </div>
              <Progress
                value={(analytics.completedChapters / analytics.totalChapters) * 100}
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.averageScore.toFixed(0)}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Spent</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTime(analytics.totalTimeSpent)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Book className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.inProgressChapters}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chapter List */}
      <Card>
        <CardHeader>
          <CardTitle>Chapters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chapters.map((chapter) => (
              <div
                key={chapter.id}
                className={`p-4 border rounded-lg transition-all ${
                  chapter.isUnlocked
                    ? 'cursor-pointer hover:bg-gray-50'
                    : 'opacity-60 cursor-not-allowed'
                }`}
                onClick={() => handleChapterClick(chapter)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-bold">
                      {chapter.chapterNumber}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{chapter.title}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getDifficultyColor(chapter.difficulty)}>
                          {chapter.difficulty}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          <Clock className="inline w-4 h-4 mr-1" />
                          {chapter.estimatedReadTime} min
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {chapter.isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : chapter.isUnlocked ? (
                      <PlayCircle className="w-6 h-6 text-blue-600" />
                    ) : (
                      <Lock className="w-6 h-6 text-gray-400" />
                    )}

                    {chapter.userProgress > 0 && (
                      <div className="w-32">
                        <Progress value={chapter.userProgress} />
                        <div className="text-xs text-gray-600 mt-1 text-right">
                          {chapter.userProgress}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {chapter.userProgress > 0 && !chapter.isCompleted && (
                  <div className="mt-2 text-sm text-gray-600">
                    Continue where you left off...
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="mt-8 flex justify-center space-x-4">
        <Button
          onClick={() => navigate(`/learning/analytics/${documentId}`)}
          variant="outline"
        >
          View Detailed Analytics
        </Button>
        <Button
          onClick={() => navigate('/documents')}
        >
          Back to Documents
        </Button>
      </div>
    </div>
  );
};

export default LearningDashboard;