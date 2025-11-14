import { ContextResult } from '../rag/types';
import { LessonStructure, LearningObjectives, Topic, ContentLevel } from './types';
import { llmService } from '../llm/factory';

export class StructurePlanner {
  async planLesson(
    context: ContextResult,
    config: { targetTime: number; level: ContentLevel; subject?: string }
  ): Promise<LessonStructure> {
    // Step 1: Identify key concepts and topics
    const topics = await this.identifyTopics(context);

    // Step 2: Create learning objectives
    const objectives = await this.createLearningObjectives(topics, config.level);

    // Step 3: Structure topics in logical order
    const structuredTopics = await this.structureTopics(topics, context);

    // Step 4: Calculate time allocation
    const totalTime = this.calculateTimeAllocation(structuredTopics, config.targetTime);

    // Step 5: Identify prerequisites
    const prerequisites = await this.identifyPrerequisites(structuredTopics, context);

    // Step 6: Create narrative arc
    const narrativeArc = await this.createNarrativeArc(structuredTopics);

    return {
      id: generateId(),
      title: await this.generateTitle(structuredTopics),
      objectives,
      topics: structuredTopics,
      estimatedTime: totalTime,
      difficulty: this.calculateDifficulty(structuredTopics),
      prerequisites,
      narrativeArc
    };
  }

  private async identifyTopics(context: ContextResult): Promise<string[]> {
    // Use LLM to extract and organize topics from context
    const topicExtractionPrompt = `
      Based on the following content from multiple sources, identify the main topics and subtopics that should be covered in a lesson.
      Focus on organizing them in a logical learning sequence.

      Context chunks:
      ${context.chunks.map((c, i) => `[${i}] ${c.content}`).join('\n\n')}

      Please provide:
      1. 5-8 main topics
      2. Brief description of each topic
      3. Suggested order for teaching

      Format as JSON with: topics: [{title, description, order}]
    `;

    const response = await llmService.complete({
      prompt: topicExtractionPrompt,
      maxTokens: 1000
    });

    try {
      const parsed = JSON.parse(response);
      return parsed.topics
        .sort((a: any, b: any) => a.order - b.order)
        .map((t: any) => t.title);
    } catch {
      // Fallback: extract topics from concept analysis
      return Object.keys(context.concepts)
        .sort((a, b) => context.concepts[b].frequency - context.concepts[a].frequency)
        .slice(0, 6);
    }
  }

  private async createLearningObjectives(
    topics: string[],
    level: ContentLevel
  ): Promise<LearningObjectives> {
    const objectivePrompt = `
      Create learning objectives for a lesson covering these topics: ${topics.join(', ')}

      Level: ${level}

      Provide three categories:
      1. PRIMARY (must-know): Essential concepts students MUST understand
      2. SECONDARY (should-know): Important concepts students SHOULD understand
      3. EXTENDED (could-know): Advanced concepts for interested students

      Format as JSON: { primary: [], secondary: [], extended: [] }
    `;

    const response = await llmService.complete({
      prompt: objectivePrompt,
      maxTokens: 800
    });

    try {
      return JSON.parse(response);
    } catch {
      // Fallback
      return {
        primary: topics.slice(0, 3).map(t => `Understand the concept of ${t}`),
        secondary: topics.slice(3, 5).map(t => `Apply knowledge of ${t}`),
        extended: topics.slice(5).map(t => `Analyze ${t} in depth`)
      };
    }
  }

  private async structureTopics(
    topicNames: string[],
    context: ContextResult
  ): Promise<Topic[]> {
    const topics: Topic[] = [];

    for (let i = 0; i < topicNames.length; i++) {
      const topicName = topicNames[i];
      const relevantChunks = this.findRelevantChunks(topicName, context);

      topics.push({
        id: generateId(),
        title: topicName,
        content: {
          core: '',
          intermediate: '',
          advanced: ''
        },
        examples: await this.generateExamples(topicName, relevantChunks),
        visualPrompts: await this.generateVisualPrompts(topicName, relevantChunks),
        keyTerms: await this.extractKeyTerms(topicName, relevantChunks),
        checkpoints: [],
        relatedConcepts: this.findRelatedConcepts(topicName, topicNames),
        timeAllocation: 0 // Will be calculated later
      });
    }

    return topics;
  }

