/**
 * User Progress Tracking Service
 * Tracks user learning state, quiz attempts, and mastery levels
 */

import { supabase } from '../supabase';

export interface UserProgress {
  id: string;
  userId: string;
  chapterId: string;
  documentId: string;
  isLocked: boolean;
  isUnlocked: boolean;
  isCompleted: boolean;
  progress: number; // 0-100
  quizAttempts: number;
  bestScore: number;
  lastAccessedAt: Date;
  timeSpent: number; // in seconds
  masteryLevel: 'novice' | 'developing' | 'proficient' | 'mastered';
  weakAreas: string[];
  strongAreas: string[];
  nextReviewDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizAttemptRecord {
  id: string;
  userId: string;
  chapterId: string;
  quizId: string;
  score: number;
  totalPoints: number;
  earnedPoints: number;
  passed: boolean;
  timeSpent: number;
  answers: any[];
  completedAt: Date;
}

export class UserProgressService {
  private readonly PASS_MARK = 70;
  private readonly MASTERY_THRESHOLD = 85;

  /**
   * Get user's progress for a specific chapter
   */
  async getChapterProgress(userId: string, chapterId: string): Promise<UserProgress | null> {
    const { data: progress, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .single();

    if (error || !progress) {
      return null;
    }

    return this.mapDbToUserProgress(progress);
  }

  /**
   * Get all chapters progress for a document
   */
  async getDocumentProgress(userId: string, documentId: string): Promise<UserProgress[]> {
    const { data: chapters, error } = await supabase
      .from('chapters')
      .select('id')
      .eq('document_id', documentId)
      .order('chapter_number', { ascending: true });

    if (error || !chapters) {
      return [];
    }

    const chapterIds = chapters.map(c => c.id);
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds)
      .order('updated_at', { ascending: false });

    if (progressError) {
      return [];
    }

    return (progress || []).map(p => this.mapDbToUserProgress(p));
  }

  /**
   * Record a quiz attempt
   */
  async recordQuizAttempt(
    userId: string,
    chapterId: string,
    quizId: string,
    score: number,
    totalPoints: number,
    earnedPoints: number,
    timeSpent: number,
    answers: any[]
  ): Promise<UserProgress> {
    const passed = score >= this.PASS_MARK;

    // Save quiz attempt
    await supabase
      .from('quiz_attempts')
      .insert({
        user_id: userId,
        chapter_id: chapterId,
        quiz_id: quizId,
        score,
        total_points: totalPoints,
        earned_points: earnedPoints,
        passed,
        time_spent: timeSpent,
        answers,
        attempted_at: new Date()
      });

    // Update or create user progress
    const existingProgress = await this.getChapterProgress(userId, chapterId);

    if (existingProgress) {
      const updatedProgress = await this.updateProgress(userId, chapterId, {
        quizAttempts: existingProgress.quizAttempts + 1,
        bestScore: Math.max(existingProgress.bestScore, score),
        progress: passed ? 100 : Math.max(existingProgress.progress, Math.floor(score)),
        isCompleted: existingProgress.isCompleted || passed,
        lastAccessedAt: new Date(),
        timeSpent: existingProgress.timeSpent + timeSpent,
        masteryLevel: this.calculateMasteryLevel(score, existingProgress.quizAttempts + 1)
      });

      // Unlock next chapter if passed
      if (passed && !existingProgress.isCompleted) {
        await this.unlockNextChapter(userId, chapterId);
      }

      return updatedProgress;
    } else {
      // Create new progress record
      const { data: chapter } = await supabase
        .from('chapters')
        .select('document_id, chapter_number')
        .eq('id', chapterId)
        .single();

      const newProgress = await this.createProgress(userId, chapterId, chapter?.document_id || '', {
        isUnlocked: chapter?.chapter_number === 1,
        progress: passed ? 100 : score,
        quizAttempts: 1,
        bestScore: score,
        isCompleted: passed,
        lastAccessedAt: new Date(),
        timeSpent,
        masteryLevel: this.calculateMasteryLevel(score, 1)
      });

      // Unlock next chapter if passed
      if (passed) {
        await this.unlockNextChapter(userId, chapterId);
      }

      return newProgress;
    }
  }

