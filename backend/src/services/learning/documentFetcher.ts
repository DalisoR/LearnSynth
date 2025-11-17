/**
 * Document Fetcher Service
 * Retrieves full document content from knowledge bases for AI processing
 */

import { supabase } from '../supabase';

export interface DocumentContent {
  documentId: string;
  documentTitle: string;
  subjectId: string;
  subjectName: string;
  chapters: Array<{
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string;
    content: string;
    wordCount: number;
  }>;
}

export interface FetchOptions {
  subjectIds?: string[];
  documentIds?: string[];
  chapterIds?: string[];
  includeContent?: boolean; // Whether to include full content or just metadata
  maxWordCount?: number; // Limit content length
}

/**
 * Service to fetch document content from knowledge bases
 */
export class DocumentFetcher {
  /**
   * Fetch document content from knowledge bases
   */
  async fetchDocuments(options: FetchOptions = {}): Promise<DocumentContent[]> {
    try {
      console.log('📄 Fetching documents with options:', options);

      // Build query
      let query = supabase
        .from('documents')
        .select(`
          id,
          title,
          document_subjects(
            subject_id,
            subjects(
              id,
              name
            )
          )
        `);

      // Apply filters
      if (options.documentIds && options.documentIds.length > 0) {
        query = query.in('id', options.documentIds);
      }

      const { data: documents, error: docError } = await query;

      if (docError) throw docError;
      if (!documents || documents.length === 0) {
        console.log('No documents found');
        return [];
      }

      // Filter by subjects if specified
      let filteredDocs = documents;
      if (options.subjectIds && options.subjectIds.length > 0) {
        filteredDocs = documents.filter(doc =>
          doc.document_subjects?.some((link: any) =>
            options.subjectIds?.includes(link.subject_id)
          )
        );
      }

      console.log(`Found ${filteredDocs.length} documents`);

      // Fetch chapters for each document
      const documentContents: DocumentContent[] = [];

      for (const doc of filteredDocs) {
        const { data: chapters, error: chapterError } = await supabase
          .from('chapters')
          .select('id, chapter_number, title, content, word_count')
          .eq('document_id', doc.id)
          .order('chapter_number', { ascending: true });

        if (chapterError) {
          console.error(`Error fetching chapters for document ${doc.id}:`, chapterError);
          continue;
        }

        // Get subject info
        const subject = doc.document_subjects?.[0]?.subjects;

        documentContents.push({
          documentId: doc.id,
          documentTitle: doc.title,
          subjectId: subject?.id || '',
          subjectName: subject?.name || 'Unknown Subject',
          chapters: (chapters || []).map(ch => ({
            chapterId: ch.id,
            chapterNumber: ch.chapter_number,
            chapterTitle: ch.title,
            content: options.includeContent !== false ? ch.content : '',
            wordCount: ch.word_count
          }))
        });
      }

      console.log(`✅ Fetched content for ${documentContents.length} documents with ${documentContents.reduce((sum, doc) => sum + doc.chapters.length, 0)} chapters`);

      return documentContents;

    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  }

  /**
   * Fetch specific chapters by IDs
   */
  async fetchChapters(chapterIds: string[]): Promise<DocumentContent[]> {
    try {
      console.log(`📄 Fetching ${chapterIds.length} specific chapters`);

      // First get chapter info with document and subject
      const { data: chapters, error: chapterError } = await supabase
        .from('chapters')
        .select(`
          id,
          chapter_number,
          title,
          content,
          word_count,
          document_id,
          documents(
            id,
            title,
            document_subjects(
              subject_id,
              subjects(
                id,
                name
              )
            )
          )
        `)
        .in('id', chapterIds);

      if (chapterError) throw chapterError;
      if (!chapters || chapters.length === 0) return [];

      // Group chapters by document
      const docMap = new Map<string, DocumentContent>();

      for (const ch of chapters) {
        const doc = ch.documents;
        if (!doc) continue;

        const subject = doc.document_subjects?.[0]?.subjects;

        if (!docMap.has(doc.id)) {
          docMap.set(doc.id, {
            documentId: doc.id,
            documentTitle: doc.title,
            subjectId: subject?.id || '',
            subjectName: subject?.name || 'Unknown Subject',
            chapters: []
          });
        }

        docMap.get(doc.id)!.chapters.push({
          chapterId: ch.id,
          chapterNumber: ch.chapter_number,
          chapterTitle: ch.title,
          content: ch.content,
          wordCount: ch.word_count
        });
      }

      return Array.from(docMap.values());

    } catch (error) {
      console.error('Error fetching chapters:', error);
      return [];
    }
  }

  /**
   * Get document statistics for a knowledge base
   */
  async getDocumentStats(subjectId: string): Promise<{
    documentCount: number;
    chapterCount: number;
    totalWordCount: number;
  }> {
    try {
      // Get documents for this subject
      const { data: docLinks, error: linkError } = await supabase
        .from('document_subjects')
        .select('document_id')
        .eq('subject_id', subjectId);

      if (linkError) throw linkError;

      const documentIds = docLinks?.map(link => link.document_id) || [];

      if (documentIds.length === 0) {
        return { documentCount: 0, chapterCount: 0, totalWordCount: 0 };
      }

      // Get chapter counts and word counts
      const { data: chapters, error: chapterError } = await supabase
        .from('chapters')
        .select('word_count')
        .in('document_id', documentIds);

      if (chapterError) throw chapterError;

      const totalWordCount = chapters?.reduce((sum, ch) => sum + (ch.word_count || 0), 0) || 0;

      return {
        documentCount: documentIds.length,
        chapterCount: chapters?.length || 0,
        totalWordCount
      };

    } catch (error) {
      console.error('Error getting document stats:', error);
      return { documentCount: 0, chapterCount: 0, totalWordCount: 0 };
    }
  }

  /**
   * Format document content for AI consumption
   */
  formatForAI(documentContents: DocumentContent[]): string {
    let formatted = '\n\n========== KNOWLEDGE BASE CONTENT ==========\n\n';

    for (const doc of documentContents) {
      formatted += `\n--- ${doc.documentTitle} (${doc.subjectName}) ---\n\n`;

      for (const chapter of doc.chapters) {
        if (chapter.content && chapter.content.trim().length > 0) {
          formatted += `### Chapter ${chapter.chapterNumber}: ${chapter.chapterTitle}\n\n`;
          formatted += `${chapter.content}\n\n`;
        }
      }
    }

    formatted += '\n========== END KNOWLEDGE BASE CONTENT ==========\n\n';

    return formatted;
  }
}

// Export singleton instance
export const documentFetcher = new DocumentFetcher();
