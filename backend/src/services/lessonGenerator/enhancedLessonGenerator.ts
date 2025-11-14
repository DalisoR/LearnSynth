import { EnhancedRAGService } from '../rag/enhancedRagService';
import { KnowledgeBaseContextAggregator } from '../rag/contextAggregator';
import { StructurePlanner } from './structurePlanner';
import { ContentGenerator } from './contentGenerator';
import { ContentEnhancer } from './contentEnhancer';
import { CrossBookSynthesisEngine } from './synthesisEngine';
import { QualityAssuranceEngine } from './qualityAssurance';
import { LessonStructure, GenerationConfig } from './types';
import { ContextResult } from '../rag/types';

export interface EnhancedLessonResult {
  lesson: LessonStructure;
  synthesis: any;
  qualityReport: any;
  metadata: {
    generationTime: number;
    tokenUsage: number;
    sourcesUsed: number;
  };
}

export class EnhancedLessonGenerator {
  private ragService: EnhancedRAGService;
  private contextAggregator: KnowledgeBaseContextAggregator;
  private structurePlanner: StructurePlanner;
  private contentGenerator: ContentGenerator;
  private contentEnhancer: ContentEnhancer;
  private synthesisEngine: CrossBookSynthesisEngine;
  private qualityEngine: QualityAssuranceEngine;

  constructor() {
    this.ragService = new EnhancedRAGService();
    this.contextAggregator = new KnowledgeBaseContextAggregator(this.ragService);
    this.structurePlanner = new StructurePlanner();
    this.contentGenerator = new ContentGenerator();
    this.contentEnhancer = new ContentEnhancer();
    this.synthesisEngine = new CrossBookSynthesisEngine();
    this.qualityEngine = new QualityAssuranceEngine();
  }

  async generateEnhancedLesson(
    params: {
      chapter: string;
      documentId?: string;
      subjectId?: string;
      knowledgeBaseId?: string;
      config?: Partial<GenerationConfig>;
    }
  ): Promise<EnhancedLessonResult> {
    const startTime = Date.now();
    const config: GenerationConfig = {
      level: params.config?.level || 'intermediate',
      includeExamples: params.config?.includeExamples !== false,
      includeVisuals: params.config?.includeVisuals !== false,
      includeCheckpoints: params.config?.includeCheckpoints !== false,
      targetTime: params.config?.targetTime || 20,
      style: params.config?.style || 'academic',
      narrativeStyle: params.config?.narrativeStyle || 'logical'
    };

    try {
      // Stage 1: Retrieve and aggregate context
      console.log('Stage 1: Retrieving context...');
      const context = await this.ragService.retrieveContext({
        text: params.chapter,
        documentId: params.documentId,
        subjectId: params.subjectId,
        knowledgeBaseId: params.knowledgeBaseId
      });

      // If we have a knowledge base, aggregate across all related books
      let aggregatedContext = context;
      if (params.knowledgeBaseId) {
        console.log('Aggregating context across knowledge base...');
        const aggregated = await this.contextAggregator.aggregateBySubject(
          params.knowledgeBaseId,
          params.chapter
        );
        aggregatedContext = {
          ...context,
          chunks: aggregated.chunks,
          concepts: aggregated.metadata.conceptClusters.reduce((acc, cluster) => {
            acc[cluster.concept] = {
              frequency: cluster.centralityScore,
              sources: [],
              agreement: 'consensus'
            };
            return acc;
          }, {} as any)
        };
      }

      // Stage 2: Plan lesson structure
      console.log('Stage 2: Planning lesson structure...');
      const lessonStructure = await this.structurePlanner.planLesson(aggregatedContext, {
        targetTime: config.targetTime,
        level: config.level,
        subject: params.subjectId
      });

      // Stage 3: Generate content (multi-pass)
      console.log('Stage 3: Generating content...');
      const lessonWithContent = await this.contentGenerator.generateContent(
        lessonStructure,
        aggregatedContext,
        config
      );

      // Stage 4: Enhance content with interactive elements
      console.log('Stage 4: Enhancing content...');
      const enhancedLesson = await this.contentEnhancer.enhanceContent(lessonWithContent);

      // Stage 5: Synthesize cross-book knowledge
      console.log('Stage 5: Synthesizing cross-book knowledge...');
      const synthesis = await this.synthesisEngine.synthesizeKnowledge(
        enhancedLesson,
        aggregatedContext
      );

      // Stage 6: Quality assurance
      console.log('Stage 6: Quality assurance...');
      const qualityReport = await this.qualityEngine.reviewLesson(enhancedLesson);

      // Stage 7: Final assembly
      const finalLesson = this.assembleFinalLesson(
        enhancedLesson,
        synthesis,
        qualityReport
      );

      const generationTime = Date.now() - startTime;

      return {
        lesson: finalLesson,
        synthesis,
        qualityReport,
        metadata: {
          generationTime,
          tokenUsage: aggregatedContext.totalTokens,
          sourcesUsed: aggregatedContext.sources.length
        }
      };
    } catch (error) {
      console.error('Error generating enhanced lesson:', error);
      throw new Error(`Failed to generate lesson: ${error.message}`);
    }
  }

  async regenerateTopic(
    lesson: LessonStructure,
    topicId: string,
    context: ContextResult
  ): Promise<LessonStructure> {
    const topic = lesson.topics.find(t => t.id === topicId);
    if (!topic) {
      throw new Error(`Topic ${topicId} not found`);
    }

    // Regenerate just this topic
    const config: GenerationConfig = {
      level: 'intermediate',
      includeExamples: true,
      includeVisuals: true,
      includeCheckpoints: true,
      targetTime: topic.timeAllocation,
      style: 'academic'
    };

    const regeneratedTopicContent = await this.contentGenerator.generateContent(
      { ...lesson, topics: [topic] },
      context,
      config
    );

    // Update the lesson with regenerated topic
    const updatedTopics = lesson.topics.map(t =>
      t.id === topicId ? regeneratedTopicContent.topics[0] : t
    );

    return {
      ...lesson,
      topics: updatedTopics
    };
  }

  private assembleFinalLesson(
    lesson: LessonStructure,
    synthesis: any,
    qualityReport: any
  ): LessonStructure {
    // Add synthesis information to lesson
    const enrichedLesson = {
      ...lesson,
      metadata: {
        synthesis,
        qualityScore: qualityReport.score,
        issues: qualityReport.issues.length
      }
    };

    // Add quality indicators to each topic
    enrichedLesson.topics = enrichedLesson.topics.map(topic => ({
      ...topic,
      qualityIndicators: {
        completeness: this.calculateTopicCompleteness(topic),
        hasExamples: topic.examples.length > 0,
        hasVisuals: topic.visualPrompts.length > 0,
        hasCheckpoints: topic.checkpoints.length > 0
      }
    }));

    return enrichedLesson;
  }

  private calculateTopicCompleteness(topic: any): number {
    let score = 0;
    if (topic.content.core) score += 30;
    if (topic.content.intermediate) score += 25;
    if (topic.content.advanced) score += 25;
    if (topic.examples.length > 0) score += 10;
    if (topic.keyTerms.length > 0) score += 10;
    return score;
  }
}

export const enhancedLessonGenerator = new EnhancedLessonGenerator();
