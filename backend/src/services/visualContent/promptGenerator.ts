import { VisualPrompt, VisualType, VisualStyle } from './types';
import { LessonStructure, Topic } from '../lessonGenerator/types';
import { llmService } from '../llm/factory';

export class EducationalPromptGenerator {
  async generateVisualPrompts(
    lesson: LessonStructure,
    config: { subject?: string; ageGroup?: string; style?: string }
  ): Promise<VisualPrompt[]> {
    const prompts: VisualPrompt[] = [];

    for (const topic of lesson.topics) {
      // Generate prompts for each topic
      const topicPrompts = await this.generateTopicPrompts(topic, config);
      prompts.push(...topicPrompts);

      // Generate cross-topic visualizations
      if (topic === lesson.topics[lesson.topics.length - 1]) {
        const overviewPrompts = await this.generateOverviewPrompts(lesson, config);
        prompts.push(...overviewPrompts);
      }
    }

    // Prioritize and select best prompts
    return this.prioritizePrompts(prompts, 10); // Limit to 10 visuals
  }

  private async generateTopicPrompts(
    topic: Topic,
    config: any
  ): Promise<VisualPrompt[]> {
    const prompts: VisualPrompt[] = [];

    // 1. Concept diagram - shows relationships between ideas
    if (topic.relatedConcepts.length > 0) {
      prompts.push({
        type: 'diagram',
        description: `Concept relationship diagram showing how "${topic.title}" connects to ${topic.relatedConcepts.slice(0, 3).join(', ')}`,
        complexity: 'moderate',
        purpose: 'Help students understand relationships between concepts',
        keywords: [topic.title, ...topic.relatedConcepts, 'relationships', 'connections'],
        style: this.getStyle(config)
      });
    }

    // 2. Process diagram - if topic describes a process
    const isProcessTopic = /how|process|steps|workflow|procedure/i.test(topic.content.core);
    if (isProcessTopic) {
      prompts.push({
        type: 'flowchart',
        description: `Process flowchart for "${topic.title}" showing sequential steps or decision points`,
        complexity: 'moderate',
        purpose: 'Visualize the sequential nature of the process',
        keywords: [topic.title, 'process', 'steps', 'flow'],
        style: this.getStyle(config)
      });
    }

    // 3. Comparison chart - if comparing concepts
    const isComparisonTopic = /versus|vs|compare|contrast|difference/i.test(topic.content.core);
    if (isComparisonTopic) {
      prompts.push({
        type: 'chart',
        description: `Comparison chart showing differences between concepts related to "${topic.title}"`,
        complexity: 'simple',
        purpose: 'Clarify differences between similar concepts',
        keywords: [topic.title, 'comparison', 'differences', 'analysis'],
        style: this.getStyle(config)
      });
    }

    // 4. Detailed illustration - for abstract or complex concepts
    if (topic.keyTerms.length > 3) {
      prompts.push({
        type: 'illustration',
        description: `Educational illustration showing "${topic.title}" with labeled components and key terms: ${topic.keyTerms.slice(0, 5).map(k => k.term).join(', ')}`,
        complexity: 'complex',
        purpose: 'Make abstract concepts concrete and visual',
        keywords: [topic.title, ...topic.keyTerms.slice(0, 5).map(k => k.term)],
        style: this.getStyle(config)
      });
    }

    // 5. Infographic - for data-heavy content
    const hasData = /\d+%|\d+ percent|\d+ times|\d+ years/i.test(topic.content.core);
    if (hasData) {
      prompts.push({
        type: 'infographic',
        description: `Infographic presenting key statistics and facts about "${topic.title}"`,
        complexity: 'moderate',
        purpose: 'Present statistical information visually',
        keywords: [topic.title, 'statistics', 'data', 'facts'],
        style: this.getStyle(config)
      });
    }

    // 6. Mind map - for comprehensive topic overview
    if (topic.keyTerms.length > 5) {
      prompts.push({
        type: 'mindmap',
        description: `Mind map with "${topic.title}" at the center, branching to: ${topic.keyTerms.slice(0, 8).map(k => k.term).join(', ')}`,
        complexity: 'complex',
        purpose: 'Provide comprehensive overview of topic',
        keywords: [topic.title, 'overview', 'mindmap', 'comprehensive'],
        style: this.getStyle(config)
      });
    }

    return prompts;
  }

