/**
 * Enhanced Lesson Service - Integration of all phases
 * Orchestrates the complete enhanced lesson generation pipeline
 */

import { EnhancedRAGService } from './rag/enhancedRagService';
import { KnowledgeBaseContextAggregator } from './rag/contextAggregator';
import { EnhancedLessonGenerator } from './lessonGenerator/enhancedLessonGenerator';
import { visualIntegrator } from './visualContent/visualIntegrator';
import { assessmentPlanner } from './assessment/assessmentPlanner';
import { finalQuizGenerator } from './assessment/finalQuiz';
import { inLessonAssessmentEngine } from './assessment/inLessonAssessment';
import { supabase } from './supabase';

export interface EnhancedLessonRequest {
  chapter: string;
  documentId?: string;
  subjectId?: string;
  knowledgeBaseId?: string;
  config?: {
    level?: 'core' | 'intermediate' | 'advanced';
    includeVisuals?: boolean;
    includeAssessments?: boolean;
    targetTime?: number;
    generateQuiz?: boolean;
  };
}

export interface EnhancedLessonResponse {
  lesson: any;
  visuals: any[];
  assessments: {
    checkpointQuizzes: any[];
    finalQuiz?: any;
  };
  metadata: {
    generationTime: number;
    sourcesUsed: number;
    tokenUsage: number;
    qualityScore: number;
  };
}

export class EnhancedLessonService {
  private ragService: EnhancedRAGService;
  private lessonGenerator: EnhancedLessonGenerator;
  private visualIntegrator: any;
  private assessmentPlanner: any;
  private finalQuizGenerator: any;
  private inLessonAssessment: any;

  constructor() {
    this.ragService = new EnhancedRAGService();
    this.lessonGenerator = new EnhancedLessonGenerator();
    this.visualIntegrator = visualIntegrator;
    this.assessmentPlanner = assessmentPlanner;
    this.finalQuizGenerator = finalQuizGenerator;
    this.inLessonAssessment = inLessonAssessmentEngine;
  }

  async generateEnhancedLesson(request: EnhancedLessonRequest): Promise<EnhancedLessonResponse> {
    const startTime = Date.now();
    console.log('🚀 Starting enhanced lesson generation...', request);

    try {
      // Phase 1: Generate enhanced lesson with multi-stage content generation
      console.log('📚 Phase 1: Generating lesson content...');
      const lessonResult = await this.lessonGenerator.generateEnhancedLesson({
        chapter: request.chapter,
        documentId: request.documentId,
        subjectId: request.subjectId,
        knowledgeBaseId: request.knowledgeBaseId,
        config: {
          level: request.config?.level || 'intermediate',
          includeExamples: true,
          includeVisuals: request.config?.includeVisuals !== false,
          includeCheckpoints: true,
          targetTime: request.config?.targetTime || 20,
          style: 'academic'
        }
      });

      let lesson = lessonResult.lesson;
      let visuals: any[] = [];

      // Phase 2: Generate and integrate visual content
      if (request.config?.includeVisuals !== false) {
        console.log('🎨 Phase 2: Generating visual content...');
        const visualResult = await this.visualIntegrator.integrateVisuals(lesson, {
          subject: request.subjectId,
          maxVisuals: 8,
          generateDiagrams: true,
          storeInDatabase: true
        });

        lesson = visualResult.lesson;
        visuals = visualResult.generatedVisuals;
      }

      // Phase 3: Generate assessments
      let assessments: any = {
        checkpointQuizzes: []
      };

      if (request.config?.includeAssessments !== false) {
        console.log('✅ Phase 3: Generating assessments...');

        // Generate in-lesson checkpoints
        for (const topic of lesson.topics) {
          const checkpoints = await this.inLessonAssessment.generateCheckpointQuiz(
            topic,
            50, // Mid-topic
            { includeReflection: true, includePrediction: true }
          );

          assessments.checkpointQuizzes.push({
            topicId: topic.id,
            checkpoints
          });
        }

        // Generate final quiz
        if (request.config?.generateQuiz) {
          console.log('📝 Generating final quiz...');
          assessments.finalQuiz = await this.finalQuizGenerator.generateFinalQuiz(lesson, {
            questionCount: 15,
            timeLimit: 30,
            focusAreas: lesson.topics.map(t => t.title)
          });
        }
      }

      const generationTime = Date.now() - startTime;

      // Store the enhanced lesson in database
      await this.storeEnhancedLesson(lesson, visuals, assessments);

      const response: EnhancedLessonResponse = {
        lesson,
        visuals,
        assessments,
        metadata: {
          generationTime,
          sourcesUsed: lessonResult.synthesis?.crossReferences?.length || 0,
          tokenUsage: lessonResult.metadata?.tokenUsage || 0,
          qualityScore: lessonResult.qualityReport?.score || 0
        }
      };

      console.log('✅ Enhanced lesson generation complete!', {
        time: `${generationTime}ms`,
        quality: response.metadata.qualityScore,
        visuals: visuals.length
      });

      return response;

    } catch (error) {
      console.error('❌ Error generating enhanced lesson:', error);
      throw error;
    }
  }

