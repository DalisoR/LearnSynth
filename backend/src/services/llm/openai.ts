import OpenAI from 'openai';
import { LLMService, LLMRequest, LLMResponse } from './types';

export class OpenAIService implements LLMService {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-3.5-turbo') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    }

    if (request.context) {
      messages.push({
        role: 'system',
        content: `Additional context: ${request.context}`,
      });
    }

    messages.push({
      role: 'user',
      content: request.prompt,
    });

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature || 0.7,
    });

    const choice = completion.choices[0];
    const content = choice.message.content || '';

    return {
      content,
      tokensUsed: completion.usage?.total_tokens || 0,
      model: this.model,
      raw: completion,
    };
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    return this.generate(request);
  }

  async *stream(request: LLMRequest): AsyncIterableIterator<string> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    if (request.context) {
      messages.push({ role: 'system', content: `Additional context: ${request.context}` });
    }

    messages.push({ role: 'user', content: request.prompt });

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      stream: true,
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature || 0.7,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}
