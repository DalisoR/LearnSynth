import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Star, Award, Lock, Crown, Gem } from 'lucide-react';

interface UserBadge {
  id: string;
  badgeId: string;
  earnedAt: Date;
  progress: number;
  completed: boolean;
  badge: {
    id: string;
    name: string;
    description: string;
    icon: string;
    level: string;
    xpReward: number;
  };
}

interface UserStats {
  userId: string;
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  badgesEarned: number;
  quizzesCompleted: number;
  averageScore: number;
  totalStudyTime: number;
}

const levelIcons: Record<string, React.ReactNode> = {
  bronze: <Award className="w-4 h-4 text-amber-600" />,
  silver: <Star className="w-4 h-4 text-gray-400" />,
  gold: <Trophy className="w-4 h-4 text-yellow-500" />,
  platinum: <Crown className="w-4 h-4 text-purple-500" />,
  diamond: <Gem className="w-4 h-4 text-blue-500" />,
};

export const GamificationBadges: React.FC = () => {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGamificationData();
  }, []);

  const fetchGamificationData = async () => {
    try {
      const [statsRes, badgesRes] = await Promise.all([
        fetch('/api/gamification/stats'),
        fetch('/api/gamification/badges'),
      ]);

      const statsData = await statsRes.json();
      const badgesData = await badgesRes.json();

      setUserStats(statsData);
      setBadges(badgesData);
    } catch (error) {
      console.error('Failed to fetch gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const earnedBadges = badges.filter(b => b.completed);
  const inProgressBadges = badges.filter(b => !b.completed && b.progress > 0);

  const getProgressPercentage = (badge: UserBadge) => {
    const requirement = badge.badge.xpReward / 10; // Simplified calculation
    return Math.min(100, (badge.progress / requirement) * 100);
  };

  return (
    <div className="space-y-6">
      {userStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Your Progress</span>
              <Badge variant="outline" className="text-lg px-3 py-1">
                Level {userStats.level}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total XP</span>
              <span className="text-2xl font-bold">{userStats.totalXP.toLocaleString()}</span>
            </div>
            <Progress value={(userStats.totalXP % 1000) / 10} className="h-2" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {userStats.currentStreak}
                </div>
                <div className="text-xs text-muted-foreground">Day Streak</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {earnedBadges.length}
                </div>
                <div className="text-xs text-muted-foreground">Badges Earned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {userStats.quizzesCompleted}
                </div>
                <div className="text-xs text-muted-foreground">Quizzes Done</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.floor(userStats.totalStudyTime / 60)}h
                </div>
                <div className="text-xs text-muted-foreground">Study Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="earned" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="earned">
            Earned Badges ({earnedBadges.length})
          </TabsTrigger>
          <TabsTrigger value="progress">
            In Progress ({inProgressBadges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earned" className="space-y-4">
          {earnedBadges.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No badges earned yet. Complete quizzes to earn your first badge!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {earnedBadges.map((userBadge) => (
                <Card
                  key={userBadge.id}
                  className="relative overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-5xl mb-3">{userBadge.badge.icon}</div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h3 className="font-bold">{userBadge.badge.name}</h3>
                      {levelIcons[userBadge.badge.level]}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {userBadge.badge.description}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Badge variant="secondary">
                        +{userBadge.badge.xpReward} XP
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {userBadge.badge.level}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Earned {new Date(userBadge.earnedAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          {inProgressBadges.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No badges in progress. Keep studying to unlock more!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressBadges.map((userBadge) => (
                <Card key={userBadge.id} className="relative">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-3xl opacity-50">{userBadge.badge.icon}</div>
                      {levelIcons[userBadge.badge.level]}
                    </div>
                    <h3 className="font-bold mb-1">{userBadge.badge.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {userBadge.badge.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {userBadge.progress} / {userBadge.badge.xpReward / 10}
                        </span>
                      </div>
                      <Progress value={getProgressPercentage(userBadge)} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GamificationBadges;
