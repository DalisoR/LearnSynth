import { supabase } from '../supabase';

export enum BadgeType {
  FIRST_QUIZ = 'first_quiz',
  PERFECT_SCORE = 'perfect_score',
  SPEEDSTER = 'speedster',
  MARATHONER = 'marathoner',
  SCHOLAR = 'scholar',
  CONSISTENT_LEARNER = 'consistent_learner',
  KNOWLEDGE_SEEKER = 'knowledge_seeker',
  QUIZ_MASTER = 'quiz_master',
  STREAK_CHAMPION = 'streak_champion',
  DOCUMENT_COLLECTOR = 'document_collector',
  EARLY_BIRD = 'early_bird',
  NIGHT_OWL = 'night_owl',
  WEEKEND_WARRIOR = 'weekend_warrior',
  TOP_PERFORMER = 'top_performer',
  DEDICATED_STUDENT = 'dedicated_student',
}

export enum AchievementLevel {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
}

export interface Badge {
  id: string;
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  level: AchievementLevel;
  requirement: number;
  xpReward: number;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Date;
  progress: number;
  completed: boolean;
}

export interface UserStats {
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

export class GamificationService {
  private badges: Badge[] = [
    {
      id: 'first_quiz',
      type: BadgeType.FIRST_QUIZ,
      name: 'First Steps',
      description: 'Complete your first quiz',
      icon: '🎯',
      level: AchievementLevel.BRONZE,
      requirement: 1,
      xpReward: 50,
    },
    {
      id: 'perfect_score',
      type: BadgeType.PERFECT_SCORE,
      name: 'Perfect Score',
      description: 'Score 100% on a quiz',
      icon: '💯',
      level: AchievementLevel.GOLD,
      requirement: 1,
      xpReward: 200,
    },
    {
      id: 'speedster',
      type: BadgeType.SPEEDSTER,
      name: 'Speedster',
      description: 'Complete a quiz in under 2 minutes',
      icon: '⚡',
      level: AchievementLevel.SILVER,
      requirement: 1,
      xpReward: 150,
    },
    {
      id: 'marathoner',
      type: BadgeType.MARATHONER,
      name: 'Marathoner',
      description: 'Study for 5 hours in a single session',
      icon: '🏃',
      level: AchievementLevel.PLATINUM,
      requirement: 1,
      xpReward: 500,
    },
    {
      id: 'scholar',
      type: BadgeType.SCHOLAR,
      name: 'Scholar',
      description: 'Maintain an average score of 90% or higher',
      icon: '🎓',
      level: AchievementLevel.GOLD,
      requirement: 90,
      xpReward: 300,
    },
    {
      id: 'consistent_learner',
      type: BadgeType.CONSISTENT_LEARNER,
      name: 'Consistent Learner',
      description: 'Study for 7 days in a row',
      icon: '📚',
      level: AchievementLevel.GOLD,
      requirement: 7,
      xpReward: 400,
    },
    {
      id: 'knowledge_seeker',
      type: BadgeType.KNOWLEDGE_SEEKER,
      name: 'Knowledge Seeker',
      description: 'Complete 50 quizzes',
      icon: '🤔',
      level: AchievementLevel.PLATINUM,
      requirement: 50,
      xpReward: 600,
    },
    {
      id: 'quiz_master',
      type: BadgeType.QUIZ_MASTER,
      name: 'Quiz Master',
      description: 'Complete 100 quizzes',
      icon: '🧠',
      level: AchievementLevel.DIAMOND,
      requirement: 100,
      xpReward: 1000,
    },
    {
      id: 'streak_champion',
      type: BadgeType.STREAK_CHAMPION,
      name: 'Streak Champion',
      description: 'Maintain a 30-day study streak',
      icon: '🔥',
      level: AchievementLevel.DIAMOND,
      requirement: 30,
      xpReward: 1500,
    },
    {
      id: 'document_collector',
      type: BadgeType.DOCUMENT_COLLECTOR,
      name: 'Document Collector',
      description: 'Upload 10 documents',
      icon: '📄',
      level: AchievementLevel.SILVER,
      requirement: 10,
      xpReward: 250,
    },
  ];

