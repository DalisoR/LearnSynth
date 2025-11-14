import { supabase } from '../supabase';
import { EmbeddingsService, EmbeddingRequest, EmbeddingResponse, VectorSearchRequest, VectorSearchResult } from './types';

export class SupabaseEmbeddingsService implements EmbeddingsService {
  private model = 'text-embedding-ada-002';
  private dimensions = 1536;

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    // Note: Supabase doesn't have built-in embeddings, so you'd need to call OpenAI or similar
    // For now, this is a placeholder
    throw new Error('Supabase embeddings require external provider. Use stub mode or configure OpenAI embeddings.');
  }

  async search(request: VectorSearchRequest): Promise<VectorSearchResult[]> {
    const limit = request.limit || 5;
    const threshold = request.threshold || 0.7;

    // First, embed the query
    const { data: queryEmbedding, error: embedError } = await supabase
      .rpc('embed_text', { text: request.query });

    if (embedError) {
      // Fallback to basic text search if vector search is not available
      const { data: fallbackData } = await supabase
        .from('embeddings')
        .select('content_chunk, metadata')
        .textSearch('content_chunk', request.query)
        .limit(limit);

      return (fallbackData || []).map(item => ({
        content: item.content_chunk,
        score: 0.75, // Default score for text search
        metadata: item.metadata,
      }));
    }

    // Perform vector similarity search
    const { data, error } = await supabase
      .rpc('search_embeddings', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
        subject_id_filter: request.subjectId,
      });

    if (error) {
      console.error('Vector search error:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      content: item.content_chunk,
      score: item.similarity,
      metadata: {
        chapterId: item.chapter_id,
        subjectId: item.subject_id,
        source: item.metadata?.source || 'Unknown',
      },
    }));
  }
}
