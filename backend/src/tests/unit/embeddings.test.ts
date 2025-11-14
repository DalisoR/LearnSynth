import { StubEmbeddingsService } from '../../services/embeddings/stub';

describe('StubEmbeddingsService', () => {
  let service: StubEmbeddingsService;

  beforeEach(() => {
    service = new StubEmbeddingsService();
  });

  describe('embed', () => {
    it('should generate consistent embeddings for the same text', async () => {
      const text = 'This is a test sentence';

      const result1 = await service.embed({ text });
      const result2 = await service.embed({ text });

      expect(result1.embedding).toEqual(result2.embedding);
      expect(result1.dimensions).toBe(1536);
    });

    it('should generate different embeddings for different texts', async () => {
      const result1 = await service.embed({ text: 'This is test one' });
      const result2 = await service.embed({ text: 'This is test two' });

      expect(result1.embedding).not.toEqual(result2.embedding);
    });

    it('should generate embeddings with correct dimensions', async () => {
      const result = await service.embed({ text: 'Test' });

      expect(result.embedding).toHaveLength(1536);
      expect(result.embedding.every(v => typeof v === 'number')).toBe(true);
    });
  });

  describe('search', () => {
    it('should return search results with scores', async () => {
      const result = await service.search({
        query: 'machine learning',
        limit: 5,
      });

      expect(result).toHaveLength(3);
      result.forEach(item => {
        expect(item.content).toBeDefined();
        expect(item.score).toBeGreaterThan(0);
        expect(item.score).toBeLessThanOrEqual(1);
      });
    });

    it('should filter results by threshold', async () => {
      const result = await service.search({
        query: 'machine learning',
        limit: 10,
        threshold: 0.9,
      });

      result.forEach(item => {
        expect(item.score).toBeGreaterThanOrEqual(0.9);
      });
    });
  });
});
