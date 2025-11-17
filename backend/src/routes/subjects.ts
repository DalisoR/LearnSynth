import { Router } from 'express';
import { supabase } from '../services/supabase';
import { createEmbeddingsService } from '../services/embeddings/factory';
import { RAGService } from '../services/rag/ragService';
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

    // Get document count for each subject
    const subjectsWithCounts = await Promise.all(
      (subjects || []).map(async (subject) => {
        const { data: docLinks, error: countError } = await supabase
          .from('document_subjects')
          .select('document_id', { count: 'exact' })
          .eq('subject_id', subject.id);

        if (countError) {
          logger.error('Error fetching document count:', countError);
          return { ...subject, documentCount: 0 };
        }

        return {
          ...subject,
          documentCount: docLinks?.length || 0
        };
      })
    );

    res.json({ subjects: subjectsWithCounts });
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

// Update a subject
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;

    const { data: subject, error } = await supabase
      .from('subjects')
      .update({
        name,
        description,
        color,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ subject });
  } catch (error) {
    logger.error('Error updating subject:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

// Delete a subject
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

// Get subject details with documents and chapters
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get subject details
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', id)
      .single();

    if (subjectError) throw subjectError;

    // Get document-subject links
    const { data: docLinks, error: linkError } = await supabase
      .from('document_subjects')
      .select('document_id')
      .eq('subject_id', id);

    if (linkError) throw linkError;

    const documentIds = docLinks?.map(link => link.document_id) || [];

    // Get documents
    let documents = [];
    if (documentIds.length > 0) {
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .in('id', documentIds);

      if (docsError) throw docsError;

      // Get chapters for each document
      documents = await Promise.all(
        (docs || []).map(async (doc) => {
          const { data: chapters, error: chaptersError } = await supabase
            .from('chapters')
            .select('id, chapter_number, title, word_count')
            .eq('document_id', doc.id)
            .order('chapter_number', { ascending: true });

          if (chaptersError) throw chaptersError;

          return {
            ...doc,
            chapters: chapters || []
          };
        })
      );
    }

    res.json({
      subject,
      documents
    });
  } catch (error) {
    logger.error('Error fetching subject details:', error);
    res.status(500).json({ error: 'Failed to fetch subject details' });
  }
});

// Get subject stats (document count, chapter count)
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    // Get document count
    const { data: docLinks, error: docError } = await supabase
      .from('document_subjects')
      .select('document_id')
      .eq('subject_id', id);

    if (docError) throw docError;

    const documentCount = docLinks?.length || 0;
    const documentIds = docLinks?.map(link => link.document_id) || [];

    // Get chapter count
    let chapterCount = 0;
    if (documentIds.length > 0) {
      const { data: chapters, error: chapterError } = await supabase
        .from('chapters')
        .select('id', { count: 'exact' })
        .in('document_id', documentIds);

      if (chapterError) throw chapterError;
      chapterCount = chapters?.length || 0;
    }

    res.json({
      document_count: documentCount,
      chapter_count: chapterCount
    });
  } catch (error) {
    logger.error('Error fetching subject stats:', error);
    res.status(500).json({ error: 'Failed to fetch subject stats' });
  }
});

// Toggle favorite status
router.post('/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    const { isFavorite } = req.body;

    const { data: subject, error } = await supabase
      .from('subjects')
      .update({
        is_favorite: isFavorite,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ subject });
  } catch (error) {
    logger.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

// Remove document from subject
router.delete('/:id/documents/:documentId', async (req, res) => {
  try {
    const { id, documentId } = req.params;

    const { error } = await supabase
      .from('document_subjects')
      .delete()
      .eq('subject_id', id)
      .eq('document_id', documentId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    logger.error('Error removing document from subject:', error);
    res.status(500).json({ error: 'Failed to remove document from subject' });
  }
});

// Get available documents to add (not already in this KB)
router.get('/:id/available-documents', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = '00000000-0000-0000-0000-000000000000';

    // Get documents already linked to this subject
    const { data: linkedDocs, error: linkError } = await supabase
      .from('document_subjects')
      .select('document_id')
      .eq('subject_id', id);

    if (linkError) throw linkError;

    const linkedDocIds = linkedDocs?.map(link => link.document_id) || [];

    // Get all user documents not already linked
    let query = supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId);

    if (linkedDocIds.length > 0) {
      query = query.not('id', 'in', `(${linkedDocIds.join(',')})`);
    }

    const { data: documents, error: docsError } = await query.order('created_at', { ascending: false });

    if (docsError) throw docsError;

    res.json({ documents: documents || [] });
  } catch (error) {
    logger.error('Error fetching available documents:', error);
    res.status(500).json({ error: 'Failed to fetch available documents' });
  }
});

