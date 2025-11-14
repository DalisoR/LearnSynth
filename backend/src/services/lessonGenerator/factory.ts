import { ComprehensiveLessonGenerator } from './comprehensiveLessonGenerator';
import { createLLMService } from '../llm/factory';

export function createComprehensiveLessonGenerator(): ComprehensiveLessonGenerator {
  const llmService = createLLMService();
  return new ComprehensiveLessonGenerator(llmService);
}
