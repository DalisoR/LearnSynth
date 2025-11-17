/**
 * RAG (Retrieval Augmented Generation) Service
 * Handles semantic search and context retrieval from knowledge bases
 */

import { supabase } from '../supabase';
import { createEmbeddingsService } from '../embeddings/factory';
import { documentFetcher, DocumentContent } from '../learning/documentFetcher';

export interface SearchResult {
  content: string;
  relevanceScore: number;
  source: {
    chapterId: string;
    chapterTitle: string;
    documentId: string;
    documentTitle: string;
    subjectId: string;
    subjectName: string;
  };
  metadata?: Record<string, any>;
}

export interface SearchOptions {
  subjectIds?: string[];
  documentIds?: string[];
  chapterIds?: string[];
  limit?: number;
  minRelevanceScore?: number;
  includeMetadata?: boolean;
}

export interface ContextResult {
  context: string;
  references: Array<{
    source: string;
    relevanceScore: number;
    excerpt: string;
    chapterId: string;
    documentId: string;
  }>;
}

/**
 * RAG Service for semantic search and context retrieval
 */
export class RAGService {
  private readonly defaultLimit = 5;
  private readonly minRelevanceScore = 0.7;
  private embeddingsService = createEmbeddingsService();

  /**
   * Search for relevant content across knowledge bases using semantic similarity
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    try {
      console.log(`🔍 RAG Search: "${query}" with options:`, options);

      // Use the embeddings service to search
      const searchResults = await this.embeddingsService.search({
        query,
        limit: options.limit || this.defaultLimit,
        threshold: options.minRelevanceScore || this.minRelevanceScore,
        subjectId: options.subjectIds && options.subjectIds.length === 1 ? options.subjectIds[0] : undefined
      });

      if (!searchResults || searchResults.length === 0) {
        console.warn('⚠️ No results from embeddings service');
        // Try fallback to text search
        return this.fallbackTextSearch(query, options);
      }

      console.log(`✅ Found ${searchResults.length} results from embeddings service`);

      // Enrich results with subject/document info
      const enrichedResults = await this.enrichSearchResults(searchResults);

      return enrichedResults;

    } catch (error) {
      console.error('Error in RAG search:', error);
      // Try fallback search
      return this.fallbackTextSearch(query, options);
    }
  }

  /**
   * Fetch full document content from knowledge bases for comprehensive lesson generation
   */
  async getFullDocumentContent(
    subjectIds: string[],
    options: {
      limitDocuments?: number;
      maxWordCount?: number;
    } = {}
  ): Promise<{ formattedContent: string; documents: DocumentContent[] }> {
    try {
      console.log(`📚 Fetching full document content for ${subjectIds.length} subjects`);

      // Fetch documents for these subjects
      const documents = await documentFetcher.fetchDocuments({
        subjectIds,
        includeContent: true
      });

      if (!documents || documents.length === 0) {
        console.log('⚠️ No documents found for subjects');
        return { formattedContent: '', documents: [] };
      }

      console.log(`✅ Fetched ${documents.length} documents`);

      // Limit documents if specified
      let limitedDocs = documents;
      if (options.limitDocuments && options.limitDocuments > 0) {
        limitedDocs = documents.slice(0, options.limitDocuments);
      }

      // Format for AI consumption
      const formattedContent = documentFetcher.formatForAI(limitedDocs);

      return {
        formattedContent,
        documents: limitedDocs
      };

    } catch (error) {
      console.error('Error fetching full document content:', error);
      return { formattedContent: '', documents: [] };
    }
  }

