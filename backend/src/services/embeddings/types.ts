export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimensions: number;
}

export interface VectorSearchRequest {
  query: string;
  subjectId?: string;
  limit?: number;
  threshold?: number;
}

export interface VectorSearchResult {
  content: string;
  score: number;
  metadata: {
    chapterId?: string;
    subjectId?: string;
    source: string;
  };
}

export interface EmbeddingsService {
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  search(request: VectorSearchRequest): Promise<VectorSearchResult[]>;
}