  /**
   * Update reading progress for a chapter
   */
  async updateReadingProgress(userId: string, chapterId: string, progressPercent: number): Promise<UserProgress> {
    const existing = await this.getChapterProgress(userId, chapterId);

    if (existing) {
      return this.updateProgress(userId, chapterId, {
        progress: Math.max(existing.progress, progressPercent),
        lastAccessedAt: new Date()
      });
    } else {
      const { data: chapter } = await supabase
        .from('chapters')
        .select('document_id, chapter_number')
        .eq('id', chapterId)
        .single();

      return this.createProgress(userId, chapterId, chapter?.document_id || '', {
        isUnlocked: chapter?.chapter_number === 1,
        progress: progressPercent,
        quizAttempts: 0,
        bestScore: 0,
        isCompleted: false,
        lastAccessedAt: new Date(),
        timeSpent: 0,
        masteryLevel: 'novice'
      });
    }
  }

  /**
   * Get user's learning analytics
   */
  async getUserAnalytics(userId: string, documentId?: string): Promise<{
    totalChapters: number;
    completedChapters: number;
    inProgressChapters: number;
    averageScore: number;
    totalTimeSpent: number;
    masteryDistribution: { [key: string]: number };
    recentActivity: QuizAttemptRecord[];
    recommendations: string[];
  }> {
    let query = supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId);

    if (documentId) {
      const { data: chapters } = await supabase
        .from('chapters')
        .select('id')
        .eq('document_id', documentId);

      if (chapters) {
        const chapterIds = chapters.map(c => c.id);
        query = query.in('chapter_id', chapterIds);
      }
    }

    const { data: progress, error } = await query;

    if (error || !progress) {
      return {
        totalChapters: 0,
        completedChapters: 0,
        inProgressChapters: 0,
        averageScore: 0,
        totalTimeSpent: 0,
        masteryDistribution: { novice: 0, developing: 0, proficient: 0, mastered: 0 },
        recentActivity: [],
        recommendations: []
      };
    }

    const totalChapters = progress.length;
    const completedChapters = progress.filter(p => p.is_completed).length;
    const inProgressChapters = progress.filter(p => !p.is_completed && p.progress > 0).length;
    const averageScore = progress.reduce((sum, p) => sum + (p.best_score || 0), 0) / totalChapters || 0;
    const totalTimeSpent = progress.reduce((sum, p) => sum + (p.time_spent || 0), 0);

    const masteryDistribution = {
      novice: progress.filter(p => p.mastery_level === 'novice').length,
      developing: progress.filter(p => p.mastery_level === 'developing').length,
      proficient: progress.filter(p => p.mastery_level === 'proficient').length,
      mastered: progress.filter(p => p.mastery_level === 'mastered').length
    };

    // Get recent quiz attempts
    const { data: recentAttempts } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('attempted_at', { ascending: false })
      .limit(10);

    const recommendations = this.generateRecommendations(progress);

    return {
      totalChapters,
      completedChapters,
      inProgressChapters,
      averageScore,
      totalTimeSpent,
      masteryDistribution,
      recentActivity: (recentAttempts || []).map(a => ({
        id: a.id,
        userId: a.user_id,
        chapterId: a.chapter_id,
        quizId: a.quiz_id,
        score: a.score,
        totalPoints: a.total_points,
        earnedPoints: a.earned_points,
        passed: a.passed,
        timeSpent: a.time_spent,
        answers: a.answers || [],
        completedAt: new Date(a.attempted_at)
      })),
      recommendations
    };
  }

  /**
   * Get learning streaks
   */
  async getLearningStreak(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: Date | null;
  }> {
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('attempted_at')
      .eq('user_id', userId)
      .order('attempted_at', { ascending: false });

    if (!attempts || attempts.length === 0) {
      return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
    }

    // Calculate streaks based on daily activity
    const dailyActivity = new Set(
      attempts.map(a => new Date(a.attempted_at).toDateString())
    );

    const sortedDates = Array.from(dailyActivity)
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    let currentStreak = 1;
    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const diff = (sortedDates[i - 1].getTime() - sortedDates[i].getTime()) / (1000 * 60 * 60 * 24);

      if (diff === 1) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else if (diff > 1) {
        tempStreak = 1;
      }

      if (i === 1 && diff <= 1) {
        currentStreak = tempStreak;
      }
    }

