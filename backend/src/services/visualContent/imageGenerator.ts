import { VisualPrompt, GeneratedVisual } from './types';

export interface ImageGenerationProvider {
  generateImage(prompt: string, options?: any): Promise<GeneratedVisual>;
  batchGenerate(prompts: VisualPrompt[]): Promise<GeneratedVisual[]>;
}

export class DalleImageProvider implements ImageGenerationProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.DALLE_API_KEY || '';
  }

  async generateImage(prompt: VisualPrompt, options?: any): Promise<GeneratedVisual> {
    // Placeholder for DALL-E integration
    // In production, would use OpenAI's DALL-E API

    const enhancedPrompt = this.enhancePromptForDALLE(prompt);

    // Simulate API call
    await this.delay(2000);

    return {
      id: this.generateId(),
      promptId: prompt.id || 'unknown',
      type: prompt.type,
      url: `https://generated-visual.example.com/${this.generateId()}.png`,
      altText: prompt.description,
      caption: this.generateCaption(prompt),
      metadata: {
        width: 1024,
        height: 768,
        format: 'PNG',
        size: 512000
      },
      qualityScore: 0.85,
      createdAt: new Date()
    };
  }

  async batchGenerate(prompts: VisualPrompt[]): Promise<GeneratedVisual[]> {
    const results: GeneratedVisual[] = [];

    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < prompts.length; i += batchSize) {
      const batch = prompts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(prompt => this.generateImage(prompt, {}))
      );
      results.push(...batchResults);

      // Delay between batches
      if (i + batchSize < prompts.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  private enhancePromptForDALLE(prompt: VisualPrompt): string {
    let enhanced = prompt.description;

    // Add educational style keywords
    enhanced += ', educational diagram, clean design, clear labels, professional style';

    // Add style specifications
    if (prompt.style?.theme) {
      enhanced += `, ${prompt.style.theme} theme`;
    }

    if (prompt.style?.colors) {
      enhanced += `, colors: ${prompt.style.colors.join(', ')}`;
    }

    // Add technical specifications
    enhanced += ', high quality, detailed, suitable for learning';

    return enhanced;
  }

  private generateCaption(prompt: VisualPrompt): string {
    const captions = {
      diagram: 'This diagram illustrates the relationships between key concepts.',
      chart: 'This chart presents data in a visual format for easy comparison.',
      infographic: 'This infographic summarizes important information about the topic.',
      illustration: 'This illustration provides a visual representation of the concept.',
      flowchart: 'This flowchart shows the step-by-step process or decision flow.',
      mindmap: 'This mind map organizes related ideas around the central topic.',
      comparison: 'This comparison highlights similarities and differences.'
    };

    return captions[prompt.type] || 'This visual aids in understanding the topic.';
  }

  private generateId(): string {
    return `vis_${Math.random().toString(36).substring(2, 15)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class StableDiffusionProvider implements ImageGenerationProvider {
  private apiKey: string;
  private endpoint: string;

  constructor() {
    this.apiKey = process.env.STABILITY_API_KEY || '';
    this.endpoint = process.env.STABILITY_ENDPOINT || 'https://api.stability.ai';
  }

  async generateImage(prompt: VisualPrompt, options?: any): Promise<GeneratedVisual> {
    // Placeholder for Stable Diffusion integration
    // In production, would use Stability AI API

    const enhancedPrompt = this.enhancePromptForSD(prompt);

    await this.delay(3000);

    return {
      id: this.generateId(),
      promptId: prompt.id || 'unknown',
      type: prompt.type,
      url: `https://generated-visual.example.com/${this.generateId()}.png`,
      altText: prompt.description,
      caption: this.generateCaption(prompt),
      metadata: {
        width: 1024,
        height: 1024,
        format: 'PNG',
        size: 768000
      },
      qualityScore: 0.88,
      createdAt: new Date()
    };
  }

  async batchGenerate(prompts: VisualPrompt[]): Promise<GeneratedVisual[]> {
    const results: GeneratedVisual[] = [];

    for (const prompt of prompts) {
      const result = await this.generateImage(prompt);
      results.push(result);
      await this.delay(500); // Rate limiting
    }

    return results;
  }

  private enhancePromptForSD(prompt: VisualPrompt): string {
    let enhanced = prompt.description;

    // Add SD-specific keywords
    enhanced += ', educational content, clear visualization, professional diagram';

    if (prompt.style?.theme === 'minimal') {
      enhanced += ', minimalist design, clean, simple';
    } else if (prompt.style?.theme === 'academic') {
      enhanced += ', academic style, textbook illustration, scholarly';
    } else {
      enhanced += ', modern design, engaging, informative';
    }

    if (prompt.style?.colors) {
      enhanced += `, color palette: ${prompt.style.colors.join(', ')}`;
    }

    enhanced += ', high resolution, detailed, 4K';

    return enhanced;
  }

  private generateCaption(prompt: VisualPrompt): string {
    return this.generateCaption(prompt);
  }

  private generateId(): string {
    return `sd_${Math.random().toString(36).substring(2, 15)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class ImageGenerationService {
  private providers: Map<string, ImageGenerationProvider> = new Map();

  constructor() {
    // Register providers based on environment
    const dalleKey = process.env.DALLE_API_KEY;
    const stabilityKey = process.env.STABILITY_API_KEY;

    if (dalleKey) {
      this.providers.set('dalle', new DalleImageProvider());
    }

    if (stabilityKey) {
      this.providers.set('stable-diffusion', new StableDiffusionProvider());
    }

    // Default to mock provider if no keys
    if (this.providers.size === 0) {
      this.providers.set('mock', new MockImageProvider());
    }
  }

  async generateVisuals(prompts: VisualPrompt[]): Promise<GeneratedVisual[]> {
    // Use first available provider
    const providerName = this.getPreferredProvider();
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`No image generation provider available`);
    }

    console.log(`Generating ${prompts.length} visuals using ${providerName}...`);

    const results = await provider.batchGenerate(prompts);

    // Quality filtering
    const highQuality = results.filter(r => (r.qualityScore || 0) > 0.7);

    console.log(`Generated ${results.length} visuals, ${highQuality.length} passed quality check`);

    return highQuality;
  }

  async generateSingleVisual(prompt: VisualPrompt): Promise<GeneratedVisual> {
    const provider = this.providers.get(this.getPreferredProvider());
    if (!provider) {
      throw new Error('No image generation provider available');
    }

    return provider.generateImage(prompt);
  }

  private getPreferredProvider(): string {
    // Priority: DALLE > Stable Diffusion > Mock
    if (this.providers.has('dalle')) return 'dalle';
    if (this.providers.has('stable-diffusion')) return 'stable-diffusion';
    return 'mock';
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

class MockImageProvider implements ImageGenerationProvider {
  async generateImage(prompt: VisualPrompt): Promise<GeneratedVisual> {
    await this.delay(1500);

    return {
      id: this.generateId(),
      promptId: prompt.id || 'unknown',
      type: prompt.type,
      url: `https://via.placeholder.com/1024x768/3b82f6/ffffff?text=${encodeURIComponent(prompt.type.toUpperCase())}`,
      altText: prompt.description,
      caption: this.generateCaption(prompt),
      metadata: {
        width: 1024,
        height: 768,
        format: 'PNG',
        size: 45000
      },
      qualityScore: 0.75,
      createdAt: new Date()
    };
  }

  async batchGenerate(prompts: VisualPrompt[]): Promise<GeneratedVisual[]> {
    const results: GeneratedVisual[] = [];

    for (const prompt of prompts) {
      const result = await this.generateImage(prompt);
      results.push(result);
    }

    return results;
  }

  private generateCaption(prompt: VisualPrompt): string {
    const captions: { [key: string]: string } = {
      diagram: 'This diagram illustrates the relationships between key concepts.',
      chart: 'This chart presents data in a visual format.',
      infographic: 'This infographic summarizes important information.',
      illustration: 'This illustration provides a visual representation.',
      flowchart: 'This flowchart shows the process or decision flow.',
      mindmap: 'This mind map organizes related ideas.',
      comparison: 'This comparison highlights similarities and differences.'
    };

    return captions[prompt.type] || 'This visual aids in understanding.';
  }

  private generateId(): string {
    return `mock_${Math.random().toString(36).substring(2, 15)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const imageGenerationService = new ImageGenerationService();
