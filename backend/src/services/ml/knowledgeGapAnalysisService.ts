import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

interface QuizResult {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  answers: any;
  created_at: string;
}

interface KnowledgeGap {
  user_id: string;
  subject_id: string;
  topic: string;
  subtopic?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  gap_score: number;
  evidence: any;
  recommendations: any[];
}

interface LearningPattern {
  user_id: string;
  subject_id?: string;
  topic: string;
  performance_trend: 'improving' | 'stable' | 'declining';
  accuracy_rate: number;
  average_time_spent: number;
  struggle_indicators: string[];
  strength_indicators: string[];
}

class KnowledgeGapAnalysisService {
  private readonly SUCCESS_THRESHOLD = 0.75; // 75% correct = mastered
  private readonly FAILURE_THRESHOLD = 0.50; // 50% correct = needs work

  /**
   * Main entry point: Analyze quiz results and identify knowledge gaps
   */
  async analyzeQuizResults(quizResultId: string): Promise<KnowledgeGap[]> {
    try {
      logger.info('Starting knowledge gap analysis', { quizResultId });

      // Fetch quiz result with detailed data
      const { data: quizResult, error } = await supabase
        .from('quiz_results')
        .select(`
          *,
          quizzes (
            id,
            subject_id,
            title,
            questions,
            subject:subjects (
              id,
              name
            )
          )
        `)
        .eq('id', quizResultId)
        .single();

      if (error || !quizResult) {
        logger.error('Failed to fetch quiz result', { error, quizResultId });
        throw new Error('Quiz result not found');
      }

      // Analyze individual questions to identify gaps
      const gaps = await this.analyzeQuestionPerformance(quizResult);

      // Store identified gaps
      const storedGaps = await this.storeKnowledgeGaps(gaps);

      // Generate recommendations
      await this.generateRecommendations(storedGaps);

      logger.info('Knowledge gap analysis completed', {
        quizResultId,
        gapsFound: storedGaps.length,
      });

      return storedGaps;
    } catch (error) {
      logger.error('Error in knowledge gap analysis', { error, quizResultId });
      throw error;
    }
  }

  /**
   * Analyze individual questions from quiz result
   */
  private async analyzeQuestionPerformance(quizResult: any): Promise<KnowledgeGap[]> {
    const gaps: KnowledgeGap[] = [];
    const { answers, quizzes } = quizResult;
    const subjectId = quizzes.subject_id;
    const userId = quizResult.user_id;

    // Group answers by topic/subtopic
    const topicPerformance = this.groupAnswersByTopic(answers);

    for (const [topic, topicData] of Object.entries(topicPerformance)) {
      const performance = topicData as any;
      const accuracyRate = performance.correct / performance.total;
      const gapScore = this.calculateGapScore(accuracyRate, performance.incorrect);

      // Only create gap if below success threshold
      if (accuracyRate < this.SUCCESS_THRESHOLD) {
        const severity = this.determineSeverity(gapScore, accuracyRate, performance.total);

        const gap: KnowledgeGap = {
          user_id: userId,
          subject_id: subjectId,
          topic: topic,
          severity,
          gap_score: gapScore,
          evidence: {
            quiz_id: quizResult.quiz_id,
            quiz_title: quizzes.title,
            total_questions: performance.total,
            correct_answers: performance.correct,
            incorrect_answers: performance.incorrect,
            accuracy_rate: accuracyRate,
            incorrect_questions: performance.incorrect_questions,
            performance_history: [quizResult], // Store for trend analysis
          },
          recommendations: [],
        };

        gaps.push(gap);
      }
    }

    return gaps;
  }