  private async generateOverviewPrompts(
    lesson: LessonStructure,
    config: any
  ): Promise<VisualPrompt[]> {
    const prompts: VisualPrompt[] = [];

    // Overall lesson structure diagram
    prompts.push({
      type: 'diagram',
      description: `Course overview diagram showing the journey through: ${lesson.topics.map(t => t.title).join(' → ')}`,
      complexity: 'moderate',
      purpose: 'Show lesson structure and progression',
      keywords: ['structure', 'progression', 'overview', 'lesson'],
      style: this.getStyle(config)
    });

    // Prerequisites and outcomes
    if (lesson.prerequisites.length > 0) {
      prompts.push({
        type: 'diagram',
        description: `Learning pathway diagram showing prerequisites (${lesson.prerequisites.join(', ')}) leading to lesson outcomes`,
        complexity: 'simple',
        purpose: 'Clarify learning prerequisites',
        keywords: ['prerequisites', 'pathway', 'learning', 'outcomes'],
        style: this.getStyle(config)
      });
    }

    return prompts;
  }

  private prioritizePrompts(prompts: VisualPrompt[], maxCount: number): VisualPrompt[] {
    // Priority scoring based on educational value
    const scored = prompts.map(prompt => {
      let score = 0;

      // Higher priority for certain types
      const typePriority: { [key in VisualType]: number } = {
        diagram: 10,
        flowchart: 9,
        chart: 8,
        mindmap: 7,
        comparison: 6,
        illustration: 5,
        infographic: 4
      };
      score += typePriority[prompt.type];

      // Moderate complexity gets higher priority
      if (prompt.complexity === 'moderate') score += 3;
      else if (prompt.complexity === 'simple') score += 2;

      // More keywords = more educational value
      score += Math.min(prompt.keywords.length * 0.5, 5);

      return { prompt, score };
    });

    // Sort by score and return top N
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCount)
      .map(s => s.prompt);
  }

  private getStyle(config: any): VisualStyle {
    return {
      theme: (config.style as any) || 'modern',
      colors: this.getColorScheme(config.subject),
      fontSize: 'medium',
      orientation: 'landscape'
    };
  }

  private getColorScheme(subject?: string): string[] {
    // Subject-specific color schemes
    if (!subject) return ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

    const schemes: { [key: string]: string[] } = {
      'Computer Science': ['#3b82f6', '#06b6d4', '#8b5cf6', '#a855f7'],
      'Mathematics': ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd'],
      'Physics': ['#dc2626', '#f97316', '#eab308', '#facc15'],
      'Chemistry': ['#059669', '#10b981', '#34d399', '#6ee7b7'],
      'Biology': ['#16a34a', '#22c55e', '#4ade80', '#86efac'],
      'History': ['#92400e', '#d97706', '#f59e0b', '#fbbf24'],
      'Literature': ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd'],
      default: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']
    };

    return schemes[subject] || schemes.default;
  }

  async generateCustomPrompt(
    topic: string,
    visualType: VisualType,
    additionalContext?: string
  ): Promise<VisualPrompt> {
    const prompt = `
      Generate an educational ${visualType} prompt for: "${topic}"

      ${additionalContext ? `Additional context: ${additionalContext}` : ''}

      Requirements:
      - Clear visual description
      - Educational purpose stated
      - Include relevant keywords
      - Appropriate complexity level

      Format as JSON with fields: type, description, complexity, purpose, keywords
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 500
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating custom prompt:', error);

      // Fallback
      return {
        type: visualType,
        description: `${visualType} for ${topic}`,
        complexity: 'moderate',
        purpose: 'Aid understanding',
        keywords: [topic, visualType],
        style: { theme: 'modern', orientation: 'landscape' }
      };
    }
  }
}
