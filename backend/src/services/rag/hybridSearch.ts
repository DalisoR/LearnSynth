import { supabase } from '../supabase';
import { SearchResult, SearchQuery } from './types';

/**
 * Hybrid search combining vector similarity and keyword (BM25-style) search
 */
export async function hybridSearch(
  query: SearchQuery,
  config: { topK: number; similarityThreshold: number }
): Promise<SearchResult[]> {
  const { topK, similarityThreshold } = config;

  // Vector similarity search
  const vectorResults = await vectorSearch(query, Math.ceil(topK * 0.6));

  // Keyword search (BM25-style using full-text search)
  const keywordResults = await keywordSearch(query, Math.ceil(topK * 0.4));

  // Combine and deduplicate
  const combined = [...vectorResults, ...keywordResults];
  const unique = deduplicateByContent(combined);

  // Re-rank by hybrid score
  const ranked = unique
    .map(result => ({
      ...result,
      hybridScore: calculateHybridScore(result)
    }))
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .filter(r => r.hybridScore >= similarityThreshold)
    .slice(0, topK);

  return ranked;
}

async function vectorSearch(
  query: SearchQuery,
  limit: number
): Promise<SearchResult[]> {
  // Truncate query to prevent URL too long errors (Supabase has URL length limits)
  const searchText = query.text.length > 100 ? query.text.substring(0, 100) : query.text;

  // First, get chapters that match the query
  const { data: chapters, error } = await supabase
    .from('chapters')
    .select(`
      *,
      documents!inner (
        id,
        title,
        user_id
      )
    `)
    .or(
      query.documentIds && query.documentIds.length > 0
        ? `document_id.in.(${query.documentIds.join(',')}),title.ilike.%${searchText}%`
        : `title.ilike.%${searchText}%`
    )
    .order('word_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Vector search error:', error);
    return [];
  }

  return chapters?.map((chapter: any) => ({
    content: chapter.content,
    metadata: {
      documentId: chapter.document_id,
      documentName: chapter.documents.title,
      chapter: chapter.title,
      page: null,
      subjectId: null,
      topics: [],
      difficulty: 3,
      sourceType: 'pdf',
      relevanceScore: calculateTextSimilarity(chapter.content, query.text),
      recencyScore: calculateRecencyScore(chapter.created_at),
      authorityScore: 1.0,
      tokenCount: chapter.word_count || estimateTokenCount(chapter.content)
    }
  })) || [];
}

async function keywordSearch(
  query: SearchQuery,
  limit: number
): Promise<SearchResult[]> {
  // Truncate query to prevent URL too long errors
  const searchText = query.text.length > 100 ? query.text.substring(0, 100) : query.text;

  const { data, error } = await supabase
    .from('chapters')
    .select(`
      *,
      documents!inner (
        id,
        title
      )
    `)
    .or(
      query.documentIds && query.documentIds.length > 0
        ? `document_id.in.(${query.documentIds.join(',')}),content.ilike.%${searchText}%`
        : `content.ilike.%${searchText}%`
    )
    .order('word_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Keyword search error:', error);
    return [];
  }

  return data?.map((chapter: any) => ({
    content: chapter.content,
    metadata: {
      documentId: chapter.document_id,
      documentName: chapter.documents.title,
      chapter: chapter.title,
      page: null,
      subjectId: null,
      topics: [],
      difficulty: 3,
      sourceType: 'pdf',
      relevanceScore: calculateKeywordRelevance(chapter.content, query.text),
      recencyScore: calculateRecencyScore(chapter.created_at),
      authorityScore: calculateAuthorityScore(chapter.document_id),
      tokenCount: chapter.word_count || estimateTokenCount(chapter.content)
    }
  })) || [];
}

function deduplicateByContent(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter(result => {
    const key = result.content.substring(0, 100);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function calculateHybridScore(result: SearchResult): number {
  // Weighted combination of different scores
  return (
    result.metadata.relevanceScore * 0.5 +
    result.metadata.recencyScore * 0.2 +
    result.metadata.authorityScore * 0.3
  );
}

function calculateKeywordRelevance(content: string, query: string): number {
  const contentLower = content.toLowerCase();
  const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);

  if (queryTerms.length === 0) {
    return 0;
  }

  let score = 0;
  queryTerms.forEach(term => {
    // Skip empty or invalid terms
    if (!term || term.trim() === '') return;

    // Escape special regex characters
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedTerm}\\b`, 'g');
    const matches = contentLower.match(regex);
    if (matches) {
      score += matches.length;
    }
  });

  // Normalize by content length
  return Math.min(score / queryTerms.length, 1.0);
}

function calculateRecencyScore(createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  // Exponential decay: more recent = higher score
  return Math.exp(-ageDays / 365);
}

function calculateAuthorityScore(documentId: string): number {
  // TODO: Implement document authority scoring
  // Could be based on: peer review status, citation count, institutional source, etc.
  return 1.0;
}

function calculateTextSimilarity(content: string, query: string): number {
  // Simple text similarity using word overlap
  const contentWords = new Set(content.toLowerCase().split(/\s+/));
  const queryWords = new Set(query.toLowerCase().split(/\s+/));

  let overlap = 0;
  queryWords.forEach(word => {
    if (contentWords.has(word)) {
      overlap++;
    }
  });

  // Normalize by query length
  return overlap / queryWords.size;
}

function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}
