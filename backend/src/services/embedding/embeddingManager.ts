import { supabase } from '../../config/supabase';
import { OpenAI } from 'openai';

interface EmbeddingCoverage {
  documentId: string;
  chapterId?: string;
  totalChunks: number;
  embeddedChunks: number;
  coveragePercentage: number;
}

interface EmbeddingJob {
  documentId: string;
  chapterId?: string;
  chunkId: string;
  content: string;
  embedding?: number[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class EmbeddingManager {
  private openai: OpenAI | null = null;
  private embeddingModel = 'text-embedding-3-small';
  private embeddingDims = 1536;
  private chunkSize = 1000;
  private chunkOverlap = 200;

  constructor() {
    // Initialize OpenAI if API key is available
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Initialize embedding stats for a document
   */
  async initializeDocumentStats(documentId: string): Promise<void> {
    try {
      // Get all chapters for the document
      const { data: chapters, error: chaptersError } = await supabase
        .from('chapters')
        .select('id, content')
        .eq('document_id', documentId);

      if (chaptersError) {
        throw new Error(`Failed to fetch chapters: ${chaptersError.message}`);
      }

      if (!chapters || chapters.length === 0) {
        // Insert stats with 0 chunks if no chapters
        await supabase
          .from('embedding_stats')
          .upsert({
            document_id: documentId,
            total_chunks: 0,
            embedded_chunks: 0
          });
        return;
      }

      // Process each chapter
      for (const chapter of chapters) {
        await this.initializeChapterStats(documentId, chapter.id, chapter.content || '');
      }
    } catch (error) {
      console.error('Error initializing document stats:', error);
      throw error;
    }
  }

  /**
   * Initialize embedding stats for a chapter
   */
  async initializeChapterStats(documentId: string, chapterId: string, content: string): Promise<void> {
    try {
      // Chunk the content
      const chunks = this.chunkText(content);

      // Count total chunks
      const totalChunks = chunks.length;

      // Check how many chunks are already embedded
      const { data: existingEmbeddings, error: embeddingsError } = await supabase
        .from('embeddings')
        .select('id')
        .eq('chapter_id', chapterId);

      if (embeddingsError) {
        throw new Error(`Failed to fetch embeddings: ${embeddingsError.message}`);
      }

      const embeddedChunks = existingEmbeddings?.length || 0;

      // Insert or update stats
      await supabase
        .from('embedding_stats')
        .upsert({
          document_id: documentId,
          chapter_id: chapterId,
          total_chunks: totalChunks,
          embedded_chunks: embeddedChunks,
          last_updated: new Date().toISOString()
        });

    } catch (error) {
      console.error('Error initializing chapter stats:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for a document
   */
  async generateEmbeddingsForDocument(
    documentId: string,
    userId?: string
  ): Promise<{ success: boolean; embedded: number; total: number; errors: string[] }> {
    const errors: string[] = [];
    let embeddedCount = 0;
    let totalCount = 0;

    try {
      // Get all chapters for the document
      const { data: chapters, error: chaptersError } = await supabase
        .from('chapters')
        .select('id, content')
        .eq('document_id', documentId);

      if (chaptersError) {
        throw new Error(`Failed to fetch chapters: ${chaptersError.message}`);
      }

      if (!chapters || chapters.length === 0) {
        errors.push('No chapters found for document');
        return { success: false, embedded: 0, total: 0, errors };
      }

      // Process each chapter
      for (const chapter of chapters) {
        try {
          const result = await this.generateEmbeddingsForChapter(chapter.id);
          embeddedCount += result.embedded;
          totalCount += result.total;
        } catch (error) {
          const errorMsg = `Failed to process chapter ${chapter.id}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Update stats
      await this.updateDocumentCoverage(documentId);

      const success = errors.length === 0;
      return { success, embedded: embeddedCount, total: totalCount, errors };
    } catch (error) {
      errors.push(`Critical error: ${error}`);
      return { success: false, embedded: embeddedCount, total: totalCount, errors };
    }
  }

  /**
   * Generate embeddings for a chapter
   */
  async generateEmbeddingsForChapter(
    chapterId: string
  ): Promise<{ success: boolean; embedded: number; total: number; errors: string[] }> {
    const errors: string[] = [];
    let embeddedCount = 0;

    try {
      // Get chapter content
      const { data: chapter, error: chapterError } = await supabase
        .from('chapters')
        .select('id, content, document_id')
        .eq('id', chapterId)
        .single();

      if (chapterError || !chapter) {
        throw new Error(`Failed to fetch chapter: ${chapterError?.message}`);
      }

      // Chunk the content
      const chunks = this.chunkText(chapter.content || '');
      const totalChunks = chunks.length;

      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        try {
          await this.generateSingleEmbedding(chapterId, i, chunks[i]);
          embeddedCount++;
        } catch (error) {
          const errorMsg = `Failed to generate embedding for chunk ${i} in chapter ${chapterId}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Update chapter stats
      await this.updateChapterCoverage(chapter.document_id, chapterId);

      return {
        success: errors.length === 0,
        embedded: embeddedCount,
        total: totalChunks,
        errors
      };
    } catch (error) {
      errors.push(`Critical error: ${error}`);
      return { success: false, embedded: embeddedCount, total: 0, errors };
    }
  }

  /**
   * Generate a single embedding
   */
  private async generateSingleEmbedding(
    chapterId: string,
    chunkIndex: number,
    content: string
  ): Promise<void> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    // Generate embedding
    const response = await this.openai.embeddings.create({
      model: this.embeddingModel,
      input: content
    });

    const embedding = response.data[0].embedding;

    if (!embedding || embedding.length === 0) {
      throw new Error('Failed to generate embedding');
    }

    // Store in database
    const { error } = await supabase
      .from('embeddings')
      .insert({
        chapter_id: chapterId,
        chunk_index: chunkIndex,
        content,
        embedding,
        token_count: Math.ceil(content.length / 4) // Rough estimation
      });

    if (error) {
      throw new Error(`Failed to store embedding: ${error.message}`);
    }
  }

  /**
   * Get embedding coverage for a document
   */
  async getDocumentCoverage(documentId: string): Promise<EmbeddingCoverage | null> {
    const { data, error } = await supabase
      .from('embedding_stats')
      .select('*')
      .eq('document_id', documentId)
      .single();

    if (error) {
      console.error('Error fetching document coverage:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    const coveragePercentage = data.total_chunks === 0
      ? 0
      : (data.embedded_chunks / data.total_chunks) * 100;

    return {
      documentId: data.document_id,
      chapterId: data.chapter_id,
      totalChunks: data.total_chunks,
      embeddedChunks: data.embedded_chunks,
      coveragePercentage: Math.round(coveragePercentage * 100) / 100
    };
  }

  /**
   * Get embedding coverage for all documents in a subject
   */
  async getSubjectCoverage(subjectId: string): Promise<EmbeddingCoverage[]> {
    const { data, error } = await supabase
      .from('embedding_stats')
      .select(`
        document_id,
        chapter_id,
        total_chunks,
        embedded_chunks
      `)
      .in('document_id', (
        supabase
          .from('document_subjects')
          .select('document_id')
          .eq('subject_id', subjectId)
      ));

    if (error) {
      console.error('Error fetching subject coverage:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data.map(item => {
      const coveragePercentage = item.total_chunks === 0
        ? 0
        : (item.embedded_chunks / item.total_chunks) * 100;

      return {
        documentId: item.document_id,
        chapterId: item.chapter_id,
        totalChunks: item.total_chunks,
        embeddedChunks: item.embedded_chunks,
        coveragePercentage: Math.round(coveragePercentage * 100) / 100
      };
    });
  }

  /**
   * Update document coverage statistics
   */
  private async updateDocumentCoverage(documentId: string): Promise<void> {
    // Get all chapters
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id')
      .eq('document_id', documentId);

    if (chaptersError || !chapters) {
      throw new Error(`Failed to fetch chapters: ${chaptersError?.message}`);
    }

    // Update each chapter
    for (const chapter of chapters) {
      await this.updateChapterCoverage(documentId, chapter.id);
    }
  }

  /**
   * Update chapter coverage statistics
   */
  private async updateChapterCoverage(documentId: string, chapterId: string): Promise<void> {
    // Get current stats
    const { data: stats, error: statsError } = await supabase
      .from('embedding_stats')
      .select('*')
      .eq('chapter_id', chapterId)
      .single();

    if (statsError && statsError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to fetch stats: ${statsError.message}`);
    }

    // Get chapter content
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('content')
      .eq('id', chapterId)
      .single();

    if (chapterError || !chapter) {
      throw new Error(`Failed to fetch chapter: ${chapterError?.message}`);
    }

    // Count total chunks
    const chunks = this.chunkText(chapter.content || '');
    const totalChunks = chunks.length;

    // Count embedded chunks
    const { data: embeddings, error: embeddingsError } = await supabase
      .from('embeddings')
      .select('id')
      .eq('chapter_id', chapterId);

    if (embeddingsError) {
      throw new Error(`Failed to count embeddings: ${embeddingsError.message}`);
    }

    const embeddedChunks = embeddings?.length || 0;

    // Update or insert stats
    await supabase
      .from('embedding_stats')
      .upsert({
        document_id: documentId,
        chapter_id: chapterId,
        total_chunks: totalChunks,
        embedded_chunks: embeddedChunks,
        last_updated: new Date().toISOString()
      });
  }

  /**
   * Chunk text into smaller pieces for embedding
   */
  private chunkText(text: string): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const word of words) {
      if ((currentChunk + ' ' + word).trim().length > this.chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          // Add overlap
          const overlapWords = currentChunk.split(/\s+/).slice(-this.chunkOverlap);
          currentChunk = overlapWords.join(' ');
        }
      }
      currentChunk += ' ' + word;
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Get embedding statistics summary
   */
  async getStatsSummary(documentId?: string): Promise<{
    totalDocuments: number;
    totalChapters: number;
    totalChunks: number;
    embeddedChunks: number;
    overallCoverage: number;
  }> {
    let query = supabase
      .from('embedding_stats')
      .select('total_chunks, embedded_chunks');

    if (documentId) {
      query = query.eq('document_id', documentId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch stats summary: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return {
        totalDocuments: 0,
        totalChapters: 0,
        totalChunks: 0,
        embeddedChunks: 0,
        overallCoverage: 0
      };
    }

    const totalChunks = data.reduce((sum, stat) => sum + stat.total_chunks, 0);
    const embeddedChunks = data.reduce((sum, stat) => sum + stat.embedded_chunks, 0);
    const overallCoverage = totalChunks === 0
      ? 0
      : Math.round((embeddedChunks / totalChunks) * 10000) / 100; // Round to 2 decimal places

    // Get unique document and chapter counts
    const uniqueDocuments = new Set(data.filter(s => s.document_id).map(s => s.document_id)).size;
    const uniqueChapters = data.length;

    return {
      totalDocuments: uniqueDocuments,
      totalChapters: uniqueChapters,
      totalChunks,
      embeddedChunks,
      overallCoverage
    };
  }
}
