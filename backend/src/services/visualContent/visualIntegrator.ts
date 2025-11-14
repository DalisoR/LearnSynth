import { VisualPrompt, GeneratedVisual, LessonStructure, Topic } from './types';
import { imageGenerationService } from './imageGenerator';
import { EducationalPromptGenerator } from './promptGenerator';
import { diagramEngine } from './diagramEngine';
import { supabase } from '../supabase';

export interface VisualIntegrationResult {
  lesson: LessonStructure;
  generatedVisuals: GeneratedVisual[];
  integrationStats: {
    totalPrompts: number;
    successfulGenerations: number;
    failedGenerations: number;
    totalCost: number;
  };
}

export class VisualContentIntegrator {
  private promptGenerator: EducationalPromptGenerator;
  private imageService: any;

  constructor() {
    this.promptGenerator = new EducationalPromptGenerator();
    this.imageService = imageGenerationService;
  }

  async integrateVisuals(
    lesson: LessonStructure,
    config: {
      subject?: string;
      maxVisuals?: number;
      generateDiagrams?: boolean;
      storeInDatabase?: boolean;
    }
  ): Promise<VisualIntegrationResult> {
    const maxVisuals = config.maxVisuals || 8;

    // Step 1: Generate visual prompts
    console.log('Generating visual prompts...');
    const prompts = await this.promptGenerator.generateVisualPrompts(lesson, config);

    console.log(`Generated ${prompts.length} visual prompts`);

    // Step 2: Generate images
    console.log('Generating visual content...');
    const selectedPrompts = prompts.slice(0, maxVisuals);
    const generatedVisuals = await this.imageService.generateVisuals(selectedPrompts);

    // Step 3: Generate SVG diagrams (for certain types)
    const diagramPrompts = selectedPrompts.filter(p =>
      ['diagram', 'flowchart', 'mindmap', 'comparison'].includes(p.type)
    );

    const svgDiagrams = await this.generateSVGs(diagramPrompts);

    // Step 4: Attach visuals to lesson
    console.log('Integrating visuals into lesson...');
    const enrichedLesson = await this.attachVisualsToLesson(
      lesson,
      generatedVisuals,
      svgDiagrams
    );

    // Step 5: Store in database if requested
    if (config.storeInDatabase !== false) {
      await this.storeVisualsInDatabase(generatedVisuals, svgDiagrams);
    }

    const stats = {
      totalPrompts: prompts.length,
      successfulGenerations: generatedVisuals.length + svgDiagrams.length,
      failedGenerations: prompts.length - generatedVisuals.length,
      totalCost: this.calculateTotalCost(generatedVisuals)
    };

    console.log('Visual integration complete:', stats);

    return {
      lesson: enrichedLesson,
      generatedVisuals: [...generatedVisuals, ...svgDiagrams],
      integrationStats: stats
    };
  }

