import { LessonStructure, Topic, ContentLevel, GenerationConfig } from './types';
import { ContextResult } from '../rag/types';
import { llmService } from '../llm/factory';

export class ContentGenerator {
  async generateContent(
    lesson: LessonStructure,
    context: ContextResult,
    config: GenerationConfig
  ): Promise<LessonStructure> {
    const generatedLesson = { ...lesson };

    // Multi-pass generation strategy
    for (const topic of generatedLesson.topics) {
      // Pass 1: Generate core content
      topic.content.core = await this.generateTopicContent(
        topic,
        context,
        'core',
        config
      );

      // Pass 2: Add intermediate depth
      topic.content.intermediate = await this.expandContent(
        topic.content.core,
        topic,
        context,
        'intermediate'
      );

      // Pass 3: Add advanced material
      topic.content.advanced = await this.expandContent(
        topic.content.intermediate,
        topic,
        context,
        'advanced'
      );

      // Add cross-references
      await this.addCrossReferences(topic, context);

      // Add narrative transitions
      await this.addNarrativeTransitions(topic, generatedLesson.topics);
    }

    // Add summary and synthesis
    await this.addSummaryAndSynthesis(generatedLesson, context);

    return generatedLesson;
  }

  private async generateTopicContent(
    topic: Topic,
    context: ContextResult,
    level: ContentLevel,
    config: GenerationConfig
  ): Promise<string> {
    const relevantChunks = this.findRelevantChunks(topic.title, context);
    const keySources = this.selectKeySources(relevantChunks, 5);

    const generationPrompt = `
      Generate ${level} level content for the topic: "${topic.title}"

      Learning Objective: ${topic.title}

      Use these sources (with proper attribution):
      ${keySources.map(s => `- ${s.metadata.documentName}: ${s.content.substring(0, 200)}...`).join('\n')}

      Requirements:
      - Level: ${level}
      - Time allocation: ${topic.timeAllocation} minutes
      - Style: ${config.style}
      - Include practical examples where relevant
      - Make it engaging and clear
      - Write in a ${config.style} tone

      Structure:
      1. Brief introduction (hook)
      2. Main concept explanation
      3. Key details and nuances
      4. Simple example or application
      5. Brief summary/transitions to next topic

      Target length: ${this.calculateTargetLength(level, topic.timeAllocation)} words

      Write the content now:
    `;

    try {
      const response = await llmService.complete({
        prompt: generationPrompt,
        maxTokens: this.getMaxTokens(level)
      });

      return this.postProcessContent(response, topic);
    } catch (error) {
      console.error(`Error generating ${level} content:`, error);
      return this.generateFallbackContent(topic, level);
    }
  }

  private async expandContent(
    baseContent: string,
    topic: Topic,
    context: ContextResult,
    targetLevel: ContentLevel
  ): Promise<string> {
    const expansionPrompt = `
      Expand this ${targetLevel} content for the topic: "${topic.title}"

      Base content:
      ${baseContent}

      Requirements:
      - Add more depth and detail
      - Include additional perspectives from other sources
      - Add more nuanced explanations
      - Include historical context or evolution of the concept if relevant
      - Add "deep dive" sections marked clearly
      - Keep the original structure but enhance it

      Expand to ${this.calculateTargetLength(targetLevel, topic.timeAllocation)} words

      Write the expanded content:
    `;

    try {
      const response = await llmService.complete({
        prompt: expansionPrompt,
        maxTokens: this.getMaxTokens(targetLevel)
      });

      return response;
    } catch (error) {
      console.error(`Error expanding to ${targetLevel}:`, error);
      return baseContent;
    }
  }

  private async addCrossReferences(topic: Topic, context: ContextResult): Promise<void> {
    // Find related concepts from other sources
    const relatedContent = context.chunks.filter(chunk =>
      topic.relatedConcepts.some(concept =>
        chunk.content.toLowerCase().includes(concept.toLowerCase())
      )
    );

    // Add cross-reference notes
    if (relatedContent.length > 0) {
      const crossRefNote = `\n\n**Cross-Reference**: This concept connects to ${topic.relatedConcepts.join(', ')} which you'll explore in other parts of the course.\n`;
      topic.content.core += crossRefNote;
    }
  }

