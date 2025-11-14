import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMService, LLMRequest, LLMResponse } from './types';

export class GeminiService implements LLMService {
  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'gemini-pro') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const model = this.client.getGenerativeModel({
      model: this.modelName,
      systemInstruction: request.systemPrompt,
    });

    let prompt = request.prompt;
    if (request.context) {
      prompt = `Context: ${request.context}\n\n${prompt}`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    return {
      content,
      tokensUsed: 0, // Gemini doesn't return token count in the same way
      model: this.modelName,
      raw: result,
    };
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    return this.generate(request);
  }

  async *stream(request: LLMRequest): AsyncIterableIterator<string> {
    const model = this.client.getGenerativeModel({
      model: this.modelName,
      systemInstruction: request.systemPrompt,
    });

    let prompt = request.prompt;
    if (request.context) {
      prompt = `Context: ${request.context}\n\n${prompt}`;
    }

    const result = await model.generateContentStream(prompt);
    const stream = result.stream;

    for await (const chunk of stream) {
      const content = chunk.text();
      if (content) {
        yield content;
      }
    }
  }
}
