export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  tokensUsed: number;
  model: string;
  raw?: any;
}

export interface LLMService {
  generate(request: LLMRequest): Promise<LLMResponse>;
  complete(request: LLMRequest): Promise<LLMResponse>;
  stream?(request: LLMRequest): AsyncIterableIterator<string>;
}

export interface LessonGenerationRequest {
  chapterTitle: string;
  chapterContent: string;
  chapterNumber: number;
  contextFromKB?: string;
}

export interface ChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  kbContext?: string;
}