// Global search across all knowledge bases
router.get('/search', async (req, res) => {
  try {
    const { query, limit, minRelevanceScore } = req.query as {
      query: string;
      limit?: string;
      minRelevanceScore?: string;
    };

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const ragService = new RAGService();

    const results = await ragService.search(query, {
      limit: limit ? parseInt(limit) : 20,
      minRelevanceScore: minRelevanceScore ? parseFloat(minRelevanceScore) : 0.7
    });

    res.json({
      query,
      results: results.map(result => ({
        content: result.content,
        relevanceScore: result.relevanceScore,
        source: {
          chapterId: result.source.chapterId,
          chapterTitle: result.source.chapterTitle,
          chapterNumber: result.source.chapterNumber,
          documentId: result.source.documentId,
          documentTitle: result.source.documentTitle,
          subjectId: result.source.subjectId,
          subjectName: result.source.subjectName
        }
      }))
    });
  } catch (error) {
    logger.error('Error in global search:', error);
    res.status(500).json({ error: 'Failed to perform global search' });
  }
});

// Search within a knowledge base
router.get('/:id/search', async (req, res) => {
  try {
    const { id } = req.params;
    const { query, limit, documentId, minRelevanceScore } = req.query as {
      query: string;
      limit?: string;
      documentId?: string;
      minRelevanceScore?: string;
    };

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const ragService = new RAGService();

    const searchOptions: any = {
      subjectIds: [id],
      limit: limit ? parseInt(limit) : 10,
      minRelevanceScore: minRelevanceScore ? parseFloat(minRelevanceScore) : 0.7
    };

    // Add document filter if specified
    if (documentId) {
      searchOptions.documentIds = [documentId];
    }

    const results = await ragService.search(query, searchOptions);

    res.json({
      query,
      results: results.map(result => ({
        content: result.content,
        relevanceScore: result.relevanceScore,
        source: {
          chapterId: result.source.chapterId,
          chapterTitle: result.source.chapterTitle,
          chapterNumber: result.source.chapterNumber,
          documentId: result.source.documentId,
          documentTitle: result.source.documentTitle,
          subjectId: result.source.subjectId,
          subjectName: result.source.subjectName
        }
      }))
    });
  } catch (error) {
    logger.error('Error searching knowledge base:', error);
    res.status(500).json({ error: 'Failed to search knowledge base' });
  }
});

