/**
 * Gamification Service
 * Manages badges, achievements, streaks, points, and leaderboards
 */

import { supabase } from '../supabase';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'learning' | 'streak' | 'mastery' | 'social' | 'milestone';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirement: {
    type: string;
    value: number;
    description: string;
  };
  points: number;
}

export interface Achievement {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Date;
  progress: number; // 0-100
  notified: boolean;
}

export interface LearningStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: Date;
  streakHistory: Array<{ date: string; active: boolean }>;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalPoints: number;
  rank: number;
  badges: number;
  streak: number;
}

export class GamificationService {
  private badges: Badge[] = [
    // Learning Streaks
    {
      id: 'streak-1',
      name: 'Getting Started',
      description: 'Study for 3 consecutive days',
      icon: '🔥',
      category: 'streak',
      rarity: 'common',
      requirement: { type: 'streak_days', value: 3, description: '3 days in a row' },
      points: 50
    },
    {
      id: 'streak-7',
      name: 'Week Warrior',
      description: 'Study for 7 consecutive days',
      icon: '⚡',
      category: 'streak',
      rarity: 'rare',
      requirement: { type: 'streak_days', value: 7, description: '7 days in a row' },
      points: 200
    },
    {
      id: 'streak-30',
      name: 'Month Master',
      description: 'Study for 30 consecutive days',
      icon: '💎',
      category: 'streak',
      rarity: 'legendary',
      requirement: { type: 'streak_days', value: 30, description: '30 days in a row' },
      points: 1000
    },

    // Learning Milestones
    {
      id: 'chapters-1',
      name: 'First Steps',
      description: 'Complete your first chapter',
      icon: '🎓',
      category: 'milestone',
      rarity: 'common',
      requirement: { type: 'chapters_completed', value: 1, description: 'Complete 1 chapter' },
      points: 100
    },
    {
      id: 'chapters-10',
      name: 'Dedicated Learner',
      description: 'Complete 10 chapters',
      icon: '📚',
      category: 'milestone',
      rarity: 'rare',
      requirement: { type: 'chapters_completed', value: 10, description: 'Complete 10 chapters' },
      points: 500
    },
    {
      id: 'chapters-50',
      name: 'Knowledge Seeker',
      description: 'Complete 50 chapters',
      icon: '🏆',
      category: 'milestone',
      rarity: 'epic',
      requirement: { type: 'chapters_completed', value: 50, description: 'Complete 50 chapters' },
      points: 2000
    },

    // Mastery
    {
      id: 'perfect-quiz',
      name: 'Perfectionist',
      description: 'Score 100% on a quiz',
      icon: '⭐',
      category: 'mastery',
      rarity: 'rare',
      requirement: { type: 'perfect_score', value: 1, description: 'Get 100% on a quiz' },
      points: 300
    },
    {
      id: 'quiz-streak-5',
      name: 'Quiz Champion',
      description: 'Score 90%+ on 5 consecutive quizzes',
      icon: '🎯',
      category: 'mastery',
      rarity: 'epic',
      requirement: { type: 'high_quiz_streak', value: 5, description: '90%+ on 5 quizzes in a row' },
      points: 750
    },

    // Engagement
    {
      id: 'questions-10',
      name: 'Curious Mind',
      description: 'Ask 10 questions to the AI tutor',
      icon: '❓',
      category: 'learning',
      rarity: 'common',
      requirement: { type: 'questions_asked', value: 10, description: 'Ask 10 questions' },
      points: 150
    },
    {
      id: 'study-hours-10',
      name: 'Scholar',
      description: 'Study for 10 hours total',
      icon: '⏰',
      category: 'learning',
      rarity: 'rare',
      requirement: { type: 'study_hours', value: 10, description: 'Study for 10 hours' },
      points: 400
    },

    // Special
    {
      id: 'early-bird',
      name: 'Early Bird',
      description: 'Study before 8 AM',
      icon: '🌅',
      category: 'learning',
      rarity: 'rare',
      requirement: { type: 'early_study', value: 1, description: 'Study before 8 AM once' },
      points: 200
    },
    {
      id: 'night-owl',
      name: 'Night Owl',
      description: 'Study after 10 PM',
      icon: '🦉',
      category: 'learning',
      rarity: 'rare',
      requirement: { type: 'late_study', value: 1, description: 'Study after 10 PM once' },
      points: 200
    }
  ];

