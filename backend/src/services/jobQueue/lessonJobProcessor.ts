import { Job } from './types';
import { supabase } from '../supabase';
import { createLLMService } from '../llm/factory';
import { ComprehensiveLessonGenerator } from '../lessonGenerator/comprehensiveLessonGenerator';
import { VisualContentGenerator } from '../visualContent/visualContentGenerator';
import logger from '../../utils/logger';

export class LessonJobProcessor {
  private lessonGenerator: ComprehensiveLessonGenerator;
  private visualGenerator: VisualContentGenerator;

  constructor() {
    const llmService = createLLMService();
    this.lessonGenerator = new ComprehensiveLessonGenerator(llmService);
    this.visualGenerator = new VisualContentGenerator('stub');
  }

  async process(job: Job): Promise<void> {
    const { chapterId, chapterTitle, chapterContent, documentId, documentTitle, userId } = job.data;

    logger.info(`Processing lesson generation job for chapter: ${chapterTitle}`);

    try {
      // Update job status
      await this.updateJobStatus(job.id, 'processing', 'Extracting chapter details...');

      // Fetch chapter from database
      const { data: chapter, error: chapterError } = await supabase
        .from('chapters')
        .select('*')
        .eq('id', chapterId)
        .single();

      if (chapterError || !chapter) {
        throw new Error(`Chapter not found: ${chapterId}`);
      }

      // Check if lesson already exists
      const { data: existingLesson } = await supabase
        .from('lessons')
        .select('id')
        .eq('chapter_id', chapterId)
        .single();

      if (existingLesson) {
        logger.info(`Lesson already exists for chapter ${chapterId}, skipping`);
        return;
      }

      await this.updateJobStatus(job.id, 'processing', 'Searching knowledge base...');

      // Get knowledge base context (if document is part of a subject)
      const knowledgeBaseContext = await this.getKnowledgeBaseContext(chapterContent, documentId);

      await this.updateJobStatus(job.id, 'processing', 'Generating comprehensive lesson...');

      // Generate comprehensive lesson
      const lesson = await this.lessonGenerator.generate({
        chapterTitle: chapter.title,
        chapterContent: chapter.content,
        chapterNumber: chapter.chapter_number,
        documentTitle,
        knowledgeBaseContext,
        style: 'easy',
        includeVisuals: true,
      });

      await this.updateJobStatus(job.id, 'processing', 'Generating visual aids...');

      // Generate visual aids
      const visualAids = await this.visualGenerator.generateBatch(lesson.visualAids);

      await this.updateJobStatus(job.id, 'processing', 'Saving lesson to database...');

      // Save lesson to database
      const { data: savedLesson, error: saveError } = await supabase
        .from('lessons')
        .insert({
          chapter_id: chapterId,
          lesson_title: lesson.lessonTitle,
          summary: lesson.summary,
          key_concepts: lesson.learningObjectives,
          quiz: JSON.stringify(lesson.quizzes),
          flashcards: JSON.stringify(this.generateFlashcards(lesson)),
          narration_text: lesson.narrationText,
          lesson_references: JSON.stringify(lesson.references),
          // Store comprehensive lesson data in JSONB fields
          metadata: {
            explanation: lesson.explanation,
            visualAids,
            reflection: lesson.reflection,
            finalAssessment: lesson.finalAssessment,
            duration: lesson.duration,
            difficulty: lesson.difficulty,
            knowledgeBaseContext: lesson.knowledgeBaseContext,
          },
        })
        .select()
        .single();

      if (saveError) {
        logger.error('Error saving lesson:', saveError);
        throw saveError;
      }

      logger.info(`Lesson generated and saved successfully: ${savedLesson.id}`);

      // Update job status to completed
      await this.updateJobStatus(job.id, 'completed', 'Lesson generated successfully');

    } catch (error) {
      logger.error(`Error processing lesson generation job ${job.id}:`, error);
      await this.updateJobStatus(job.id, 'failed', error.message);
      throw error;
    }
  }

  private async getKnowledgeBaseContext(chapterContent: string, documentId: string): Promise<string | undefined> {
    try {
      // In a full implementation, this would:
      // 1. Get the subject(s) this document belongs to
      // 2. Get related documents in the same subject
      // 3. Use embeddings to find relevant content
      // 4. Return formatted context

      // For now, return undefined (no additional context)
      return undefined;
    } catch (error) {
      logger.error('Error getting knowledge base context:', error);
      return undefined;
    }
  }

  private generateFlashcards(lesson: any): Array<{ id: string; front: string; back: string }> {
    const flashcards = [];

    // Generate flashcards from key concepts
    if (lesson.explanation?.concepts) {
      for (const concept of lesson.explanation.concepts) {
        flashcards.push({
          id: 'fc-' + concept.name.toLowerCase().replace(/\s+/g, '-'),
          front: 'What is ' + concept.name + '?',
          back: concept.description,
        });

        flashcards.push({
          id: 'fc-' + concept.name.toLowerCase().replace(/\s+/g, '-') + '-example',
          front: 'Give an example of ' + concept.name,
          back: concept.example,
        });
      }
    }

    return flashcards;
  }

  private async updateJobStatus(jobId: string, status: 'pending' | 'processing' | 'completed' | 'failed', message: string): Promise<void> {
    logger.info('Job ' + jobId + ': ' + status + ' - ' + message);
    // In a production system, you would update the job status in a job tracking database
    // For now, we just log it
  }
}
