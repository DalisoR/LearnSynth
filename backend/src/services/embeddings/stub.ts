import { EmbeddingsService, EmbeddingRequest, EmbeddingResponse, VectorSearchRequest, VectorSearchResult } from './types';

// Simple deterministic hash function to generate consistent "embeddings" for the same text
function hashToVector(text: string, dimensions: number): number[] {
  const vector: number[] = new Array(dimensions).fill(0);
  const words = text.toLowerCase().split(/\s+/);

  words.forEach((word, index) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vector[idx] += 1;
  });

  // Normalize
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map(val => val / norm);
}

export class StubEmbeddingsService implements EmbeddingsService {
  private dimensions = 1536;
  private model = 'stub-embedding-v1';

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const embedding = hashToVector(request.text, this.dimensions);

    return {
      embedding,
      model: this.model,
      dimensions: this.dimensions,
    };
  }

  async search(request: VectorSearchRequest): Promise<VectorSearchResult[]> {
    // Simulate search results with deterministic scores
    const results: VectorSearchResult[] = [
      {
        content: `This is a relevant snippet about ${request.query}. The context shows detailed information that directly relates to your question.`,
        score: 0.95,
        metadata: {
          chapterId: 'ch-1',
          source: 'Chapter 1: Introduction',
        },
      },
      {
        content: `Additional context regarding ${request.query} can be found here. This information builds upon the previous concepts.`,
        score: 0.87,
        metadata: {
          chapterId: 'ch-2',
          source: 'Chapter 2: Fundamentals',
        },
      },
      {
        content: `Another relevant point about ${request.query} demonstrates the practical application of these principles.`,
        score: 0.78,
        metadata: {
          chapterId: 'ch-3',
          source: 'Chapter 3: Applications',
        },
      },
    ];

    // Filter by threshold if specified
    if (request.threshold) {
      return results.filter(r => r.score >= request.threshold);
    }

    return results.slice(0, request.limit || 5);
  }
}