  async checkAndAwardBadges(userId: string): Promise<UserBadge[]> {
    const earnedBadges: UserBadge[] = [];
    const userStats = await this.getUserStats(userId);
    const existingBadges = await this.getUserBadges(userId);

    for (const badge of this.badges) {
      // Skip if already earned
      if (existingBadges.some(ub => ub.badgeId === badge.id && ub.completed)) {
        continue;
      }

      const progress = await this.calculateBadgeProgress(userId, badge, userStats);
      const completed = progress >= badge.requirement;

      if (completed) {
        // Award the badge
        const { data: newBadge, error } = await supabase
          .from('user_badges')
          .insert({
            user_id: userId,
            badge_id: badge.id,
            earned_at: new Date().toISOString(),
            progress: badge.requirement,
            completed: true,
          })
          .select()
          .single();

        if (!error && newBadge) {
          earnedBadges.push({
            id: newBadge.id,
            userId: newBadge.user_id,
            badgeId: newBadge.badge_id,
            earnedAt: new Date(newBadge.earned_at),
            progress: newBadge.progress,
            completed: newBadge.completed,
          });

          // Award XP
          await this.awardXP(userId, badge.xpReward);
        }
      } else {
        // Update progress
        await this.updateBadgeProgress(userId, badge.id, progress);
      }
    }

    return earnedBadges;
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const { data: quizzes } = await supabase
      .from('quiz_results')
      .select('score, completed_at, duration')
      .eq('user_id', userId);

    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('started_at, duration')
      .eq('user_id', userId);

    const { data: documents } = await supabase
      .from('documents')
      .select('id, created_at')
      .eq('user_id', userId);

    const totalStudyTime = sessions?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0;
    const averageScore = quizzes && quizzes.length > 0
      ? quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length
      : 0;

    const currentStreak = await this.calculateCurrentStreak(userId);
    const longestStreak = await this.getLongestStreak(userId);

    const { data: userBadges } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('completed', true);

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('total_xp, level')
      .eq('user_id', userId)
      .single();

    return {
      userId,
      totalXP: userProfile?.total_xp || 0,
      level: userProfile?.level || 1,
      currentStreak,
      longestStreak,
      badgesEarned: userBadges?.length || 0,
      quizzesCompleted: quizzes?.length || 0,
      averageScore,
      totalStudyTime,
    };
  }

  async awardXP(userId: string, xp: number): Promise<void> {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('total_xp, level')
      .eq('user_id', userId)
      .single();

    const currentXP = profile?.total_xp || 0;
    const currentLevel = profile?.level || 1;
    const newXP = currentXP + xp;
    const newLevel = this.calculateLevel(newXP);

    await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        total_xp: newXP,
        level: newLevel,
        updated_at: new Date().toISOString(),
      });
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    const { data } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId);

    return data?.map(item => ({
      id: item.id,
      userId: item.user_id,
      badgeId: item.badge_id,
      earnedAt: new Date(item.earned_at),
      progress: item.progress,
      completed: item.completed,
    })) || [];
  }

  async getLeaderboard(limit: number = 10): Promise<Array<UserStats & { rank: number }>> {
    const { data } = await supabase
      .from('user_profiles')
      .select('user_id, total_xp, level')
      .order('total_xp', { ascending: false })
      .limit(limit);

    const leaderboard = await Promise.all(
      (data || []).map(async (profile, index) => {
        const stats = await this.getUserStats(profile.user_id);
        return {
          ...stats,
          rank: index + 1,
        };
      })
    );

    return leaderboard;
  }

  private calculateLevel(xp: number): number {
    return Math.floor(xp / 1000) + 1;
  }

  private async calculateBadgeProgress(
    userId: string,
    badge: Badge,
    stats: UserStats
  ): Promise<number> {
    switch (badge.type) {
      case BadgeType.FIRST_QUIZ:
        return stats.quizzesCompleted > 0 ? 1 : 0;
      case BadgeType.PERFECT_SCORE:
        const { data: perfectQuizzes } = await supabase
          .from('quiz_results')
          .select('id')
          .eq('user_id', userId)
          .eq('score', 100);
        return perfectQuizzes?.length || 0;
      case BadgeType.SPEEDSTER:
        const { data: quickQuizzes } = await supabase
          .from('quiz_results')
          .select('id')
          .eq('user_id', userId)
          .lte('duration', 120);
        return quickQuizzes?.length || 0;
      case BadgeType.MARATHONER:
        return stats.totalStudyTime >= 300 ? 1 : 0;
      case BadgeType.SCHOLAR:
        return Math.min(stats.averageScore, 100);
      case BadgeType.CONSISTENT_LEARNER:
        return stats.currentStreak;
      case BadgeType.KNOWLEDGE_SEEKER:
        return stats.quizzesCompleted;
      case BadgeType.QUIZ_MASTER:
        return stats.quizzesCompleted;
      case BadgeType.STREAK_CHAMPION:
        return stats.longestStreak;
      case BadgeType.DOCUMENT_COLLECTOR:
        return stats.quizzesCompleted;
      default:
        return 0;
    }
  }

  private async updateBadgeProgress(userId: string, badgeId: string, progress: number): Promise<void> {
    await supabase
      .from('user_badges')
      .upsert({
        user_id: userId,
        badge_id: badgeId,
        progress,
        completed: false,
        updated_at: new Date().toISOString(),
      });
  }

  private async calculateCurrentStreak(userId: string): Promise<number> {
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('started_at')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (!sessions || sessions.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const session of sessions) {
      const sessionDate = new Date(session.started_at);
      sessionDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === streak) {
        streak++;
        currentDate = sessionDate;
      } else {
        break;
      }
    }

    return streak;
  }

  private async getLongestStreak(userId: string): Promise<number> {
    // This would require more complex logic to calculate the longest streak
    // For now, return the current streak
    return this.calculateCurrentStreak(userId);
  }
}

export const gamificationService = new GamificationService();
