import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

interface QuizPerformance {
  quiz_id: string;
  user_id: string;
  score: number;
  difficulty: number;
  subject_id: string;
  created_at: string;
  answers: any;
}

interface DifficultyAdjustment {
  current_difficulty: number;
  recommended_difficulty: number;
  adjustment_type: 'increase' | 'decrease' | 'maintain';
  adjustment_reason: string;
  confidence: number;
}

class AdaptiveDifficultyService {
  private readonly PERFORMANCE_WINDOW = 5; // Number of quizzes to analyze
  private readonly SUCCESS_THRESHOLD = 0.80; // 80% correct = success
  private readonly FAILURE_THRESHOLD = 0.50; // 50% correct = failure

  /**
   * Main entry point: Analyze performance and adjust difficulty
   */
  async adjustDifficulty(
    userId: string,
    subjectId: string,
    quizResult: any
  ): Promise<DifficultyAdjustment> {
    try {
      logger.info('Analyzing difficulty adjustment', { userId, subjectId });

      // Fetch recent quiz results for analysis
      const recentQuizzes = await this.getRecentQuizzes(userId, subjectId);

      // Calculate current performance metrics
      const performance = this.calculatePerformanceMetrics(recentQuizzes);

      // Determine if adjustment is needed
      const adjustment = this.determineAdjustment(performance);

      // Update difficulty settings if adjustment recommended
      if (adjustment.adjustment_type !== 'maintain') {
        await this.updateDifficultySettings(
          userId,
          subjectId,
          adjustment.recommended_difficulty,
          adjustment.adjustment_reason
        );

        // Store the adjustment in recommendations
        await this.storeDifficultyRecommendation(userId, subjectId, adjustment);
      }

      // Update learning path nodes based on new difficulty
      await this.updateLearningPathDifficulties(userId, subjectId, adjustment.recommended_difficulty);

      logger.info('Difficulty adjustment completed', {
        userId,
        subjectId,
        current: adjustment.current_difficulty,
        recommended: adjustment.recommended_difficulty,
        type: adjustment.adjustment_type,
      });

      return adjustment;
    } catch (error) {
      logger.error('Error adjusting difficulty', { error, userId, subjectId });
      throw error;
    }
  }

  /**
   * Get recent quiz results for a user and subject
   */
  private async getRecentQuizzes(userId: string, subjectId: string): Promise<QuizPerformance[]> {
    const { data, error } = await supabase
      .from('quiz_results')
      .select(`
        *,
        quizzes (
          difficulty,
          subject_id
        )
      `)
      .eq('user_id', userId)
      .eq('quizzes.subject_id', subjectId)
      .order('created_at', { ascending: false })
      .limit(this.PERFORMANCE_WINDOW);

    if (error) throw error;

    return (data || []).map((quiz: any) => ({
      quiz_id: quiz.quiz_id,
      user_id: quiz.user_id,
      score: quiz.score / 100, // Convert percentage to decimal
      difficulty: quiz.quizzes?.difficulty || 3,
      subject_id: quiz.quizzes?.subject_id || subjectId,
      created_at: quiz.created_at,
      answers: quiz.answers,
    }));
  }