  /**
   * Award points to a user
   */
  async awardPoints(userId: string, action: string, amount: number): Promise<void> {
    // Update user points
    await supabase
      .from('user_points')
      .upsert({
        user_id: userId,
        total_points: amount,
        updated_at: new Date()
      });

    // Record point transaction
    await supabase
      .from('point_transactions')
      .insert({
        user_id: userId,
        action,
        points: amount,
        timestamp: new Date()
      });

    // Check for badge eligibility
    await this.checkBadges(userId);
  }

  /**
   * Update learning streak
   */
  async updateLearningStreak(userId: string): Promise<LearningStreak> {
    const today = new Date().toDateString();

    const { data: existing } = await supabase
      .from('learning_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    let streak: LearningStreak;

    if (existing) {
      const lastStudyDate = new Date(existing.last_study_date).toDateString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

      if (lastStudyDate === today) {
        // Already studied today
        streak = {
          userId,
          currentStreak: existing.current_streak,
          longestStreak: existing.longest_streak,
          lastStudyDate: new Date(existing.last_study_date),
          streakHistory: existing.streak_history || []
        };
      } else if (lastStudyDate === yesterday) {
        // Continuing streak
        const newStreak = existing.current_streak + 1;
        const newLongest = Math.max(newStreak, existing.longest_streak);

        streak = {
          userId,
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastStudyDate: new Date(),
          streakHistory: existing.streak_history || []
        };

        // Update streak history
        const history = existing.streak_history || [];
        history.push({ date: today, active: true });

        await supabase
          .from('learning_streaks')
          .update({
            current_streak: newStreak,
            longest_streak: newLongest,
            last_study_date: new Date(),
            streak_history: history,
            updated_at: new Date()
          })
          .eq('user_id', userId);

        // Award streak points
        if (newStreak === 7) await this.awardBadge(userId, 'streak-7');
        if (newStreak === 30) await this.awardBadge(userId, 'streak-30');
      } else {
        // Streak broken, restart
        streak = {
          userId,
          currentStreak: 1,
          longestStreak: existing.longest_streak,
          lastStudyDate: new Date(),
          streakHistory: existing.streak_history || []
        };

        const history = existing.streak_history || [];
        history.push({ date: today, active: true });

        await supabase
          .from('learning_streaks')
          .update({
            current_streak: 1,
            last_study_date: new Date(),
            streak_history: history,
            updated_at: new Date()
          })
          .eq('user_id', userId);
      }
    } else {
      // First time
      streak = {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastStudyDate: new Date(),
        streakHistory: [{ date: today, active: true }]
      };

      await supabase
        .from('learning_streaks')
        .insert({
          user_id: userId,
          current_streak: 1,
          longest_streak: 1,
          last_study_date: new Date(),
          streak_history: [{ date: today, active: true }],
          created_at: new Date()
        });
    }

    return streak;
  }

  /**
   * Check and award badges
   */
  async checkBadges(userId: string): Promise<Achievement[]> {
    const earnedAchievements: Achievement[] = [];

    // Get user stats
    const stats = await this.getUserStats(userId);

    // Check each badge
    for (const badge of this.badges) {
      const alreadyEarned = await this.hasBadge(userId, badge.id);
      if (alreadyEarned) continue;

      if (this.meetsRequirement(stats, badge.requirement)) {
        await this.awardBadge(userId, badge.id);
        earnedAchievements.push({
          id: `achievement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          badgeId: badge.id,
          earnedAt: new Date(),
          progress: 100,
          notified: false
        });
      }
    }

    return earnedAchievements;
  }

  /**
   * Award a specific badge
   */
  private async awardBadge(userId: string, badgeId: string): Promise<void> {
    const badge = this.badges.find(b => b.id === badgeId);
    if (!badge) return;

    // Add to user badges
    await supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badgeId,
        earned_at: new Date()
      });

    // Award points
    await this.awardPoints(userId, `badge_${badgeId}`, badge.points);

    console.log(`🏆 Badge awarded: ${badge.name} to user ${userId}`);
  }

  /**
   * Check if user has badge
   */
  async hasBadge(userId: string, badgeId: string): Promise<boolean> {
    const { data } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .single();

    return !!data;
  }

  /**
   * Get user stats
   */
  private async getUserStats(userId: any) {
    const [chapters, quizzes, points, questions, sessions] = await Promise.all([
      supabase.from('user_progress').select('*').eq('user_id', userId),
      supabase.from('quiz_attempts').select('*').eq('user_id', userId),
      supabase.from('point_transactions').select('*').eq('user_id', userId),
      supabase.from('chat_messages').select('*').eq('user_id', userId),
      supabase.from('study_sessions').select('*').eq('user_id', userId)
    ]);

    const stats = {
      chaptersCompleted: chapters.data?.filter(c => c.status === 'completed').length || 0,
      perfectQuizzes: quizzes.data?.filter(q => q.score === 100).length || 0,
      quizStreak: this.calculateQuizStreak(quizzes.data || []),
      questionsAsked: questions.data?.length || 0,
      studyHours: (sessions.data?.reduce((sum, s) => sum + (s.duration || 0), 0) / 3600000) || 0
    };

    return stats;
  }

  /**
   * Calculate consecutive high-score quiz streak
   */
  private calculateQuizStreak(quizzes: any[]): number {
    let streak = 0;
    for (let i = quizzes.length - 1; i >= 0; i--) {
      if (quizzes[i].score >= 90) streak++;
      else break;
    }
    return streak;
  }

  /**
   * Check if user meets badge requirement
   */
  private meetsRequirement(stats: any, requirement: any): boolean {
    switch (requirement.type) {
      case 'streak_days':
        // This would need actual streak data
        return false;
      case 'chapters_completed':
        return stats.chaptersCompleted >= requirement.value;
      case 'perfect_score':
        return stats.perfectQuizzes >= requirement.value;
      case 'high_quiz_streak':
        return stats.quizStreak >= requirement.value;
      case 'questions_asked':
        return stats.questionsAsked >= requirement.value;
      case 'study_hours':
        return stats.studyHours >= requirement.value;
      default:
        return false;
    }
  }

  /**
   * Get user leaderboard position
   */
  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    const { data: users } = await supabase
      .from('users')
      .select('id, username, total_points')
      .order('total_points', { ascending: false })
      .limit(limit);

    const leaderboard: LeaderboardEntry[] = [];

    for (const user of users || []) {
      const [badgeCount, streak] = await Promise.all([
        supabase.from('user_badges').select('id').eq('user_id', user.id).then(({ count }) => count || 0),
        supabase.from('learning_streaks').select('current_streak').eq('user_id', user.id).single()
      ]);

      leaderboard.push({
        userId: user.id,
        username: user.username || 'Anonymous',
        totalPoints: user.total_points || 0,
        rank: 0, // Will be set after sorting
        badges: badgeCount,
        streak: streak.data?.current_streak || 0
      });
    }

    // Set ranks
    leaderboard
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .forEach((entry, index) => {
        entry.rank = index + 1;
      });

    return leaderboard;
  }

  /**
   * Get user's achievements
   */
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    const { data } = await supabase
      .from('user_badges')
      .select('*, badges(*)')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    return (data || []).map(item => ({
      id: item.id,
      userId,
      badgeId: item.badge_id,
      earnedAt: new Date(item.earned_at),
      progress: 100,
      notified: true
    }));
  }

  /**
   * Get user's learning streak
   */
  async getUserStreak(userId: string): Promise<LearningStreak | null> {
    const { data } = await supabase
      .from('learning_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) return null;

    return {
      userId,
      currentStreak: data.current_streak,
      longestStreak: data.longest_streak,
      lastStudyDate: new Date(data.last_study_date),
      streakHistory: data.streak_history || []
    };
  }
}

export const gamificationService = new GamificationService();