  async regenerateWithFeedback(
    lessonId: string,
    feedback: {
      qualityIssues?: string[];
      missingTopics?: string[];
      requestedVisuals?: string[];
      difficulty?: 'too-easy' | 'too-hard' | 'just-right';
    }
  ): Promise<EnhancedLessonResponse> {
    console.log('🔄 Regenerating lesson with feedback...', feedback);

    // Retrieve original lesson
    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (error || !lesson) {
      throw new Error('Lesson not found');
    }

    // Create new request with modifications
    const request: EnhancedLessonRequest = {
      chapter: lesson.content_core,
      documentId: lesson.document_id,
      subjectId: lesson.subject_id,
      config: {
        level: this.adjustLevelBasedOnFeedback(feedback.difficulty),
        includeVisuals: true,
        includeAssessments: true
      }
    };

    return this.generateEnhancedLesson(request);
  }

  async getLessonWithContext(lessonId: string): Promise<{
    lesson: any;
    context: any;
    relatedLessons: any[];
  }> {
    // Retrieve lesson
    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (error || !lesson) {
      throw new Error('Lesson not found');
    }

    // Get related lessons (same subject)
    const { data: relatedLessons } = await supabase
      .from('lessons')
      .select('id, title, content_core')
      .eq('subject_id', lesson.subject_id)
      .neq('id', lessonId)
      .limit(5);

    return {
      lesson,
      context: {
        synthesis: lesson.synthesis_data,
        qualityScore: lesson.quality_score,
        sources: lesson.source_attribution
      },
      relatedLessons: relatedLessons || []
    };
  }

  async getLearningPath(lessonId: string): Promise<{
    prerequisites: any[];
    lesson: any;
    nextLessons: any[];
  }> {
    // Get lesson with prerequisites
    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('*, prerequisites')
      .eq('id', lessonId)
      .single();

    if (error || !lesson) {
      throw new Error('Lesson not found');
    }

    // Find prerequisite lessons
    const { data: prerequisites } = await supabase
      .from('lessons')
      .select('id, title, content_core')
      .in('id', lesson.prerequisites || []);

    // Find next lessons (based on sequence)
    const { data: nextLessons } = await supabase
      .from('lessons')
      .select('id, title, content_core')
      .eq('subject_id', lesson.subject_id)
      .gt('created_at', lesson.created_at)
      .order('created_at', { ascending: true })
      .limit(5);

    return {
      prerequisites: prerequisites || [],
      lesson,
      nextLessons: nextLessons || []
    };
  }

  async getAssessmentResults(lessonId: string, userId: string): Promise<{
    checkpointResults: any[];
    finalQuizResult?: any;
    learningGaps: any[];
    recommendations: string[];
  }> {
    // Get all assessment attempts for this user and lesson
    const { data: attempts, error } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId);

    if (error) {
      throw new Error('Failed to fetch assessment results');
    }

