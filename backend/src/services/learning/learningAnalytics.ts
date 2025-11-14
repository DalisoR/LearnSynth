/**
 * Learning Analytics Service
 * Provides personalized insights, predictions, and recommendations
 */

import { supabase } from '../supabase';
import { llmService } from '../llm/factory';

export interface LearningInsight {
  type: 'strength' | 'weakness' | 'recommendation' | 'prediction' | 'pattern';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  data?: any;
}

export interface LearningPattern {
  type: string;
  description: string;
  frequency: number;
  impact: 'positive' | 'negative' | 'neutral';
  evidence: string[];
}

export interface PersonalizedRecommendation {
  id: string;
  type: 'review' | 'practice' | 'new_content' | 'break' | 'challenge';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number; // in minutes
  reasoning: string;
  chapterId?: string;
}

export class LearningAnalytics {
  /**
   * Generate comprehensive learning analytics
   */
  async generateInsights(userId: string): Promise<LearningInsight[]> {
    // Get all user data
    const userData = await this.getUserLearningData(userId);
    const insights: LearningInsight[] = [];

    // Analyze patterns
    const patterns = await this.analyzeLearningPatterns(userData);
    insights.push(...patterns);

    // Identify strengths and weaknesses
    const strengths = await this.identifyStrengths(userData);
    insights.push(...strengths);

    const weaknesses = await this.identifyWeaknesses(userData);
    insights.push(...weaknesses);

    // Generate AI-powered insights
    const aiInsights = await this.generateAIInsights(userData);
    insights.push(...aiInsights);

    // Predict future performance
    const predictions = await this.predictPerformance(userData);
    insights.push(...predictions);

    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(userId: string): Promise<PersonalizedRecommendation[]> {
    const userData = await this.getUserLearningData(userId);
    const recommendations: PersonalizedRecommendation[] = [];

    // Recommendation: Review weak areas
    const weakAreas = await this.identifyWeaknesses(userData);
    if (weakAreas.length > 0) {
      recommendations.push({
        id: `rec-review-${Date.now()}`,
        type: 'review',
        title: 'Review Weak Topics',
        description: `Focus on: ${weakAreas.map(w => w.title).join(', ')}`,
        priority: 'high',
        estimatedTime: 30,
        reasoning: 'Your quiz performance shows room for improvement in these areas'
      });
    }

    // Recommendation: Continue streak
    const streak = await this.getCurrentStreak(userId);
    if (streak.currentStreak >= 3) {
      recommendations.push({
        id: `rec-streak-${Date.now()}`,
        type: 'continue',
        title: 'Keep Your Streak Alive!',
        description: `You're on a ${streak.currentStreak}-day streak! Continue studying today.`,
        priority: 'medium',
        estimatedTime: 20,
        reasoning: 'Maintain your learning momentum'
      });
    }

    // Recommendation: New challenges
    if (userData.completedChapters >= 5) {
      recommendations.push({
        id: `rec-challenge-${Date.now()}`,
        type: 'challenge',
        title: 'Take on a Challenge',
        description: 'Try a more advanced chapter or take a comprehensive quiz',
        priority: 'medium',
        estimatedTime: 45,
        reasoning: 'You\'ve mastered the basics, time to level up!'
      });
    }

    // Recommendation: AI-generated personalized content
    const aiRec = await this.generateAIRecommendation(userData);
    if (aiRec) {
      recommendations.push(aiRec);
    }

    return recommendations;
  }

  /**
   * Analyze learning patterns
   */
  private async analyzeLearningPatterns(userData: any): Promise<LearningInsight[]> {
    const patterns: LearningInsight[] = [];

    // Pattern: Time of day
    const studyTimes = userData.sessions.map((s: any) => {
      const hour = new Date(s.start_time).getHours();
      return { hour, duration: s.duration || 0 };
    });

    const timePattern = this.analyzeStudyTimePatterns(studyTimes);
    if (timePattern) {
      patterns.push({
        type: 'pattern',
        title: 'Your Optimal Study Time',
        description: `You study most effectively at ${timePattern.optimalHour}:00. Schedule your sessions around this time for better retention.`,
        confidence: 0.85,
        actionable: true,
        data: timePattern
      });
    }

    // Pattern: Difficulty progression
    if (userData.quizScores.length >= 5) {
      const trend = this.calculatePerformanceTrend(userData.quizScores);
      if (trend === 'improving') {
        patterns.push({
          type: 'pattern',
          title: 'Consistent Improvement',
          description: 'Your quiz scores show a steady upward trend. Keep up the great work!',
          confidence: 0.9,
          actionable: false,
          data: { trend }
        });
      } else if (trend === 'declining') {
        patterns.push({
          type: 'pattern',
          title: 'Performance Decline',
          description: 'Your quiz scores have been declining. Consider reviewing previous material.',
          confidence: 0.85,
          actionable: true,
          data: { trend }
        });
      }
    }

    return patterns;
  }

  /**
   * Identify user strengths
   */
  private async identifyStrengths(userData: any): Promise<LearningInsight[]> {
    const strengths: LearningInsight[] = [];

    // Strength: Fast completion
    if (userData.averageReadingTime < 20) {
      strengths.push({
        type: 'strength',
        title: 'Fast Comprehension',
        description: `You read chapters ${Math.round((1 - userData.averageReadingTime / 30) * 100)}% faster than average.`,
        confidence: 0.9,
        actionable: false
      });
    }

    // Strength: High quiz scores
    const avgQuizScore = userData.quizScores.reduce((a: number, b: number) => a + b, 0) / userData.quizScores.length;
    if (avgQuizScore >= 85) {
      strengths.push({
        type: 'strength',
        title: 'Excellent Knowledge Retention',
        description: `Your average quiz score is ${avgQuizScore.toFixed(1)}%. You're mastering the material well!`,
        confidence: 0.9,
        actionable: false
      });
    }

    // Strength: Consistent engagement
    if (userData.sessions.length >= 10 && userData.engagementScore >= 80) {
      strengths.push({
        type: 'strength',
        title: 'Highly Engaged Learner',
        description: 'You maintain excellent engagement throughout your study sessions.',
        confidence: 0.85,
        actionable: false
      });
    }

    return strengths;
  }

  /**
   * Identify user weaknesses
   */
  private async identifyWeaknesses(userData: any): Promise<LearningInsight[]> {
    const weaknesses: LearningInsight[] = [];

    // Weakness: Low quiz scores
    const avgQuizScore = userData.quizScores.length > 0
      ? userData.quizScores.reduce((a: number, b: number) => a + b, 0) / userData.quizScores.length
      : 0;

    if (avgQuizScore > 0 && avgQuizScore < 70) {
      weaknesses.push({
        type: 'weakness',
        title: 'Quiz Performance Needs Improvement',
        description: `Your average quiz score is ${avgQuizScore.toFixed(1)}%. Consider reviewing chapters before taking quizzes.`,
        confidence: 0.9,
        actionable: true
      });
    }

    // Weakness: Short study sessions
    const avgSessionTime = userData.sessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0) / userData.sessions.length / 60000;
    if (userData.sessions.length > 0 && avgSessionTime < 15) {
      weaknesses.push({
        type: 'weakness',
        title: 'Short Study Sessions',
        description: `Your average session is ${avgSessionTime.toFixed(0)} minutes. Try to extend sessions to ${Math.max(30, avgSessionTime * 2).toFixed(0)} minutes for better retention.`,
        confidence: 0.8,
        actionable: true
      });
    }

    return weaknesses;
  }

