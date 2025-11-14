export interface SearchQuery {
  text: string;
  subjectId?: string;
  documentIds?: string[];
  knowledgeBaseId?: string;
  filters?: {
    difficulty?: number[];
    chapter?: string;
    topics?: string[];
  };
}

export interface SearchResult {
  content: string;
  metadata: {
    documentId: string;
    documentName: string;
    chapter?: string;
    page?: number;
    subjectId?: string;
    topics: string[];
    difficulty: number;
    sourceType: 'pdf' | 'docx' | 'generated';
    relevanceScore: number;
    recencyScore: number;
    authorityScore: number;
    tokenCount: number;
  };
}

export interface ContextResult {
  chunks: SearchResult[];
  totalTokens: number;
  sources: {
    documentId: string;
    documentName: string;
    chunks: number;
    contributionScore: number;
  }[];
  concepts: {
    [conceptName: string]: {
      frequency: number;
      sources: string[];
      agreement: 'consensus' | 'mixed' | 'conflicting';
    };
  };
  conflicts: {
    concept: string;
    sources: {
      documentId: string;
      position: string;
      claim: string;
    }[];
  }[];
}

export interface QueryExpansion {
  primary: string[];
  related: string[];
  synonyms: string[];
  questions: string[];
}

export interface RAGConfig {
  maxTokens: number;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  similarityThreshold: number;
  expandQueries: boolean;
  useHybridSearch: boolean;
  includeMetadata: boolean;
}
