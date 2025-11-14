import { Router } from 'express';
import { supabase } from '../services/supabase';
import { createEmbeddingsService } from '../services/embeddings/factory';
import logger from '../utils/logger';

const router = Router();

// Get all subjects for user
router.get('/', async (req, res) => {
  try {
    const userId = '00000000-0000-0000-0000-000000000000';

    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ subjects });
  } catch (error) {
    logger.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// Create a new subject
router.post('/', async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const userId = '00000000-0000-0000-0000-000000000000';

    const { data: subject, error } = await supabase
      .from('subjects')
      .insert({
        user_id: userId,
        name,
        description,
        color,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ subject });
  } catch (error) {
    logger.error('Error creating subject:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

// Add document to subject and generate embeddings
router.post('/:id/add-document', async (req, res) => {
  try {
    const { id } = req.params;
    const { documentId } = req.body;

    // Add document to subject
    const { error: linkError } = await supabase
      .from('document_subjects')
      .insert({
        document_id: documentId,
        subject_id: id,
      });

    if (linkError) throw linkError;

    // Get all chapters for the document
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('*')
      .eq('document_id', documentId);

    if (chaptersError) throw chaptersError;

    // Generate embeddings for each chapter
    const embeddingsService = createEmbeddingsService();
    const jobs = [];

    for (const chapter of chapters) {
      const chunks = splitIntoChunks(chapter.content, 500);

      for (const chunk of chunks) {
        const embedding = await embeddingsService.embed({ text: chunk });

        const { error: embeddingError } = await supabase
          .from('embeddings')
          .insert({
            chapter_id: chapter.id,
            subject_id: id,
            content_chunk: chunk,
            embedding: embedding.embedding,
            metadata: {
              chapter_title: chapter.title,
              chapter_number: chapter.chapter_number,
              source: 'document',
            },
          });

        if (embeddingError) throw embeddingError;
      }
    }

    res.json({
      message: 'Document added to subject and embeddings generated',
      chapters: chapters.length,
    });
  } catch (error) {
    logger.error('Error adding document to subject:', error);
    res.status(500).json({ error: 'Failed to add document to subject' });
  }
});

// Retrieve from subject
router.get('/:id/retrieve', async (req, res) => {
  try {
    const { id } = req.params;
    const { query, limit = 5 } = req.query as { query: string; limit?: string };

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const embeddingsService = createEmbeddingsService();
    const results = await embeddingsService.search({
      query,
      subjectId: id,
      limit: parseInt(limit),
    });

    res.json({ results });
  } catch (error) {
    logger.error('Error retrieving from subject:', error);
    res.status(500).json({ error: 'Failed to retrieve from subject' });
  }
});

// Helper function to split text into chunks
function splitIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let currentChunk = '';

  const sentences = text.split(/[.!?]+/);

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence + '. ';
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export default router;