  /**
   * Group answers by topic/subtopic
   */
  private groupAnswersByTopic(answers: any): Record<string, any> {
    const topicMap: Record<string, any> = {};

    answers.forEach((answer: any) => {
      const topic = answer.topic || 'General';
      const isCorrect = answer.is_correct || false;

      if (!topicMap[topic]) {
        topicMap[topic] = {
          correct: 0,
          incorrect: 0,
          total: 0,
          incorrect_questions: [],
        };
      }

      topicMap[topic].total++;

      if (isCorrect) {
        topicMap[topic].correct++;
      } else {
        topicMap[topic].incorrect++;
        topicMap[topic].incorrect_questions.push(answer);
      }
    });

    return topicMap;
  }

  /**
   * Calculate gap score (0-100, higher = worse)
   */
  private calculateGapScore(accuracyRate: number, incorrectQuestions: any[]): number {
    // Base score from accuracy
    let gapScore = (1 - accuracyRate) * 100;

    // Adjust based on frequency of failures
    const frequencyMultiplier = Math.min(incorrectQuestions.length / 5, 2); // Max 2x penalty
    gapScore += frequencyMultiplier * 10;

    // Adjust based on question difficulty (if available)
    if (incorrectQuestions.length > 0) {
      const avgDifficulty = incorrectQuestions.reduce((sum, q) => sum + (q.difficulty || 3), 0) / incorrectQuestions.length;
      gapScore += (avgDifficulty - 3) * 5; // Penalty for struggling with hard questions
    }

    // Cap at 100
    return Math.min(Math.round(gapScore), 100);
  }

