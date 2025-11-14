import { hybridSearch } from './hybridSearch';
import { expandQuery } from './queryExpander';
import { ContextResult, SearchQuery, SearchResult, RAGConfig } from './types';
import { optimizeContextWindow } from './contextOptimizer';
import { detectConflicts, findConsensus } from './conflictResolver';
import { supabase } from '../supabase';

export class EnhancedRAGService {
  private defaultConfig: RAGConfig = {
    maxTokens: 12000, // Leave room for generation
    chunkSize: 500,
    chunkOverlap: 50,
    topK: 20,
    similarityThreshold: 0.7,
    expandQueries: true,
    useHybridSearch: true,
    includeMetadata: true
  };

  async retrieveContext(query: SearchQuery, config?: Partial<RAGConfig>): Promise<ContextResult> {
    const finalConfig = { ...this.defaultConfig, ...config };

    // Expand query for better coverage
    let expandedQuery = query;
    if (finalConfig.expandQueries) {
      const expansion = await expandQuery(query.text);
      expandedQuery = {
        ...query,
        text: [query.text, ...expansion.related, ...expansion.synonyms, ...expansion.questions]
          .join(' ')
      };
    }

    // Perform hybrid search
    const results = await hybridSearch(expandedQuery, {
      topK: finalConfig.topK,
      similarityThreshold: finalConfig.similarityThreshold
    });

    // Optimize context window
    const optimized = optimizeContextWindow(results, finalConfig.maxTokens);

    // Analyze concepts and conflicts
    const conceptAnalysis = analyzeConcepts(optimized.chunks);
    const conflicts = detectConflicts(optimized.chunks);
    const consensus = findConsensus(optimized.chunks);

    // Build source summary
    const sources = buildSourceSummary(optimized.chunks);

    return {
      chunks: optimized.chunks,
      totalTokens: optimized.totalTokens,
      sources,
      concepts: conceptAnalysis,
      conflicts,
      consensus
    };
  }

  async getRelatedContent(
    documentId: string,
    chapterTitle: string,
    subjectId?: string
  ): Promise<SearchResult[]> {
    const { data: relatedChunks, error } = await supabase
      .from('chapters')
      .select(`
        *,
        documents!inner (
          id,
          title
        )
      `)
      .eq('document_id', documentId)
      .eq('title', chapterTitle)
      .order('word_count', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching related content:', error);
      return [];
    }

    return relatedChunks?.map((chapter: any) => ({
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
        relevanceScore: 1.0,
        recencyScore: calculateRecencyScore(chapter.created_at),
        authorityScore: 1.0,
        tokenCount: chapter.word_count || estimateTokenCount(chapter.content)
      }
    })) || [];
  }

  async getPrerequisites(concept: string, subjectId?: string): Promise<SearchResult[]> {
    // Query for prerequisite knowledge
    const prerequisiteQueries = [
      `${concept} prerequisites`,
      `before learning ${concept}`,
      `prerequisites for ${concept}`,
      `what to know before ${concept}`
    ];

    const results: SearchResult[] = [];
    for (const queryText of prerequisiteQueries) {
      const context = await this.retrieveContext({ text: queryText, subjectId });
      results.push(...context.chunks);
    }

    // Deduplicate and return top 5
    const unique = deduplicateByContent(results);
    return unique.slice(0, 5);
  }
}

function analyzeConcepts(chunks: SearchResult[]): ContextResult['concepts'] {
  const concepts: { [key: string]: { frequency: number; sources: string[]; agreement: string } } = {};

  chunks.forEach(chunk => {
    // Extract potential concepts (simplified - could use NLP)
    const words = chunk.content.toLowerCase().match(/\b[a-z]{5,}\b/g) || [];
    const uniqueWords = [...new Set(words)];

    uniqueWords.forEach(word => {
      if (!concepts[word]) {
        concepts[word] = { frequency: 0, sources: [], agreement: 'consensus' };
      }
      concepts[word].frequency++;
      if (!concepts[word].sources.includes(chunk.metadata.documentId)) {
        concepts[word].sources.push(chunk.metadata.documentId);
      }
    });
  });

  // Determine agreement level
  Object.keys(concepts).forEach(concept => {
    const sources = concepts[concept].sources;
    if (sources.length > 2) {
      concepts[concept].agreement = 'consensus';
    } else if (sources.length === 2) {
      concepts[concept].agreement = 'mixed';
    } else {
      concepts[concept].agreement = 'conflicting';
    }
  });

  return concepts;
}

function buildSourceSummary(chunks: SearchResult[]): ContextResult['sources'] {
  const sourceMap = new Map<string, { documentId: string; documentName: string; count: number; score: number }>();

  chunks.forEach(chunk => {
    const existing = sourceMap.get(chunk.metadata.documentId);
    if (existing) {
      existing.count++;
      existing.score += chunk.metadata.relevanceScore;
    } else {
      sourceMap.set(chunk.metadata.documentId, {
        documentId: chunk.metadata.documentId,
        documentName: chunk.metadata.documentName,
        count: 1,
        score: chunk.metadata.relevanceScore
      });
    }
  });

  return Array.from(sourceMap.values())
    .map(s => ({
      documentId: s.documentId,
      documentName: s.documentName,
      chunks: s.count,
      contributionScore: s.score / s.count
    }))
    .sort((a, b) => b.contributionScore - a.contributionScore);
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

function calculateRecencyScore(createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.exp(-ageDays / 365);
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