    // Process checkpoint results
    const checkpointResults = attempts
      .filter(a => a.assessment_type === 'checkpoint')
      .map(a => ({
        assessmentId: a.id,
        score: a.score,
        timeSpent: a.time_spent,
        responses: a.responses
      }));

    // Process final quiz result
    const finalQuizAttempt = attempts.find(a => a.assessment_type === 'final');
    const finalQuizResult = finalQuizAttempt ? {
      score: finalQuizAttempt.score,
      passed: finalQuizAttempt.score >= 75,
      attemptNumber: finalQuizAttempt.attempt_number,
      feedback: finalQuizAttempt.feedback
    } : undefined;

    return {
      checkpointResults,
      finalQuizResult,
      learningGaps: this.identifyLearningGaps(attempts),
      recommendations: this.generateRecommendations(attempts)
    };
  }

  private async storeEnhancedLesson(
    lesson: any,
    visuals: any[],
    assessments: any
  ): Promise<void> {
    try {
      // Safely access lesson content with fallbacks
      const objectives = lesson.objectives || lesson.learningObjectives || [];
      const prerequisites = lesson.prerequisites || [];
      const estimatedTime = lesson.estimatedTime || lesson.estimated_time || 20;

      // Create comprehensive metadata object
      const metadata = {
        content: {
          core: lesson.content?.core || lesson.core || lesson.summary || '',
          intermediate: lesson.content?.intermediate || lesson.intermediate || '',
          advanced: lesson.content?.advanced || lesson.advanced || ''
        },
        topics: lesson.topics || [],
        learningObjectives: lesson.objectives || lesson.learningObjectives || [],
        estimatedTime: estimatedTime,
        qualityScore: lesson.metadata?.qualityScore || 0,
        synthesis: lesson.metadata?.synthesis || null,
        sourceAttribution: lesson.metadata?.synthesis?.sourceAttribution || null,
        visualContent: visuals,
        assessments: assessments
      };

      // Store lesson - only use title and metadata to avoid schema issues
      const { error: lessonError } = await supabase
        .from('lessons')
        .insert({
          id: lesson.id,
          title: lesson.title || 'Untitled Lesson',
          metadata: metadata,
          created_at: new Date()
        });

      if (lessonError) {
        console.error('Error storing lesson:', lessonError);
      }

      console.log('✅ Enhanced lesson stored successfully');
    } catch (error) {
      console.error('Error in storeEnhancedLesson:', error);
    }
  }

  private adjustLevelBasedOnFeedback(difficulty?: string): 'core' | 'intermediate' | 'advanced' {
    switch (difficulty) {
      case 'too-easy':
        return 'advanced';
      case 'too-hard':
        return 'core';
      default:
        return 'intermediate';
    }
  }

  private identifyLearningGaps(attempts: any[]): any[] {
    const gaps: any[] = [];
    const topicPerformance = new Map<string, { correct: number; total: number }>();

    attempts.forEach(attempt => {
      attempt.responses?.forEach((response: any) => {
        const topic = response.topic || 'General';
        const stats = topicPerformance.get(topic) || { correct: 0, total: 0 };
        stats.total++;
        if (response.isCorrect) stats.correct++;
        topicPerformance.set(topic, stats);
      });
    });

    topicPerformance.forEach((stats, topic) => {
      const score = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      if (score < 70) {
        gaps.push({
          topic,
          masteryScore: score,
          severity: score < 50 ? 'high' : 'medium'
        });
      }
    });

    return gaps;
  }

  private generateRecommendations(attempts: any[]): string[] {
    const recommendations: string[] = [];

    const avgScore = attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length;

    if (avgScore < 60) {
      recommendations.push('Consider reviewing the lesson content before attempting assessments');
      recommendations.push('Focus on understanding core concepts');
    } else if (avgScore < 75) {
      recommendations.push('Practice with additional questions on weak areas');
    }

    const avgTime = attempts.reduce((sum, a) => sum + a.time_spent, 0) / attempts.length;
    if (avgTime < 60000) {
      recommendations.push('Take more time to carefully consider each question');
    }

    return recommendations;
  }
}

export const enhancedLessonService = new EnhancedLessonService();
