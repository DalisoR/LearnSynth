import { VisualAid } from '../lessonGenerator/types';
import logger from '../../utils/logger';

export class VisualContentGenerator {
  private imageGenerationService: 'stub' | 'openai' | 'stability';

  constructor(service: 'stub' | 'openai' | 'stability' = 'stub') {
    this.imageGenerationService = service;
  }

  async generateVisual(visualAid: VisualAid): Promise<VisualAid> {
    logger.info('Generating visual: ' + visualAid.title);

    try {
      // In a real implementation, you would call an image generation service here
      // For now, we'll return the prompt and metadata

      const enhancedPrompt = this.enhancePrompt(visualAid);

      return {
        ...visualAid,
        prompt: enhancedPrompt,
        // In production, this would be the generated image URL
        // url: await this.callImageService(enhancedPrompt)
      };
    } catch (error) {
      logger.error('Error generating visual:', error);
      throw error;
    }
  }

  async generateBatch(visualAids: VisualAid[]): Promise<VisualAid[]> {
    logger.info('Generating ' + visualAids.length + ' visuals in batch');

    const results = await Promise.allSettled(
      visualAids.map(v => this.generateVisual(v))
    );

    const successful = results
      .filter((r): r is PromiseFulfilledResult<VisualAid> => r.status === 'fulfilled')
      .map(r => r.value);

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      logger.warn(failed.length + ' visuals failed to generate');
    }

    return successful;
  }

  private enhancePrompt(visualAid: VisualAid): string {
    const basePrompt = visualAid.prompt;
    const styleInstructions = this.getStyleInstructions(visualAid.type);

    return basePrompt + '. ' + styleInstructions + '. High quality, educational, clear labels, easy to understand.';
  }

  private getStyleInstructions(type: string): string {
    switch (type) {
      case 'diagram':
        return 'Clean diagram style with clear lines, labels, and annotations. Use arrows to show flow or relationships.';

      case 'chart':
        return 'Professional chart with clear axes, labels, and legend. Use appropriate colors for clarity.';

      case 'illustration':
        return 'Friendly, engaging illustration style. Use bright colors and simple shapes. Make it approachable and easy to understand.';

      case 'infographic':
        return 'Modern infographic design with icons, minimal text, and clear hierarchy. Use a clean color palette.';

      case 'diagram-mermaid':
        return 'Technical diagram format suitable for flowchart or system architecture visualization.';

      default:
        return 'Clean, educational style with clear visuals and labels.';
    }
  }

  // Placeholder for actual image generation service call
  private async callImageService(prompt: string): Promise<string> {
    switch (this.imageGenerationService) {
      case 'openai':
        // Would call OpenAI DALL-E API
        throw new Error('OpenAI image generation not yet implemented');

      case 'stability':
        // Would call Stability AI API
        throw new Error('Stability AI image generation not yet implemented');

      case 'stub':
      default:
        // Return a placeholder URL
        return 'https://via.placeholder.com/800x600/000000/FFFFFF?text=' + encodeURIComponent(prompt.substring(0, 30));
    }
  }

  // Utility to create a simple diagram from structured data
  createSimpleDiagram(title: string, data: any): VisualAid {
    const diagramContent = this.formatDiagramData(data);

    return {
      type: 'diagram',
      title,
      description: 'Diagram showing ' + title,
      content: diagramContent,
      prompt: 'Create a clear educational diagram titled "' + title + '" showing: ' + diagramContent,
    };
  }

  // Utility to create a chart from data
  createChart(title: string, chartType: 'bar' | 'line' | 'pie', data: any): VisualAid {
    return {
      type: 'chart',
      title,
      description: 'Chart showing ' + title,
      content: JSON.stringify({ chartType, data }),
      prompt: 'Create a ' + chartType + ' chart titled "' + title + '" with the provided data. Clean, professional style with clear labels.',
    };
  }

  private formatDiagramData(data: any): string {
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  }
}
