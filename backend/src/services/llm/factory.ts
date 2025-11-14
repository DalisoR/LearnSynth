import config from '../../config/config';
import { LLMService } from './types';
import { StubLLMService } from './stub';
import { OpenAIService } from './openai';
import { GeminiService } from './gemini';

export function createLLMService(): LLMService {
  switch (config.llm.provider) {
    case 'openai':
      if (!config.llm.apiKey) {
        throw new Error('OpenAI API key not configured');
      }
      return new OpenAIService(config.llm.apiKey, config.llm.model);

    case 'gemini':
      if (!config.llm.apiKey) {
        throw new Error('Gemini API key not configured');
      }
      return new GeminiService(config.llm.apiKey, config.llm.model);

    case 'stub':
    default:
      return new StubLLMService();
  }
}

// Export a singleton instance for use across the application
export const llmService: LLMService = createLLMService();
