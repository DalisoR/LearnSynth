import { Router } from 'express';
import { supabase } from '../services/supabase';
import { createLLMService } from '../services/llm/factory';
import { createTTSService } from '../services/tts/factory';
import { enhancedLessonService } from '../services/enhancedLessonService';
import logger from '../utils/logger';

const router = Router();

// Get lesson by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Parse JSON fields
    const parsedLesson = {
      ...lesson,
      key_concepts: lesson.key_concepts || [],
      quiz: lesson.quiz ? JSON.parse(lesson.quiz) : [],
      flashcards: lesson.flashcards ? JSON.parse(lesson.flashcards) : [],
      lesson_references: lesson.lesson_references ? JSON.parse(lesson.lesson_references) : [],
      // Parse metadata which contains comprehensive lesson data
      explanation: lesson.metadata?.explanation,
      visualAids: lesson.metadata?.visualAids || [],
      reflection: lesson.metadata?.reflection,
      finalAssessment: lesson.metadata?.finalAssessment,
      duration: lesson.metadata?.duration,
      difficulty: lesson.metadata?.difficulty,
      knowledgeBaseContext: lesson.metadata?.knowledgeBaseContext,
    };

    res.json({ lesson: parsedLesson });
  } catch (error) {
    logger.error('Error fetching lesson:', error);
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});

// Generate narration for a lesson
router.post('/:id/narrate', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    if (!lesson.narration_text) {
      return res.status(400).json({ error: 'Lesson has no narration text' });
    }

    // Generate audio using TTS service
    const ttsService = createTTSService();
    const audioResult = await ttsService.synthesize({
      text: lesson.narration_text,
      format: 'mp3',
    });

    // Save audio URL
    const { data: updatedLesson, error: updateError } = await supabase
      .from('lessons')
      .update({ audio_url: audioResult.audioUrl })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      lesson: updatedLesson,
      audio: audioResult,
    });
  } catch (error) {
    logger.error('Error generating narration:', error);
    res.status(500).json({ error: 'Failed to generate narration' });
  }
});

// Generate enhanced lessons for a document (NEW - Multi-stage generation)
router.post('/documents/:id/generate-enhanced-lessons', async (req, res) => {
  try {
    const { id } = req.params;
    const config = req.body?.config || {};

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get document chapters
    const { data: chapters, error: chapterError } = await supabase
      .from('chapters')
      .select('*')
      .eq('document_id', id)
      .order('chapter_number', { ascending: true });

    if (chapterError) {
      return res.status(500).json({ error: 'Failed to fetch document chapters' });
    }

    // Generate enhanced lessons for each chapter
    const enhancedLessons = await Promise.all(
      chapters.map(async (chapter) => {
        try {
          const result = await enhancedLessonService.generateEnhancedLesson({
            chapter: chapter.content,
            documentId: id,
            subjectId: document.subject_id,
            config: {
              level: config.level || 'intermediate',
              includeVisuals: config.includeVisuals !== false,
              includeAssessments: config.includeAssessments !== false,
              targetTime: config.targetTime || 20,
              generateQuiz: config.generateQuiz !== false
            }
          });

          return {
            chapter,
            result
          };
        } catch (error) {
          console.error(`Error generating enhanced lesson for chapter ${chapter.id}:`, error);
          return {
            chapter,
            error: error.message
          };
        }
      })
    );

    res.json({
      document,
      lessons: enhancedLessons,
      metadata: {
        totalChapters: chapters.length,
        successful: enhancedLessons.filter(l => !l.error).length,
        failed: enhancedLessons.filter(l => l.error).length
      }
    });
  } catch (error) {
    console.error('Error generating enhanced lessons:', error);
    res.status(500).json({ error: 'Failed to generate enhanced lessons' });
  }
});

// Generate enhanced lesson for a single chapter
router.post('/chapters/:chapterId/generate', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const config = req.body?.config || {};

    // Get chapter
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .single();

    if (chapterError || !chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Get document for subject ID
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', chapter.document_id)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Generate enhanced lesson for the chapter
    const result = await enhancedLessonService.generateEnhancedLesson({
      chapter: chapter.content,
      documentId: chapter.document_id,
      subjectId: document.subject_id,
      config: {
        level: config.level || 'intermediate',
        includeExamples: true,
        includeVisuals: config.includeVisuals !== false,
        includeAssessments: config.includeAssessments !== false,
        targetTime: config.targetTime || 20,
        style: 'academic'
      }
    });

    res.json({
      success: true,
      chapter,
      lesson: result.lesson,
      metadata: result.metadata
    });
  } catch (error) {
    console.error('Error generating lesson:', error);
    res.status(500).json({ error: 'Failed to generate lesson' });
  }
});

// Get enhanced lesson with full context
router.get('/:id/enhanced', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await enhancedLessonService.getLessonWithContext(id);

    res.json(result);
  } catch (error) {
    console.error('Error fetching enhanced lesson:', error);
    res.status(500).json({ error: 'Failed to fetch enhanced lesson' });
  }
});

// Get learning path for a lesson
router.get('/:id/learning-path', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await enhancedLessonService.getLearningPath(id);

    res.json(result);
  } catch (error) {
    console.error('Error fetching learning path:', error);
    res.status(500).json({ error: 'Failed to fetch learning path' });
  }
});

// Get assessment results for a lesson
router.get('/:id/assessments/results', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await enhancedLessonService.getAssessmentResults(id, userId as string);

    res.json(result);
  } catch (error) {
    console.error('Error fetching assessment results:', error);
    res.status(500).json({ error: 'Failed to fetch assessment results' });
  }
});

export default router;