  /**
   * Generate AI-powered insights
   */
  private async generateAIInsights(userData: any): Promise<LearningInsight[]> {
    const prompt = `
      Analyze this student's learning data and provide 2-3 key insights:

      Learning Data:
      - Chapters completed: ${userData.completedChapters}
      - Average quiz score: ${userData.quizScores.length > 0 ? (userData.quizScores.reduce((a: number, b: number) => a + b, 0) / userData.quizScores.length).toFixed(1) : 'N/A'}
      - Total study time: ${(userData.totalStudyTime / 3600000).toFixed(1)} hours
      - Number of sessions: ${userData.sessions.length}
      - Questions asked to AI: ${userData.questionsAsked}
      - Recent quiz scores: ${userData.quizScores.slice(-5).join(', ')}

      Provide insights about:
      1. Learning style observations
      2. Progress trajectory
      3. Specific areas for improvement

      Return as JSON array with: type, title, description, confidence (0-1), actionable (boolean)
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 1000,
        temperature: 0.7
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error generating AI insights:', error);
    }

    return [];
  }

  /**
   * Predict future performance
   */
  private async predictPerformance(userData: any): Promise<LearningInsight[]> {
    const predictions: LearningInsight[] = [];

    if (userData.quizScores.length < 3) {
      return predictions;
    }

    const trend = this.calculatePerformanceTrend(userData.quizScores);
    const avgScore = userData.quizScores.reduce((a: number, b: number) => a + b, 0) / userData.quizScores.length;

    let nextWeekPrediction = avgScore;
    if (trend === 'improving') {
      nextWeekPrediction = Math.min(100, avgScore + 5);
    } else if (trend === 'declining') {
      nextWeekPrediction = Math.max(0, avgScore - 5);
    }

    predictions.push({
      type: 'prediction',
      title: 'Predicted Performance Next Week',
      description: `Based on your progress, we predict your average quiz score will be around ${nextWeekPrediction.toFixed(1)}% next week.`,
      confidence: 0.75,
      actionable: true,
      data: { trend, predictedScore: nextWeekPrediction }
    });

    return predictions;
  }

  /**
   * Get comprehensive user learning data
   */
  private async getUserLearningData(userId: string) {
    const [progress, quizzes, sessions, questions, streak] = await Promise.all([
      supabase.from('user_progress').select('*').eq('user_id', userId),
      supabase.from('quiz_attempts').select('score').eq('user_id', userId).order('attempted_at'),
      supabase.from('study_sessions').select('*').eq('user_id', userId).order('start_time'),
      supabase.from('chat_messages').select('id').eq('user_id', userId),
      supabase.from('learning_streaks').select('*').eq('user_id', userId).single()
    ]);

    const quizScores = (quizzes.data || []).map(q => q.score);
    const totalStudyTime = (sessions.data || []).reduce((sum: number, s: any) => sum + (s.duration || 0), 0);

    return {
      completedChapters: (progress.data || []).filter(p => p.status === 'completed').length,
      quizScores,
      sessions: sessions.data || [],
      questionsAsked: (questions.data || []).length,
      totalStudyTime,
      averageReadingTime: (sessions.data || []).length > 0
        ? totalStudyTime / (sessions.data || []).length / 60000
        : 0,
      engagementScore: this.calculateEngagementScore(sessions.data || []),
      currentStreak: streak.data?.current_streak || 0
    };
  }

  /**
   * Analyze study time patterns
   */
  private analyzeStudyTimePatterns(studyTimes: any[]) {
    if (studyTimes.length < 3) return null;

    const hourCounts: { [key: number]: number } = {};
    studyTimes.forEach(st => {
      hourCounts[st.hour] = (hourCounts[st.hour] || 0) + 1;
    });

    const optimalHour = Object.keys(hourCounts).reduce((a, b) =>
      hourCounts[parseInt(a)] > hourCounts[parseInt(b)] ? a : b
    );

    return {
      optimalHour: parseInt(optimalHour),
      distribution: hourCounts
    };
  }

  /**
   * Calculate performance trend
   */
  private calculatePerformanceTrend(scores: number[]): 'improving' | 'declining' | 'stable' {
    if (scores.length < 3) return 'stable';

    const recent = scores.slice(-3);
    const earlier = scores.slice(-6, -3);

    if (earlier.length === 0) return 'stable';

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

    const diff = recentAvg - earlierAvg;

    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(sessions: any[]): number {
    if (sessions.length === 0) return 0;

    const factors = {
      sessionCount: Math.min(sessions.length * 10, 40),
      avgDuration: Math.min(
        sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length / 60000 * 2,
        30
      ),
      consistency: this.calculateConsistencyScore(sessions) * 30
    };

    return Math.min(
      factors.sessionCount + factors.avgDuration + factors.consistency,
      100
    );
  }

  /**
   * Calculate consistency score
   */
  private calculateConsistencyScore(sessions: any[]): number {
    const daysBetween = sessions.map((s, i) => {
      if (i === 0) return 0;
      const diff = new Date(s.start_time).getTime() - new Date(sessions[i - 1].start_time).getTime();
      return diff / (1000 * 60 * 60 * 24);
    }).filter(d => d > 0);

    if (daysBetween.length === 0) return 0;

    const avgGap = daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length;
    return Math.max(0, Math.min(1, 1 - avgGap / 7)); // Best if studying daily
  }

  /**
   * Get current streak
   */
  private async getCurrentStreak(userId: string) {
    const { data } = await supabase
      .from('learning_streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .single();

    return {
      currentStreak: data?.current_streak || 0,
      longestStreak: data?.longest_streak || 0
    };
  }

  /**
   * Generate AI recommendation
   */
  private async generateAIRecommendation(userData: any): Promise<PersonalizedRecommendation | null> {
    const prompt = `
      Based on this learning data, suggest one specific action:

      - Chapters completed: ${userData.completedChapters}
      - Avg quiz score: ${userData.quizScores.length > 0 ? (userData.quizScores.reduce((a: number, b: number) => a + b, 0) / userData.quizScores.length).toFixed(1) : 'N/A'}
      - Total study time: ${(userData.totalStudyTime / 3600000).toFixed(1)} hours
      - Questions asked: ${userData.questionsAsked}

      Provide ONE recommendation as JSON with:
      - type: 'review' | 'practice' | 'new_content' | 'break' | 'challenge'
      - title: short title
      - description: what to do
      - priority: 'high' | 'medium' | 'low'
      - estimatedTime: minutes
      - reasoning: why this helps
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 400,
        temperature: 0.7
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const rec = JSON.parse(jsonMatch[0]);
        rec.id = `rec-ai-${Date.now()}`;
        return rec;
      }
    } catch (error) {
      console.error('Error generating AI recommendation:', error);
    }

    return null;
  }
}

export const learningAnalytics = new LearningAnalytics();