  private async generateSVGs(prompts: VisualPrompt[]): Promise<GeneratedVisual[]> {
    const diagrams: GeneratedVisual[] = [];

    for (const prompt of prompts) {
      try {
        let svgContent = '';

        switch (prompt.type) {
          case 'flowchart':
            // Generate a simple flowchart
            svgContent = diagramEngine.generateFlowchartSVG({
              steps: [
                { id: '1', label: 'Start', type: 'start' },
                { id: '2', label: 'Process', type: 'process' },
                { id: '3', label: 'Decision', type: 'decision' },
                { id: '4', label: 'End', type: 'end' }
              ],
              connections: [
                { from: '1', to: '2' },
                { from: '2', to: '3' },
                { from: '3', to: '4' }
              ]
            });
            break;

          case 'mindmap':
            svgContent = diagramEngine.generateMindMapSVG({
              centralTopic: prompt.keywords[0] || 'Topic',
              branches: prompt.keywords.slice(1, 6).map(k => ({
                topic: k,
                subtopics: []
              }))
            });
            break;

          case 'diagram':
          case 'comparison':
            svgContent = diagramEngine.generateSVG({
              nodes: prompt.keywords.slice(0, 5).map((k, i) => ({
                id: `node-${i}`,
                label: k,
                position: {
                  x: 200 + (i % 3) * 200,
                  y: 150 + Math.floor(i / 3) * 150
                }
              })),
              edges: []
            });
            break;
        }

        if (svgContent) {
          diagrams.push({
            id: `svg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            promptId: prompt.id || '',
            type: prompt.type,
            url: `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`,
            altText: prompt.description,
            caption: this.generateCaption(prompt.type),
            metadata: {
              width: 1024,
              height: 768,
              format: 'SVG',
              size: svgContent.length
            },
            qualityScore: 0.9,
            createdAt: new Date()
          });
        }
      } catch (error) {
        console.error(`Error generating SVG for ${prompt.type}:`, error);
      }
    }

    return diagrams;
  }

  private async attachVisualsToLesson(
    lesson: LessonStructure,
    imageVisuals: GeneratedVisual[],
    svgVisuals: GeneratedVisual[]
  ): Promise<LessonStructure> {
    const allVisuals = [...imageVisuals, ...svgVisuals];
    const enrichedLesson = JSON.parse(JSON.stringify(lesson));

    // Assign visuals to topics
    let visualIndex = 0;
    for (const topic of enrichedLesson.topics) {
      // Find or create visualPrompts array
      if (!topic.visualPrompts) {
        topic.visualPrompts = [];
      }

      // Add 2-3 visuals per topic
      const visualsPerTopic = Math.min(3, allVisuals.length - visualIndex);

      for (let i = 0; i < visualsPerTopic; i++) {
        const visual = allVisuals[visualIndex++];

        topic.visualPrompts.push({
          type: visual.type as any,
          description: visual.altText,
          complexity: 'moderate',
          purpose: visual.caption,
          keywords: [topic.title],
          generatedVisual: visual
        });
      }

      // Insert visual placeholders into content
      if (topic.visualPrompts.length > 0) {
        const visualSection = this.createVisualSection(topic.visualPrompts);
        topic.content.core += '\n\n' + visualSection;
      }
    }

    return enrichedLesson;
  }

  private createVisualSection(visuals: any[]): string {
    let section = '\n\n## Visual Aids\n\n';

    visuals.forEach((visual, index) => {
      section += `### Visual ${index + 1}: ${visual.purpose}\n\n`;
      section += `![${visual.description}](${visual.generatedVisual.url})\n\n`;
      section += `${visual.caption}\n\n`;
    });

    return section;
  }

  private async storeVisualsInDatabase(
    imageVisuals: GeneratedVisual[],
    svgVisuals: GeneratedVisual[]
  ): Promise<void> {
    const allVisuals = [...imageVisuals, ...svgVisuals];

    for (const visual of allVisuals) {
      try {
        // Store visual metadata in database
        const { error } = await supabase
          .from('lesson_visuals')
          .insert({
            id: visual.id,
            type: visual.type,
            url: visual.url,
            alt_text: visual.altText,
            caption: visual.caption,
            metadata: visual.metadata,
            created_at: visual.createdAt
          });

        if (error) {
          console.error('Error storing visual:', error);
        }
      } catch (error) {
        console.error('Error storing visual:', error);
      }
    }
  }

  private generateCaption(type: string): string {
    const captions: { [key: string]: string } = {
      diagram: 'This diagram illustrates the relationships between key concepts discussed in this topic.',
      chart: 'This chart visualizes data to help clarify the information presented.',
      infographic: 'This infographic summarizes the key points in an easy-to-understand format.',
      illustration: 'This illustration provides a visual representation to aid comprehension.',
      flowchart: 'This flowchart shows the step-by-step process or decision flow.',
      mindmap: 'This mind map organizes related ideas around the central concept.',
      comparison: 'This comparison highlights similarities and differences between concepts.'
    };

    return captions[type] || 'This visual aid supports the learning objectives of this topic.';
  }

  private calculateTotalCost(visuals: GeneratedVisual[]): number {
    // Estimate total cost of generation
    // Assuming average cost per image
    return visuals.length * 0.05;
  }

  async regenerateTopicVisuals(
    topic: Topic,
    options?: { keepExisting?: boolean }
  ): Promise<GeneratedVisual[]> {
    const prompts = await this.promptGenerator.generateTopicPrompts(topic, {});
    const visuals = await this.imageService.generateVisuals(prompts);

    if (options?.keepExisting) {
      // Merge with existing visuals
    }

    return visuals;
  }
}

export const visualIntegrator = new VisualContentIntegrator();
