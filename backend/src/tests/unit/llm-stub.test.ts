import { StubLLMService } from '../../services/llm/stub';
import { LLMRequest } from '../../services/llm/types';

describe('StubLLMService', () => {
  let service: StubLLMService;

  beforeEach(() => {
    service = new StubLLMService();
  });

  describe('generate', () => {
    it('should generate a lesson for lesson prompts', async () => {
      const request: LLMRequest = {
        prompt: 'Generate a lesson for chapter 1 about introduction',
      };

      const response = await service.generate(request);

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.tokensUsed).toBeGreaterThan(0);
      expect(JSON.parse(response.content)).toHaveProperty('lesson_title');
    });

    it('should generate a chat response for chat prompts', async () => {
      const request: LLMRequest = {
        prompt: 'What is photosynthesis?',
      };

      const response = await service.generate(request);

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.tokensUsed).toBeGreaterThan(0);
    });

    it('should generate a generic response for other prompts', async () => {
      const request: LLMRequest = {
        prompt: 'Tell me about the weather',
      };

      const response = await service.generate(request);

      expect(response).toBeDefined();
      expect(response.content).toContain('Stub response');
    });
  });
});