  /**
   * Determine severity based on gap score and other factors
   */
  private determineSeverity(
    gapScore: number,
    accuracyRate: number,
    totalQuestions: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (gapScore >= 80 || accuracyRate < 0.30) {
      return 'critical';
    } else if (gapScore >= 60 || accuracyRate < 0.50) {
      return 'high';
    } else if (gapScore >= 40 || accuracyRate < 0.65) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Store knowledge gaps in database
   */
  private async storeKnowledgeGaps(gaps: KnowledgeGap[]): Promise<KnowledgeGap[]> {
    const storedGaps: KnowledgeGap[] = [];

    for (const gap of gaps) {
      try {
        // Check if gap already exists
        const { data: existingGap } = await supabase
          .from('knowledge_gaps')
          .select('*')
          .eq('user_id', gap.user_id)
          .eq('subject_id', gap.subject_id)
          .eq('topic', gap.topic)
          .eq('status', 'active')
          .single();

        if (existingGap) {
          // Update existing gap
          const { data: updated, error } = await supabase
            .from('knowledge_gaps')
            .update({
              gap_score: gap.gap_score,
              severity: gap.severity,
              last_assessed_at: new Date().toISOString(),
              evidence: gap.evidence,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingGap.id)
            .select()
            .single();

          if (error) throw error;
          storedGaps.push({ ...gap, ...updated });
        } else {
          // Create new gap
          const { data: created, error } = await supabase
            .from('knowledge_gaps')
            .insert({
              user_id: gap.user_id,
              subject_id: gap.subject_id,
              topic: gap.topic,
              severity: gap.severity,
              gap_score: gap.gap_score,
              evidence: gap.evidence,
            })
            .select()
            .single();

          if (error) throw error;
          storedGaps.push({ ...gap, ...created });
        }
      } catch (error) {
        logger.error('Failed to store knowledge gap', { error, gap });
      }
    }

    return storedGaps;
  }

  /**
   * Generate AI-powered recommendations for each knowledge gap
   */
  private async generateRecommendations(gaps: KnowledgeGap[]): Promise<void> {
    for (const gap of gaps) {
      try {
        const recommendations = await this.createRecommendations(gap);

        // Store recommendations
        for (const rec of recommendations) {
          await supabase.from('path_recommendations').insert({
            user_id: gap.user_id,
            subject_id: gap.subject_id,
            recommendation_type: 'next_topic',
            title: rec.title,
            description: rec.description,
            reasoning: rec.reasoning,
            content_data: rec.content_data,
            confidence_score: rec.confidence_score,
            priority: rec.priority,
          });
        }

        // Update gap with recommendations
        await supabase
          .from('knowledge_gaps')
          .update({ recommendations })
          .eq('id', gap.id);
      } catch (error) {
        logger.error('Failed to generate recommendations', { error, gapId: gap.id });
      }
    }
  }

  /**
   * Create specific recommendations for a knowledge gap
   */
  private async createRecommendations(gap: KnowledgeGap): Promise<any[]> {
    const recommendations = [];

    // Recommendation 1: Targeted practice
    recommendations.push({
      title: `Practice Questions on ${gap.topic}`,
      description: `Complete 10 focused practice questions on ${gap.topic} to strengthen understanding.`,
      reasoning: `Your performance on ${gap.topic} shows a ${gap.severity} knowledge gap with ${gap.gap_score}% gap score.`,
      content_data: {
        type: 'practice_quiz',
        topic: gap.topic,
        difficulty: gap.severity === 'critical' ? 2 : gap.severity === 'high' ? 3 : 4,
        question_count: gap.severity === 'critical' ? 15 : gap.severity === 'high' ? 10 : 5,
      },
      confidence_score: 95,
      priority: 5,
    });

    // Recommendation 2: Review specific concepts
    if (gap.evidence.incorrect_questions && gap.evidence.incorrect_questions.length > 0) {
      const concepts = gap.evidence.incorrect_questions
        .map((q: any) => q.concept)
        .filter((c: string) => c);

      if (concepts.length > 0) {
        recommendations.push({
          title: 'Review Core Concepts',
          description: `Review these key concepts: ${concepts.slice(0, 3).join(', ')}`,
          reasoning: 'Incorrect answers indicate misunderstanding of fundamental concepts.',
          content_data: {
            type: 'concept_review',
            concepts: concepts.slice(0, 5),
          },
          confidence_score: 90,
          priority: 4,
        });
      }
    }

    // Recommendation 3: Adjust difficulty
    if (gap.severity === 'critical' || gap.severity === 'high') {
      recommendations.push({
        title: 'Lower Difficulty Level',
        description: 'Temporarily reduce difficulty to build confidence and understanding.',
        reasoning: 'Struggling with current difficulty level suggests need for easier content.',
        content_data: {
          type: 'difficulty_adjustment',
          action: 'decrease',
          current_level: 3,
          suggested_level: 2,
        },
        confidence_score: 85,
        priority: 3,
      });
    }

    // Recommendation 4: Additional resources
    recommendations.push({
      title: 'Supplementary Learning Materials',
      description: `Access videos, articles, and examples on ${gap.topic} for different perspectives.`,
      reasoning: 'Multiple learning modalities can help reinforce understanding.',
      content_data: {
        type: 'resource_list',
        topic: gap.topic,
        formats: ['video', 'article', 'example', 'interactive'],
      },
      confidence_score: 80,
      priority: 2,
    });

    return recommendations;
  }

  /**
   * Analyze learning patterns over time
   */
  async analyzeLearningPatterns(userId: string, subjectId?: string): Promise<LearningPattern[]> {
    try {
      // Fetch quiz results over the last 30 days
      const { data: quizResults } = await supabase
        .from('quiz_results')
        .select(`
          *,
          quizzes (
            subject_id,
            subject:subjects (id, name)
          )
        `)
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (!quizResults) return [];

      // Group by topic and calculate trends
      const topicPatterns: Record<string, LearningPattern> = {};

      quizResults.forEach((result: any) => {
        const subject = result.quizzes?.subject;
        if (subjectId && subject.id !== subjectId) return;

        const answers = result.answers || [];
        answers.forEach((answer: any) => {
          const topic = answer.topic || 'General';
          const isCorrect = answer.is_correct || false;

          if (!topicPatterns[topic]) {
            topicPatterns[topic] = {
              user_id: userId,
              subject_id: subject.id,
              topic,
              performance_trend: 'stable',
              accuracy_rate: 0,
              average_time_spent: 0,
              struggle_indicators: [],
              strength_indicators: [],
            };
          }

          // Track performance data
          const pattern = topicPatterns[topic];
          pattern.accuracy_rate += isCorrect ? 1 : 0;
          pattern.average_time_spent += answer.time_spent || 0;
        });
      });

      // Calculate trends and indicators
      const patterns: LearningPattern[] = Object.values(topicPatterns).map(pattern => {
        const accuracy = pattern.accuracy_rate / 10; // Normalize
        pattern.accuracy_rate = accuracy;

        // Determine trend
        if (accuracy > 0.8) {
          pattern.performance_trend = 'improving';
          pattern.strength_indicators.push('High accuracy');
        } else if (accuracy < 0.5) {
          pattern.performance_trend = 'declining';
          pattern.struggle_indicators.push('Low accuracy');
        }

        // Add time-based indicators
        if (pattern.average_time_spent > 180) { // > 3 minutes per question
          pattern.struggle_indicators.push('Taking too long');
        } else if (pattern.average_time_spent < 30) { // < 30 seconds per question
          pattern.struggle_indicators.push('Rushing through');
        }

        return pattern;
      });

      return patterns;
    } catch (error) {
      logger.error('Error analyzing learning patterns', { error, userId, subjectId });
      throw error;
    }
  }

  /**
   * Predict future performance based on current gaps
   */
  async predictPerformance(userId: string, subjectId: string): Promise<any> {
    try {
      // Fetch knowledge gaps for user
      const { data: gaps } = await supabase
        .from('knowledge_gaps')
        .select('*')
        .eq('user_id', userId)
        .eq('subject_id', subjectId)
        .eq('status', 'active');

      // Fetch recent quiz results
      const { data: recentQuizzes } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', userId)
        .eq('quizzes.subject_id', subjectId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Calculate predictions
      const criticalGaps = gaps?.filter(g => g.severity === 'critical').length || 0;
      const highGaps = gaps?.filter(g => g.severity === 'high').length || 0;
      const avgScore = recentQuizzes?.reduce((sum, q) => sum + q.score, 0) / (recentQuizzes?.length || 1);

      const prediction = {
        predicted_score: Math.max(0, avgScore - (criticalGaps * 10) - (highGaps * 5)),
        confidence: recentQuizzes && recentQuizzes.length >= 3 ? 85 : 60,
        recommendations: [],
        improvement_potential: avgScore < 80 ? 'High' : avgScore < 90 ? 'Medium' : 'Low',
        focus_areas: gaps?.map(g => g.topic).slice(0, 3) || [],
      };

      // Generate improvement recommendations
      if (prediction.predicted_score < 70) {
        prediction.recommendations.push({
          type: 'urgent',
          message: 'Focus on critical knowledge gaps before attempting more quizzes',
          priority: 5,
        });
      }

      return prediction;
    } catch (error) {
      logger.error('Error predicting performance', { error, userId, subjectId });
      throw error;
    }
  }

  /**
   * Get knowledge gaps for a user
   */
  async getKnowledgeGaps(userId: string, subjectId?: string): Promise<KnowledgeGap[]> {
    try {
      let query = supabase
        .from('knowledge_gaps')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('gap_score', { ascending: false });

      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching knowledge gaps', { error, userId, subjectId });
      throw error;
    }
  }

  /**
   * Resolve a knowledge gap (mark as improved/resolved)
   */
  async resolveKnowledgeGap(gapId: string, status: 'improving' | 'resolved'): Promise<void> {
    try {
      const { error } = await supabase
        .from('knowledge_gaps')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gapId);

      if (error) throw error;

      logger.info('Knowledge gap resolved', { gapId, status });
    } catch (error) {
      logger.error('Error resolving knowledge gap', { error, gapId, status });
      throw error;
    }
  }
}

export default new KnowledgeGapAnalysisService();