  /**
   * Retrieve relevant context from specified knowledge bases
   */
  async getRelevantContext(
    subjectIds: string[],
    query: string,
    limit: number = 5
  ): Promise<ContextResult> {
    try {
      const searchResults = await this.search(query, {
        subjectIds,
        limit,
        minRelevanceScore: this.minRelevanceScore
      });

      if (searchResults.length === 0) {
        return {
          context: '',
          references: []
        };
      }

      // Build context string from results
      let context = '\n\n--- Additional Context from Knowledge Base ---\n';
      const references: ContextResult['references'] = [];

      for (const result of searchResults) {
        context += `\nFrom ${result.source.subjectName} (${result.source.documentTitle}):\n`;
        context += `${result.content}\n`;

        references.push({
          source: `${result.source.subjectName} > ${result.source.documentTitle} > ${result.source.chapterTitle}`,
          relevanceScore: result.relevanceScore,
          excerpt: result.content.substring(0, 200) + '...',
          chapterId: result.source.chapterId,
          documentId: result.source.documentId
        });
      }

      return {
        context,
        references
      };

    } catch (error) {
      console.error('Error retrieving KB context:', error);
      return {
        context: '',
        references: []
      };
    }
  }

  /**
   * Add document content to the knowledge base (for indexing)
   */
  async indexDocument(
    chapterId: string,
    subjectId: string,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Split content into chunks
      const chunks = this.chunkContent(content);

      // Generate embeddings for each chunk
      const embeddings = await this.generateBatchEmbeddings(chunks);

      // Store embeddings in database
      await this.storeEmbeddings(chapterId, subjectId, chunks, embeddings, metadata);

      console.log(`Indexed ${chunks.length} chunks for chapter ${chapterId}`);

    } catch (error) {
      console.error('Error indexing document:', error);
      throw error;
    }
  }

  /**
   * Fallback text search when vector search fails
   * Searches directly in chapters table since embeddings may not exist
   */
  private async fallbackTextSearch(
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    try {
      console.log('🔄 Using fallback text search in chapters table...');

      // Extract keywords from query
      const keywords = query
        .split(/[:\s,.]+/)
        .filter(word => word.length > 3)
        .slice(0, 5); // Take first 5 keywords

      console.log('🔑 Searching with keywords:', keywords);

      // Get documents for the subject
      let docQuery = supabase
        .from('document_subjects')
        .select('document_id')
        .eq('subject_id', options.subjectIds?.[0] || '');

      const { data: docLinks } = await docQuery;
      const documentIds = docLinks?.map(link => link.document_id) || [];

      if (documentIds.length === 0) {
        console.warn('⚠️ No documents found for subject');
        return [];
      }

      // Search chapters directly
      let chapterQuery = supabase
        .from('chapters')
        .select('id, title, content, chapter_number, document_id')
        .in('document_id', documentIds)
        .limit(200); // Limit to avoid scanning too many

      const { data: chapters, error } = await chapterQuery;

      if (error) {
        console.error('Fallback search error:', error);
        return [];
      }

      if (!chapters || chapters.length === 0) {
        console.warn('⚠️ No chapters found');
        return [];
      }

      console.log(`📄 Scanning ${chapters.length} chapters...`);

      // Filter results by keyword matching
      const filteredResults = chapters.filter(chapter => {
        const content = (chapter.content || '').toLowerCase();
        return keywords.some(keyword =>
          content.includes(keyword.toLowerCase()) ||
          (chapter.title || '').toLowerCase().includes(keyword.toLowerCase())
        );
      });

      console.log(`🎯 Found ${filteredResults.length} matching chapters`);

      // Sort by relevance (simple score based on keyword matches)
      const scoredResults = filteredResults.map(chapter => {
        const content = (chapter.content || '').toLowerCase();
        const title = (chapter.title || '').toLowerCase();
        const score = keywords.reduce((acc, keyword) => {
          const keywordLower = keyword.toLowerCase();
          const contentMatches = (content.match(new RegExp(keywordLower, 'g')) || []).length;
          const titleMatches = (title.match(new RegExp(keywordLower, 'g')) || []).length;
          return acc + contentMatches + (titleMatches * 2); // Title matches worth more
        }, 0);

        return {
          ...chapter,
          score
        };
      });

      // Sort by score and limit results
      const topResults = scoredResults
        .sort((a, b) => b.score - a.score)
        .slice(0, options.limit || this.defaultLimit);

      console.log(`✅ Returning top ${topResults.length} results`);

      return await this.enrichSearchResults(
        topResults.map(chapter => ({
          // Use full content with GPT-4o's large context window
          content: chapter.content || '',
          score: Math.min((chapter.score || 1) / 20, 0.95), // Normalize score
          metadata: {
            chapterId: chapter.id,
            documentId: chapter.document_id
          }
        }))
      );

    } catch (error) {
      console.error('Error in fallback search:', error);
      return [];
    }
  }

  /**
   * Enrich search results with chapter, document, and subject information
   */
  private async enrichSearchResults(results: any[]): Promise<SearchResult[]> {
    try {
      if (results.length === 0) return [];

      // Get unique chapter IDs from results
      const chapterIds = [...new Set(results.map(r => r.metadata?.chapterId || r.chapter_id))];

      if (chapterIds.length === 0) {
        console.warn('No chapter IDs found in results');
        return [];
      }

      // Fetch chapter information
      const { data: chapters, error: chapterError } = await supabase
        .from('chapters')
        .select(`
          id,
          title,
          document_id,
          documents:document_id (
            id,
            title
          )
        `)
        .in('id', chapterIds);

      if (chapterError) throw chapterError;

      // Fetch subject information for all subjects
      const { data: subjects, error: subjectError } = await supabase
        .from('subjects')
        .select(`
          id,
          name,
          document_subjects!inner (
            document_id
          )
        `);

      if (subjectError) throw subjectError;

      // Create lookup maps
      const chapterMap = new Map(chapters?.map(ch => [ch.id, ch]) || []);
      const documentSubjectMap = new Map();
      subjects?.forEach(subject => {
        subject.document_subjects?.forEach((link: any) => {
          const docId = link.document_id;
          if (!documentSubjectMap.has(docId)) {
            documentSubjectMap.set(docId, []);
          }
          documentSubjectMap.get(docId).push(subject);
        });
      });

      // Build enriched results
      return results.map(result => {
        const chapterId = result.metadata?.chapterId || result.chapter_id;
        const subjectId = result.metadata?.subjectId || result.subject_id;
        const chapter = chapterMap.get(chapterId);
        const document = chapter?.documents;
        const documentSubjects = document ? documentSubjectMap.get(document.id) || [] : [];
        // Find the subject by ID
        const subject = subjects?.find(s => s.id === subjectId) || documentSubjects[0];

        return {
          content: result.content,
          relevanceScore: result.score || 0,
          source: {
            chapterId: chapterId,
            chapterTitle: chapter?.title || 'Unknown Chapter',
            documentId: document?.id || 'unknown',
            documentTitle: document?.title || 'Unknown Document',
            subjectId: subject?.id || 'unknown',
            subjectName: subject?.name || 'Unknown Subject'
          },
          metadata: result.metadata
        };
      });

    } catch (error) {
      console.error('Error enriching results:', error);
      return [];
    }
  }

  /**
   * Store embeddings in the database
   */
  private async storeEmbeddings(
    chapterId: string,
    subjectId: string,
    chunks: string[],
    embeddings: number[][],
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      // Prepare records for insertion
      const records = chunks.map((content, index) => ({
        chapter_id: chapterId,
        subject_id: subjectId,
        content_chunk: content,
        embedding: embeddings[index], // PostgreSQL will convert array to vector
        metadata: {
          ...metadata,
          chunkIndex: index,
          created_at: new Date().toISOString()
        }
      }));

      // Batch insert
      const { error } = await supabase
        .from('embeddings')
        .insert(records);

      if (error) {
        console.warn('Batch insert failed, trying individual inserts:', error);

        // Fallback to individual inserts
        for (const record of records) {
          const { error: insertError } = await supabase
            .from('embeddings')
            .insert(record);

          if (insertError) {
            console.error('Error inserting embedding:', insertError);
          }
        }
      }

      console.log(`Stored ${records.length} embeddings for chapter ${chapterId}`);

    } catch (error) {
      console.error('Error storing embeddings:', error);
      throw error;
    }
  }

  /**
   * Chunk content into smaller pieces for embedding
   */
  private chunkContent(content: string, chunkSize: number = 1000): string[] {
    const chunks: string[] = [];
    const words = content.split(/\s+/);

    let currentChunk = '';
    for (const word of words) {
      if ((currentChunk + ' ' + word).length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = word;
      } else {
        currentChunk += ' ' + word;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

// Export singleton instance
export const ragService = new RAGService();