  /**
   * Calculate performance metrics from recent quizzes
   */
  private calculatePerformanceMetrics(quizzes: QuizPerformance[]): any {
    if (quizzes.length === 0) {
      return {
        average_score: 0,
        average_difficulty: 3,
        success_rate: 0,
        performance_trend: 'stable',
        recent_performance: 0,
        consistency: 0,
      };
    }

    // Calculate basic metrics
    const averageScore = quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length;
    const averageDifficulty = quizzes.reduce((sum, q) => sum + q.difficulty, 0) / quizzes.length;

    // Calculate success rate (quizzes above success threshold)
    const successRate = quizzes.filter(q => q.score >= this.SUCCESS_THRESHOLD).length / quizzes.length;

    // Calculate trend (compare first half to second half)
    const midpoint = Math.floor(quizzes.length / 2);
    const recentAvg = quizzes.slice(0, midpoint).reduce((sum, q) => sum + q.score, 0) / midpoint;
    const olderAvg = quizzes.slice(midpoint).reduce((sum, q) => sum + q.score, 0) / (quizzes.length - midpoint);
    const performanceTrend = recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable';

    // Recent performance (last 2 quizzes)
    const recentPerformance = quizzes.slice(0, 2).reduce((sum, q) => sum + q.score, 0) / Math.min(2, quizzes.length);

    // Consistency (standard deviation of scores)
    const variance =
      quizzes.reduce((sum, q) => sum + Math.pow(q.score - averageScore, 2), 0) / quizzes.length;
    const consistency = 1 - Math.sqrt(variance); // Higher value = more consistent

    // Calculate difficulty-adjusted performance
    const difficultyAdjustedScore = averageScore / averageDifficulty;

    return {
      average_score: averageScore,
      average_difficulty: averageDifficulty,
      success_rate: successRate,
      performance_trend: performanceTrend,
      recent_performance: recentPerformance,
      consistency: consistency,
      difficulty_adjusted_score: difficultyAdjustedScore,
      total_quizzes: quizzes.length,
    };
  }

  /**
   * Determine if difficulty should be adjusted
   */
  private determineAdjustment(performance: any): DifficultyAdjustment {
    const currentDifficulty = Math.round(performance.average_difficulty);
    let recommendedDifficulty = currentDifficulty;
    let adjustmentType: 'increase' | 'decrease' | 'maintain' = 'maintain';
    let reason = '';
    let confidence = 0;

    // Logic for increasing difficulty
    if (
      performance.average_score >= this.SUCCESS_THRESHOLD &&
      performance.success_rate >= 0.75 &&
      performance.consistency >= 0.6 &&
      performance.recent_performance >= this.SUCCESS_THRESHOLD
    ) {
      recommendedDifficulty = Math.min(currentDifficulty + 1, 5);
      adjustmentType = 'increase';
      reason = `Strong performance: ${Math.round(performance.average_score * 100)}% avg score, ${Math.round(performance.success_rate * 100)}% success rate, high consistency`;
      confidence = 90;
    }
    // Logic for decreasing difficulty
    else if (
      performance.average_score < this.FAILURE_THRESHOLD ||
      (performance.success_rate < 0.50 && performance.total_quizzes >= 3)
    ) {
      recommendedDifficulty = Math.max(currentDifficulty - 1, 1);
      adjustmentType = 'decrease';
      reason = `Struggling with current difficulty: ${Math.round(performance.average_score * 100)}% avg score, ${Math.round(performance.success_rate * 100)}% success rate`;
      confidence = 85;
    }
    // Maintain difficulty with strong performance
    else if (
      performance.average_score >= this.SUCCESS_THRESHOLD &&
      performance.average_score < this.SUCCESS_THRESHOLD + 0.15
    ) {
      adjustmentType = 'maintain';
      reason = `Good performance at current difficulty: ${Math.round(performance.average_score * 100)}% avg score`;
      confidence = 70;
    }
    // Adjust based on trend
    else if (performance.performance_trend === 'declining' && performance.recent_performance < this.FAILURE_THRESHOLD) {
      recommendedDifficulty = Math.max(currentDifficulty - 1, 1);
      adjustmentType = 'decrease';
      reason = `Declining performance trend detected`;
      confidence = 75;
    } else if (performance.performance_trend === 'improving' && performance.recent_performance >= this.SUCCESS_THRESHOLD + 0.1) {
      recommendedDifficulty = Math.min(currentDifficulty + 1, 5);
      adjustmentType = 'increase';
      reason = `Strong improving trend: recent ${Math.round(performance.recent_performance * 100)}% vs overall ${Math.round(performance.average_score * 100)}%`;
      confidence = 80;
    }
    // Default: maintain
    else {
      adjustmentType = 'maintain';
      reason = `Performance within acceptable range: ${Math.round(performance.average_score * 100)}% avg score`;
      confidence = 65;
    }

    return {
      current_difficulty: currentDifficulty,
      recommended_difficulty: recommendedDifficulty,
      adjustment_type: adjustmentType,
      adjustment_reason: reason,
      confidence: confidence,
    };
  }