  private calculateTimeAllocation(topics: Topic[], totalTime: number): number {
    // Distribute time based on topic importance and complexity
    const baseTime = totalTime / topics.length;

    topics.forEach((topic, index) => {
      // First and last topics get slightly more time
      let multiplier = 1.0;
      if (index === 0) multiplier = 1.2; // Introduction
      if (index === topics.length - 1) multiplier = 1.1; // Conclusion

      topic.timeAllocation = Math.round(baseTime * multiplier);
    });

    return topics.reduce((sum, t) => sum + t.timeAllocation, 0);
  }

  private async identifyPrerequisites(
    topics: Topic[],
    context: ContextResult
  ): Promise<string[]> {
    // Analyze context for prerequisite relationships
    const prerequisites = new Set<string>();

    topics.forEach(topic => {
      topic.relatedConcepts.forEach(concept => {
        if (concept.toLowerCase().includes('prerequisite') ||
            concept.toLowerCase().includes('before')) {
          prerequisites.add(concept);
        }
      });
    });

    // Use context to identify common prerequisites
    if (context.chunks.length > 0) {
      const prerequisitePrompt = `
        Based on these topics: ${topics.map(t => t.title).join(', ')}
        What foundational knowledge would students need before learning them?

        Provide 3-5 prerequisite concepts.
      `;

      try {
        const response = await llmService.complete({
          prompt: prerequisitePrompt,
          maxTokens: 300
        });

        const prereqs = response.split('\n').filter(l => l.trim().length > 0);
        prereqs.forEach(pr => prerequisites.add(pr.trim()));
      } catch (error) {
        console.error('Error identifying prerequisites:', error);
      }
    }

    return Array.from(prerequisites).slice(0, 5);
  }

  private async createNarrativeArc(topics: Topic[]): Promise<string> {
    const narrativePrompt = `
      Create an engaging narrative arc that connects these topics:
      ${topics.map(t => t.title).join(' → ')}

      The narrative should:
      - Start with a hook/question
      - Build momentum through each topic
      - Connect concepts naturally
      - End with a satisfying conclusion

      Keep it concise (2-3 sentences).
    `;

    try {
      const response = await llmService.complete({
        prompt: narrativePrompt,
        maxTokens: 200
      });
      return response;
    } catch (error) {
      console.error('Error creating narrative arc:', error);
      return `A journey through ${topics.length} key concepts that build upon each other to create a comprehensive understanding.`;
    }
  }

  private async generateTitle(topics: Topic[]): Promise<string> {
    const titlePrompt = `
      Generate an engaging title for a lesson covering:
      ${topics.map(t => t.title).join(', ')}

      The title should be:
      - Clear and descriptive
      - Engaging (not boring)
      - 5-8 words

      Return only the title, nothing else.
    `;

    try {
      const response = await llmService.complete({
        prompt: titlePrompt,
        maxTokens: 50
      });
      return response.content.trim();
    } catch (error) {
      console.error('Error generating title:', error);
      return `Understanding ${topics[0]?.title || 'Core Concepts'}`;
    }
  }

  private findRelevantChunks(topicName: string, context: ContextResult) {
    return context.chunks.filter(chunk =>
      chunk.content.toLowerCase().includes(topicName.toLowerCase())
    );
  }

  private async generateExamples(topicName: string, chunks: any[]): Promise<any[]> {
    // TODO: Implement example generation
    return [];
  }

  private async generateVisualPrompts(topicName: string, chunks: any[]): Promise<any[]> {
    // TODO: Implement visual prompt generation
    return [];
  }

  private async extractKeyTerms(topicName: string, chunks: any[]): Promise<any[]> {
    // TODO: Implement key term extraction
    return [];
  }

  private findRelatedConcepts(topicName: string, allTopics: string[]): string[] {
    return allTopics.filter(t => t !== topicName).slice(0, 3);
  }

  private calculateDifficulty(topics: Topic[]): number {
    // Calculate difficulty based on concept complexity
    // Simple implementation - could be more sophisticated
    return 3.0; // Medium difficulty as default
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