  private async addNarrativeTransitions(
    currentTopic: Topic,
    allTopics: Topic[]
  ): Promise<void> {
    const currentIndex = allTopics.findIndex(t => t.id === currentTopic.id);

    if (currentIndex < allTopics.length - 1) {
      const nextTopic = allTopics[currentIndex + 1];
      const transitionPrompt = `
        Write a brief (1-2 sentences) transition from "${currentTopic.title}" to "${nextTopic.title}"
        Make it smooth and engaging. Don't use phrases like "Next, we will..."
      `;

      try {
        const transition = await llmService.complete({
          prompt: transitionPrompt,
          maxTokens: 100
        });

        currentTopic.content.core += `\n\n${transition}`;
      } catch (error) {
        console.error('Error adding transition:', error);
      }
    }
  }

  private async addSummaryAndSynthesis(
    lesson: LessonStructure,
    context: ContextResult
  ): Promise<void> {
    // Add a summary section at the end of the last topic
    const lastTopic = lesson.topics[lesson.topics.length - 1];
    if (lastTopic) {
      const summaryPrompt = `
        Create a brief synthesis section for a lesson on: ${lesson.title}

        Topics covered: ${lesson.topics.map(t => t.title).join(', ')}

        Write 2-3 paragraphs that:
        1. Synthesize the key learnings across all topics
        2. Show how they connect to form a bigger picture
        3. Point to real-world applications
        4. Encourage further exploration

        Keep it concise and inspiring.
      `;

      try {
        const summary = await llmService.complete({
          prompt: summaryPrompt,
          maxTokens: 500
        });

        lastTopic.content.core += `\n\n## Synthesis & Next Steps\n${summary}`;
      } catch (error) {
        console.error('Error adding summary:', error);
      }
    }
  }

  private findRelevantChunks(topicName: string, context: ContextResult) {
    return context.chunks.filter(chunk =>
      chunk.content.toLowerCase().includes(topicName.toLowerCase())
    );
  }

  private selectKeySources(chunks: any[], maxSources: number): any[] {
    // Select most relevant and diverse sources
    const seen = new Set<string>();
    const selected: any[] = [];

    chunks.forEach(chunk => {
      if (selected.length >= maxSources) return;

      const docId = chunk.metadata.documentId;
      if (!seen.has(docId)) {
        seen.add(docId);
        selected.push(chunk);
      }
    });

    return selected;
  }

  private calculateTargetLength(level: ContentLevel, timeMinutes: number): number {
    // Assuming ~150 words per minute reading speed
    const baseWords = timeMinutes * 150;

    switch (level) {
      case 'core':
        return Math.floor(baseWords * 0.6);
      case 'intermediate':
        return Math.floor(baseWords);
      case 'advanced':
        return Math.floor(baseWords * 1.4);
      default:
        return baseWords;
    }
  }

  private getMaxTokens(level: ContentLevel): number {
    switch (level) {
      case 'core':
        return 2000;
      case 'intermediate':
        return 3000;
      case 'advanced':
        return 4000;
      default:
        return 2000;
    }
  }

  private postProcessContent(content: string, topic: Topic): string {
    // Clean up and format content
    let processed = content;

    // Ensure proper markdown formatting
    processed = processed.replace(/\n{3,}/g, '\n\n');

    // Add emphasis to key terms
    topic.keyTerms.forEach(term => {
      // Escape special regex characters in the term
      const escapedTerm = term.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');
      processed = processed.replace(regex, `**${term.term}**`);
    });

    return processed;
  }

  private generateFallbackContent(topic: Topic, level: ContentLevel): string {
    return `# ${topic.title}\n\nThis is a foundational concept that will be explored in depth. \n\nKey points:\n- Important aspect 1\n- Important aspect 2\n- Important aspect 3\n\nThis topic connects to: ${topic.relatedConcepts.join(', ')}\n`;
  }
}
