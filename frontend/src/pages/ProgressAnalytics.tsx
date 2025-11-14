import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { BarChart3, TrendingUp, Clock, Award, Target, BookOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
  recentActivity: Array<{
    id: string;
    chapterId: string;
    score: number;
    passed: boolean;
    timeSpent: number;
    completedAt: Date;
  }>;
  recommendations: string[];
}

interface WeakArea {
  chapterId: string;
  title: string;
  score: number;
  issues: string[];
}

interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
}

const ProgressAnalytics: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (documentId && user) {
      fetchAnalytics();
      fetchWeakAreas();
      fetchStreak();
    }
  }, [documentId, user]);

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
    } finally {
      setLoading(false);
    }
  };

  const fetchWeakAreas = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/learning/weak-areas?userId=${user?.id}&documentId=${documentId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      if (data.success) {
        setWeakAreas(data.weakAreas.chapters);
      }
    } catch (error) {
      console.error('Error fetching weak areas:', error);
    }
  };

  const fetchStreak = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/learning/streak?userId=${user?.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      if (data.success) {
        setStreak(data.streak);
      }
    } catch (error) {
      console.error('Error fetching streak:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Learning Analytics</h1>
        <p className="text-gray-600">Track your progress and identify areas for improvement</p>
      </div>

      {/* Streak Card */}
      {streak && (
        <Card className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Award className="w-6 h-6 mr-2" />
              Learning Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold">{streak.currentStreak}</div>
                <div className="text-sm opacity-90">Current Streak</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{streak.longestStreak}</div>
                <div className="text-sm opacity-90">Best Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((analytics.completedChapters / analytics.totalChapters) * 100).toFixed(0)}%
              </div>
              <Progress
                value={(analytics.completedChapters / analytics.totalChapters) * 100}
                className="mt-2"
              />
              <div className="text-xs text-muted-foreground mt-2">
                {analytics.completedChapters} of {analytics.totalChapters} chapters
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(analytics.averageScore)}`}>
                {analytics.averageScore.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Across all quizzes
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Invested</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTime(analytics.totalTimeSpent)}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Total learning time
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.inProgressChapters}</div>
              <div className="text-xs text-muted-foreground mt-2">
                Chapters to complete
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mastery Distribution */}
      {analytics && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Mastery Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Mastered</span>
                  <span className="text-sm text-gray-600">
                    {analytics.masteryDistribution.mastered} chapters
                  </span>
                </div>
                <Progress value={(analytics.masteryDistribution.mastered / analytics.totalChapters) * 100} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Proficient</span>
                  <span className="text-sm text-gray-600">
                    {analytics.masteryDistribution.proficient} chapters
                  </span>
                </div>
                <Progress value={(analytics.masteryDistribution.proficient / analytics.totalChapters) * 100} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Developing</span>
                  <span className="text-sm text-gray-600">
                    {analytics.masteryDistribution.developing} chapters
                  </span>
                </div>
                <Progress value={(analytics.masteryDistribution.developing / analytics.totalChapters) * 100} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Novice</span>
                  <span className="text-sm text-gray-600">
                    {analytics.masteryDistribution.novice} chapters
                  </span>
                </div>
                <Progress value={(analytics.masteryDistribution.novice / analytics.totalChapters) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {analytics && analytics.recentActivity.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Recent Quiz Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Quiz Attempt</div>
                    <div className="text-sm text-gray-600">
                      {formatDate(activity.completedAt)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className={`font-bold ${getScoreColor(activity.score)}`}>
                      {activity.score.toFixed(0)}%
                    </div>
                    <Badge variant={activity.passed ? 'default' : 'destructive'}>
                      {activity.passed ? 'Passed' : 'Failed'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analytics && analytics.recommendations.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-blue-600" />
              Personalized Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analytics.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Weak Areas */}
      {weakAreas.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weakAreas.map((area) => (
                <div key={area.chapterId} className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{area.title}</h4>
                    <Badge className="bg-red-100 text-red-800">
                      {area.score.toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {area.issues.map((issue, index) => (
                      <div key={index} className="text-sm text-red-700">
                        • {issue}
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => navigate(`/learning/chapter/${area.chapterId}`)}
                  >
                    Review Chapter
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-center space-x-4">
        <Button
          variant="outline"
          onClick={() => navigate(`/learning/dashboard/${documentId}`)}
        >
          Back to Dashboard
        </Button>
        <Button onClick={() => window.location.reload()}>
          Refresh Analytics
        </Button>
      </div>
    </div>
  );
};

export default ProgressAnalytics;