    return {
      currentStreak,
      longestStreak,
      lastActivityDate: sortedDates[0]
    };
  }

  /**
   * Get weak areas that need review
   */
  async getWeakAreas(userId: string, documentId?: string): Promise<{
    chapters: { chapterId: string; title: string; score: number; issues: string[] }[];
    topics: { topic: string; mastery: number; recommendation: string }[];
  }> {
    let query = supabase
      .from('user_progress')
      .select('*, chapters(title)')
      .eq('user_id', userId)
      .lt('best_score', this.PASS_MARK);

    if (documentId) {
      const { data: chapters } = await supabase
        .from('chapters')
        .select('id')
        .eq('document_id', documentId);

      if (chapters) {
        const chapterIds = chapters.map(c => c.id);
        query = query.in('chapter_id', chapterIds);
      }
    }

    const { data: weakProgress, error } = await query;

    if (error || !weakProgress) {
      return { chapters: [], topics: [] };
    }

    const chapters = weakProgress.map(p => ({
      chapterId: p.chapter_id,
      title: (p as any).chapters?.title || 'Unknown Chapter',
      score: p.best_score || 0,
      issues: this.identifyIssues(p)
    }));

    // Get quiz answers to analyze weak topics
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId);

    const topicPerformance = new Map<string, { correct: number; total: number }>();

    attempts?.forEach(attempt => {
      attempt.answers?.forEach((answer: any) => {
        const topic = answer.topic || 'General';
        const stats = topicPerformance.get(topic) || { correct: 0, total: 0 };
        stats.total++;
        if (answer.isCorrect) stats.correct++;
        topicPerformance.set(topic, stats);
      });
    });

    const topics = Array.from(topicPerformance.entries())
      .filter(([_, stats]) => stats.total > 0)
      .map(([topic, stats]) => ({
        topic,
        mastery: (stats.correct / stats.total) * 100,
        recommendation: this.getTopicRecommendation((stats.correct / stats.total) * 100)
      }))
      .filter(t => t.mastery < 70)
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 10);

    return { chapters, topics };
  }

  private async createProgress(
    userId: string,
    chapterId: string,
    documentId: string,
    data: Partial<UserProgress>
  ): Promise<UserProgress> {
    const progressData = {
      user_id: userId,
      chapter_id: chapterId,
      document_id: documentId,
      is_locked: !data.isUnlocked,
      is_unlocked: data.isUnlocked || false,
      is_completed: data.isCompleted || false,
      progress: data.progress || 0,
      quiz_attempts: data.quizAttempts || 0,
      best_score: data.bestScore || 0,
      last_accessed_at: data.lastAccessedAt || new Date(),
      time_spent: data.timeSpent || 0,
      mastery_level: data.masteryLevel || 'novice',
      weak_areas: data.weakAreas || [],
      strong_areas: data.strongAreas || [],
      created_at: new Date(),
      updated_at: new Date()
    };

    const { data: result, error } = await supabase
      .from('user_progress')
      .insert(progressData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create progress: ${error.message}`);
    }

    return this.mapDbToUserProgress(result);
  }

  private async updateProgress(
    userId: string,
    chapterId: string,
    updates: Partial<UserProgress>
  ): Promise<UserProgress> {
    const updateData: any = {
      updated_at: new Date()
    };

    if (updates.progress !== undefined) updateData.progress = updates.progress;
    if (updates.quizAttempts !== undefined) updateData.quiz_attempts = updates.quizAttempts;
    if (updates.bestScore !== undefined) updateData.best_score = updates.bestScore;
    if (updates.isCompleted !== undefined) updateData.is_completed = updates.isCompleted;
    if (updates.lastAccessedAt !== undefined) updateData.last_accessed_at = updates.lastAccessedAt;
    if (updates.timeSpent !== undefined) updateData.time_spent = updates.timeSpent;
    if (updates.masteryLevel !== undefined) updateData.mastery_level = updates.masteryLevel;

    const { data: result, error } = await supabase
      .from('user_progress')
      .update(updateData)
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update progress: ${error.message}`);
    }

    return this.mapDbToUserProgress(result);
  }

  private async unlockNextChapter(userId: string, completedChapterId: string): Promise<void> {
    const { data: chapter } = await supabase
      .from('chapters')
      .select('document_id, chapter_number')
      .eq('id', completedChapterId)
      .single();

    if (!chapter) return;

    const { data: nextChapter } = await supabase
      .from('chapters')
      .select('id')
      .eq('document_id', chapter.document_id)
      .eq('chapter_number', chapter.chapter_number + 1)
      .single();

    if (!nextChapter) return;

    const existing = await this.getChapterProgress(userId, nextChapter.id);
    if (!existing) {
      await this.createProgress(userId, nextChapter.id, chapter.document_id, {
        isUnlocked: true,
        progress: 0,
        quizAttempts: 0,
        bestScore: 0,
        isCompleted: false,
        lastAccessedAt: new Date(),
        timeSpent: 0,
        masteryLevel: 'novice'
      });
    }
  }

  private calculateMasteryLevel(
    score: number,
    attempts: number
  ): 'novice' | 'developing' | 'proficient' | 'mastered' {
    if (score >= this.MASTERY_THRESHOLD && attempts <= 2) return 'mastered';
    if (score >= this.MASTERY_THRESHOLD) return 'proficient';
    if (score >= 60) return 'developing';
    return 'novice';
  }

  private generateRecommendations(progress: any[]): string[] {
    const recommendations: string[] = [];

    const avgScore = progress.reduce((sum, p) => sum + (p.best_score || 0), 0) / progress.length;
    if (avgScore < 60) {
      recommendations.push('Focus on understanding core concepts before moving to advanced topics');
    }

    const inProgress = progress.filter(p => !p.is_completed && p.progress > 0);
    if (inProgress.length > 3) {
      recommendations.push('Consider completing current chapters before starting new ones');
    }

    const strugglingChapters = progress.filter(p => (p.best_score || 0) < 50);
    if (strugglingChapters.length > 0) {
      recommendations.push('Review chapters with low scores to strengthen foundation knowledge');
    }

    return recommendations;
  }

  private identifyIssues(progress: any): string[] {
    const issues: string[] = [];

    if ((progress.best_score || 0) < 50) {
      issues.push('Low quiz score - needs review');
    }

    if (progress.quiz_attempts > 3) {
      issues.push('Multiple attempts - consider targeted practice');
    }

    if (progress.time_spent < 600) {
      issues.push('Low engagement time');
    }

    return issues;
  }

  private getTopicRecommendation(mastery: number): string {
    if (mastery < 30) {
      return 'Requires immediate review';
    } else if (mastery < 50) {
      return 'Needs focused practice';
    } else if (mastery < 70) {
      return 'Nearly mastered - keep practicing';
    }
    return 'Well understood';
  }

  private mapDbToUserProgress(dbProgress: any): UserProgress {
    return {
      id: dbProgress.id,
      userId: dbProgress.user_id,
      chapterId: dbProgress.chapter_id,
      documentId: dbProgress.document_id,
      isLocked: dbProgress.is_locked,
      isUnlocked: dbProgress.is_unlocked,
      isCompleted: dbProgress.is_completed,
      progress: dbProgress.progress || 0,
      quizAttempts: dbProgress.quiz_attempts || 0,
      bestScore: dbProgress.best_score || 0,
      lastAccessedAt: new Date(dbProgress.last_accessed_at),
      timeSpent: dbProgress.time_spent || 0,
      masteryLevel: dbProgress.mastery_level || 'novice',
      weakAreas: dbProgress.weak_areas || [],
      strongAreas: dbProgress.strong_areas || [],
      nextReviewDate: dbProgress.next_review_date ? new Date(dbProgress.next_review_date) : undefined,
      createdAt: new Date(dbProgress.created_at),
      updatedAt: new Date(dbProgress.updated_at)
    };
  }
}

export const userProgressService = new UserProgressService();