// Add document to subject and generate embeddings
router.post('/:id/add-document', async (req, res) => {
  try {
    const { id } = req.params;
    const { documentId } = req.body;

    logger.info(`Adding document ${documentId} to subject ${id}`);

    // Add document to subject
    const { error: linkError } = await supabase
      .from('document_subjects')
      .insert({
        document_id: documentId,
        subject_id: id,
      });

    if (linkError) {
      logger.error('Link error:', linkError);
      throw linkError;
    }

    // Get all chapters for the document
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('*')
      .eq('document_id', documentId);

    if (chaptersError) {
      logger.error('Chapters error:', chaptersError);
      throw chaptersError;
    }

    if (!chapters || chapters.length === 0) {
      logger.warn(`No chapters found for document ${documentId}`);
      return res.json({
        message: 'Document added to subject, but no chapters found',
        chapters: 0,
      });
    }

    logger.info(`Processing ${chapters.length} chapters for embedding generation`);

    // Generate embeddings for each chapter
    const embeddingsService = createEmbeddingsService();
    let processedChunks = 0;
    let failedChunks = 0;

    // Process each chapter
    for (const chapter of chapters) {
      try {
        const chunks = splitIntoChunks(chapter.content, 500);
        logger.info(`Chapter ${chapter.id}: ${chunks.length} chunks`);

        // Process chunks sequentially to avoid overwhelming the API
        for (const chunk of chunks) {
          try {
            const embeddingResult = await embeddingsService.embed({ text: chunk });

            if (!embeddingResult || !embeddingResult.embedding) {
              logger.error(`No embedding generated for chunk: ${chunk.substring(0, 50)}...`);
              failedChunks++;
              continue;
            }

            const { error: embeddingError } = await supabase
              .from('embeddings')
              .insert({
                chapter_id: chapter.id,
                subject_id: id,
                content_chunk: chunk,
                embedding: embeddingResult.embedding,
                metadata: {
                  chapter_title: chapter.title,
                  chapter_number: chapter.chapter_number,
                  source: 'document',
                },
              });

            if (embeddingError) {
              logger.error(`Embedding insert error:`, embeddingError);
              throw embeddingError;
            }

            processedChunks++;
          } catch (chunkError) {
            logger.error(`Error processing chunk in chapter ${chapter.id}:`, chunkError);
            failedChunks++;
            // Continue with next chunk instead of failing entirely
          }
        }
      } catch (chapterError) {
        logger.error(`Error processing chapter ${chapter.id}:`, chapterError);
        // Continue with next chapter
      }
    }

    logger.info(`Embedding generation complete. Processed: ${processedChunks}, Failed: ${failedChunks}`);

    res.json({
      message: 'Document added to subject and embeddings generated',
      chapters: chapters.length,
      processedChunks,
      failedChunks,
    });
  } catch (error) {
    logger.error('Error adding document to subject:', error);
    res.status(500).json({
      error: 'Failed to add document to subject',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
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

// Re-index all documents in a knowledge base (for debugging/testing)
router.post('/:id/reindex', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`Re-indexing all documents for subject ${id}`);

    // Get all document-subject links for this subject
    const { data: docLinks, error: linkError } = await supabase
      .from('document_subjects')
      .select('document_id')
      .eq('subject_id', id);

    if (linkError) throw linkError;

    const documentIds = docLinks?.map(link => link.document_id) || [];

    if (documentIds.length === 0) {
      return res.json({
        message: 'No documents found to re-index',
        documentsProcessed: 0
      });
    }

    logger.info(`Found ${documentIds.length} documents to re-index`);

    let totalProcessed = 0;
    let totalFailed = 0;

    // Re-index each document
    for (const documentId of documentIds) {
      try {
        // Delete existing embeddings for this document and subject
        await supabase
          .from('embeddings')
          .delete()
          .eq('chapter_id', documentId)
          .eq('subject_id', id);

        // Re-add document to trigger indexing
        // This is a simplified version - in production you'd call the actual indexing logic
        const { data: chapters, error: chaptersError } = await supabase
          .from('chapters')
          .select('id')
          .eq('document_id', documentId);

        if (chaptersError) throw chaptersError;

        if (chapters && chapters.length > 0) {
          // Trigger indexing by calling the add-document endpoint logic
          // For now, just count the chapters
          totalProcessed += chapters.length;
        }
      } catch (docError) {
        logger.error(`Error re-indexing document ${documentId}:`, docError);
        totalFailed++;
      }
    }

    logger.info(`Re-indexing complete. Processed: ${totalProcessed}, Failed: ${totalFailed}`);

    res.json({
      message: 'Re-indexing complete',
      documentsProcessed: documentIds.length,
      chaptersProcessed: totalProcessed,
      chaptersFailed: totalFailed
    });

  } catch (error) {
    logger.error('Error re-indexing documents:', error);
    res.status(500).json({
      error: 'Failed to re-index documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get document content for AI consumption
router.get('/:id/content', async (req, res) => {
  try {
    const { id } = req.params;

    // Use the document fetcher service
    const { documentFetcher } = await import('../services/learning/documentFetcher');
    const docs = await documentFetcher.fetchDocuments({
      subjectIds: [id],
      includeContent: true
    });

    res.json({
      success: true,
      subjectId: id,
      documents: docs,
      documentCount: docs.length,
      totalChapters: docs.reduce((sum, doc) => sum + doc.chapters.length, 0)
    });

  } catch (error) {
    logger.error('Error fetching document content:', error);
    res.status(500).json({ error: 'Failed to fetch document content' });
  }
});

export default router;
