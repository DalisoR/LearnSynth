import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../services/supabase';
import { createFileProcessor } from '../services/fileProcessor/factory';
import { InMemoryJobQueue } from '../services/jobQueue/inMemoryQueue';
import logger from '../utils/logger';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all documents for user
router.get('/', async (req, res) => {
  try {
    // Ensure test user exists
    const userId = await ensureTestUser();

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ documents: data });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Helper function to ensure test user exists
async function ensureTestUser(): Promise<string> {
  const testUserId = '00000000-0000-0000-0000-000000000000';

  // Check if user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', testUserId)
    .single();

  // If user doesn't exist, create them
  if (!existingUser) {
    await supabase.from('users').insert({
      id: testUserId,
      email: 'test@learnsynth.com',
      full_name: 'Test User',
    });
  }

  return testUserId;
}

// Upload a document
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Ensure test user exists
    const userId = await ensureTestUser();

    const fileType = req.file.originalname.split('.').pop()?.toLowerCase();

    if (!fileType || !['pdf', 'docx', 'epub'].includes(fileType)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Upload file to Supabase Storage
    const fileName = `${userId}/${Date.now()}_${req.file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      logger.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    // Save document metadata
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        title: req.file.originalname,
        file_type: fileType,
        file_size: req.file.size,
        file_path: fileName,
        upload_status: 'completed',
      })
      .select()
      .single();

    if (dbError) {
      logger.error('Database error:', dbError);
      throw dbError;
    }

    // Extract real chapters from the document
    const fileProcessor = createFileProcessor(fileType);
    const processedDoc = await fileProcessor.process(req.file.buffer);

    logger.info(`Extracted ${processedDoc.chapters.length} chapters from ${req.file.originalname}`);

    // Save all chapters to database
    const chapterInserts = processedDoc.chapters.map(chapter =>
      supabase.from('chapters').insert({
        document_id: document.id,
        chapter_number: chapter.chapterNumber,
        title: chapter.title,
        content: chapter.content,
        word_count: chapter.wordCount,
      })
    );

    const chapterResults = await Promise.all(chapterInserts);

    // Check if any chapter insert failed
    const failedChapters = chapterResults.filter(result => result.error);
    if (failedChapters.length > 0) {
      logger.error('Some chapters failed to insert:', failedChapters);
      throw new Error(`Failed to insert ${failedChapters.length} chapters`);
    }

    logger.info(`Successfully saved ${chapterResults.length} chapters to database`);

    res.json({
      document,
      chapters: processedDoc.chapters,
      extractedChaptersCount: processedDoc.chapters.length,
      message: `File uploaded successfully with ${processedDoc.chapters.length} chapters extracted`,
    });
  } catch (error: any) {
    logger.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document', details: error.message });
  }
});

// Get document details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document });
  } catch (error) {
    logger.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Get document chapters
router.get('/:id/chapters', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: chapters, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('document_id', id)
      .order('chapter_number', { ascending: true });

    if (error) throw error;

    res.json({ chapters });
  } catch (error) {
    logger.error('Error fetching chapters:', error);
    res.status(500).json({ error: 'Failed to fetch chapters' });
  }
});

// Generate lessons for a document
router.post('/:id/generate-lessons', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = '00000000-0000-0000-0000-000000000000';

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get all chapters
    const { data: chapters, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('document_id', id);

    if (error) throw error;

    if (chapters.length === 0) {
      return res.status(400).json({ error: 'No chapters found for this document' });
    }

    // Import job processor here to avoid circular dependencies
    const { LessonJobProcessor } = await import('../services/jobQueue/lessonJobProcessor');

    // Queue lesson generation for each chapter
    const queue = new InMemoryJobQueue();
    const jobProcessor = new LessonJobProcessor();
    queue.registerProcessor('generate_lesson', jobProcessor);

    const jobPromises = chapters.map(chapter =>
      queue.add({
        type: 'generate_lesson',
        data: {
          userId,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          chapterContent: chapter.content,
          chapterNumber: chapter.chapter_number,
          documentId: id,
          documentTitle: document.title,
        },
      })
    );

    const jobs = await Promise.all(jobPromises);

    res.json({
      message: `Lesson generation started for ${chapters.length} chapters`,
      chapters: chapters.length,
      jobs: jobs.map(j => ({ id: j.id, status: j.status })),
    });
  } catch (error) {
    logger.error('Error generating lessons:', error);
    res.status(500).json({ error: 'Failed to generate lessons', details: error.message });
  }
});

// Delete a document and all related data
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = '00000000-0000-0000-0000-000000000000';

    // First, get document details for cleanup
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete in correct order to handle foreign key constraints
    // 1. Delete lessons and related content (these should cascade, but we do it explicitly)
    const { error: lessonsDeleteError } = await supabase
      .from('lessons')
      .delete()
      .eq('document_id', id);

    if (lessonsDeleteError) {
      logger.warn('Error deleting lessons (may not exist):', lessonsDeleteError);
    }

    // 2. Delete enhanced lessons
    const { error: enhancedLessonsDeleteError } = await supabase
      .from('enhanced_lessons')
      .delete()
      .eq('document_id', id);

    if (enhancedLessonsDeleteError) {
      logger.warn('Error deleting enhanced lessons (may not exist):', enhancedLessonsDeleteError);
    }

    // 3. Delete chapters
    const { error: chaptersDeleteError } = await supabase
      .from('chapters')
      .delete()
      .eq('document_id', id);

    if (chaptersDeleteError) {
      throw chaptersDeleteError;
    }

    // 4. Delete document from database
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    // 5. Delete file from storage
    if (document.file_path) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path]);

      if (storageError) {
        logger.warn('Error deleting file from storage:', storageError);
        // Don't fail the entire operation if storage deletion fails
      }
    }

    logger.info(`Successfully deleted document ${id} and all related data`);

    res.json({
      message: 'Document deleted successfully',
      documentId: id,
    });
  } catch (error) {
    logger.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document', details: error.message });
  }
});

export default router;