  /**
   * Update difficulty settings in database
   */
  private async updateDifficultySettings(
    userId: string,
    subjectId: string,
    recommendedDifficulty: number,
    reason: string
  ): Promise<void> {
    try {
      // Get current settings
      const { data: existing } = await supabase
        .from('adaptive_difficulty_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('subject_id', subjectId)
        .single();

      if (existing) {
        // Update existing settings
        const { error } = await supabase
          .from('adaptive_difficulty_settings')
          .update({
            current_difficulty: recommendedDifficulty,
            adjustment_type: 'auto',
            adjustment_reason: reason,
            performance_history: [
              ...(existing.performance_history || []).slice(-9), // Keep last 10
              {
                date: new Date().toISOString(),
                difficulty: recommendedDifficulty,
                adjustment_reason: reason,
              },
            ],
            last_adjusted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('subject_id', subjectId);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from('adaptive_difficulty_settings')
          .insert({
            user_id: userId,
            subject_id: subjectId,
            base_difficulty: recommendedDifficulty,
            current_difficulty: recommendedDifficulty,
            adjustment_type: 'auto',
            adjustment_reason: reason,
            performance_history: [
              {
                date: new Date().toISOString(),
                difficulty: recommendedDifficulty,
                adjustment_reason: reason,
              },
            ],
          });

        if (error) throw error;
      }

      logger.info('Difficulty settings updated', { userId, subjectId, recommendedDifficulty });
    } catch (error) {
      logger.error('Error updating difficulty settings', { error, userId, subjectId });
      throw error;
    }
  }

  /**
   * Store difficulty recommendation
   */
  private async storeDifficultyRecommendation(
    userId: string,
    subjectId: string,
    adjustment: DifficultyAdjustment
  ): Promise<void> {
    try {
      const { error } = await supabase.from('path_recommendations').insert({
        user_id: userId,
        subject_id: subjectId,
        recommendation_type: 'difficulty_adjustment',
        title: `Difficulty ${adjustment.adjustment_type === 'increase' ? 'Increased' : adjustment.adjustment_type === 'decrease' ? 'Decreased' : 'Adjusted'}`,
        description: `Recommended difficulty level changed to ${adjustment.recommended_difficulty}/5`,
        reasoning: adjustment.adjustment_reason,
        content_data: {
          current_difficulty: adjustment.current_difficulty,
          recommended_difficulty: adjustment.recommended_difficulty,
          adjustment_type: adjustment.adjustment_type,
        },
        confidence_score: adjustment.confidence,
        priority: adjustment.confidence >= 85 ? 4 : 2,
        status: 'pending',
      });

      if (error) throw error;
    } catch (error) {
      logger.error('Error storing difficulty recommendation', { error, userId, subjectId });
    }
  }

  /**
   * Update learning path node difficulties based on new settings
   */
  private async updateLearningPathDifficulties(
    userId: string,
    subjectId: string,
    newDifficulty: number
  ): Promise<void> {
    try {
      // Get user's learning paths for this subject
      const { data: paths } = await supabase
        .from('learning_paths')
        .select('id')
        .eq('user_id', userId)
        .eq('subject_id', subjectId)
        .eq('status', 'active');

      if (!paths || paths.length === 0) return;

      // Update nodes in each path
      for (const path of paths) {
        const { error } = await supabase
          .from('path_nodes')
          .update({
            difficulty_level: newDifficulty,
            updated_at: new Date().toISOString(),
          })
          .eq('path_id', path.id)
          .gte('difficulty_level', newDifficulty - 2)
          .lte('difficulty_level', newDifficulty + 2);

        if (error) throw error;
      }

      logger.info('Learning path difficulties updated', {
        userId,
        subjectId,
        newDifficulty,
        pathsUpdated: paths.length,
      });
    } catch (error) {
      logger.error('Error updating path difficulties', { error, userId, subjectId, newDifficulty });
    }
  }

  /**
   * Get current difficulty settings for a user and subject
   */
  async getDifficultySettings(userId: string, subjectId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('adaptive_difficulty_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('subject_id', subjectId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    } catch (error) {
      logger.error('Error fetching difficulty settings', { error, userId, subjectId });
      throw error;
    }
  }

  /**
   * Get difficulty adjustment history
   */
  async getDifficultyHistory(userId: string, subjectId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('path_recommendations')
        .select('*')
        .eq('user_id', userId)
        .eq('subject_id', subjectId)
        .eq('recommendation_type', 'difficulty_adjustment')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching difficulty history', { error, userId, subjectId });
      throw error;
    }
  }

  /**
   * Manually set difficulty (override auto-adjustment)
   */
  async setManualDifficulty(
    userId: string,
    subjectId: string,
    difficulty: number,
    reason: string
  ): Promise<void> {
    try {
      // Update settings
      await this.updateDifficultySettings(userId, subjectId, difficulty, `Manual override: ${reason}`);

      // Update learning paths
      await this.updateLearningPathDifficulties(userId, subjectId, difficulty);

      logger.info('Manual difficulty set', { userId, subjectId, difficulty, reason });
    } catch (error) {
      logger.error('Error setting manual difficulty', { error, userId, subjectId, difficulty });
      throw error;
    }
  }

  /**
   * Get recommended quiz difficulty for next attempt
   */
  async getRecommendedQuizDifficulty(userId: string, subjectId: string): Promise<number> {
    try {
      const settings = await this.getDifficultySettings(userId, subjectId);
      return settings?.current_difficulty || 3; // Default to medium difficulty
    } catch (error) {
      logger.error('Error getting recommended quiz difficulty', { error, userId, subjectId });
      return 3; // Default fallback
    }
  }

  /**
   * Batch adjust difficulty for all users (admin function)
   */
  async batchAdjustDifficulties(): Promise<void> {
    try {
      logger.info('Starting batch difficulty adjustment');

      // Get all users with recent quiz activity
      const { data: recentActivity } = await supabase
        .from('quiz_results')
        .select('user_id, quizzes (subject_id)')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

      if (!recentActivity || recentActivity.length === 0) {
        logger.info('No recent quiz activity found');
        return;
      }

      // Group by user and subject
      const userSubjectMap = new Map<string, string[]>();
      recentActivity.forEach((activity: any) => {
        const key = `${activity.user_id}:${activity.quizzes.subject_id}`;
        if (!userSubjectMap.has(key)) {
          userSubjectMap.set(key, []);
        }
      });

      // Adjust each user-subject combination
      let adjustedCount = 0;
      for (const [key] of userSubjectMap) {
        const [userId, subjectId] = key.split(':');

        // Get the most recent quiz for this user-subject
        const { data: latestQuiz } = await supabase
          .from('quiz_results')
          .select('*')
          .eq('user_id', userId)
          .eq('quizzes.subject_id', subjectId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (latestQuiz) {
          await this.adjustDifficulty(userId, subjectId, latestQuiz);
          adjustedCount++;
        }
      }

      logger.info('Batch difficulty adjustment completed', {
        totalChecked: userSubjectMap.size,
        adjustedCount,
      });
    } catch (error) {
      logger.error('Error in batch difficulty adjustment', { error });
      throw error;
    }
  }
}

export default new AdaptiveDifficultyService();
