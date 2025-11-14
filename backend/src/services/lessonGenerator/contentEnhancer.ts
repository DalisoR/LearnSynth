import { LessonStructure, Topic, ContentLevel } from './types';
import { llmService } from '../llm/factory';

export class ContentEnhancer {
  async enhanceContent(lesson: LessonStructure): Promise<LessonStructure> {
    const enhanced = { ...lesson };

    for (const topic of enhanced.topics) {
      // Add interactive elements
      await this.addInteractiveElements(topic);

      // Add visual placeholders
      await this.addVisualPlaceholders(topic);

      // Add engagement hooks
      await this.addEngagementHooks(topic);

      // Add multiple format versions
      this.createFormatVariants(topic);
    }

    return enhanced;
  }

  private async addInteractiveElements(topic: Topic): Promise<void> {
    // Add reflection prompts
    const reflectionPrompts = await this.generateReflectionPrompts(topic);

    // Add quick knowledge checks
    const knowledgeChecks = await this.generateKnowledgeChecks(topic);

    // Add key term highlights
    await this.highlightKeyTerms(topic);

    // Add pause-and-think moments
    await this.addPausePoints(topic);

    // Attach to topic
    topic.checkpoints = [...topic.checkpoints, ...reflectionPrompts, ...knowledgeChecks];
  }

  private async generateReflectionPrompts(topic: Topic): Promise<any[]> {
    const prompt = `
      Add 2-3 reflection prompts to this lesson topic: "${topic.title}"

      For each prompt:
      - Ask students to think deeply about the concept
      - Connect to real-world scenarios
      - Encourage critical thinking
      - Avoid yes/no questions

      Format as JSON array: [{question, type, position}]
      position: percentage through the topic (25, 50, 75)
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 500
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating reflection prompts:', error);
      return [];
    }
  }

  private async generateKnowledgeChecks(topic: Topic): Promise<any[]> {
    const prompt = `
      Create 2-3 quick knowledge check questions for the topic: "${topic.title}"

      These should:
      - Test basic understanding
      - Be answerable immediately
      - Help reinforce key concepts
      - Be quick (30 seconds each)

      Format as JSON array:
      [{
        question,
        type: "mcq" | "short-answer",
        options?: string[], // for mcq
        answer?: string,
        hint?: string,
        position: number // percentage through topic
      }]

      Make them engaging!
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 600
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating knowledge checks:', error);
      return [];
    }
  }

  private async highlightKeyTerms(topic: Topic): Promise<void> {
    // This enhances the content by emphasizing key terms
    // The actual highlighting is done in content generation with **term**
    // This is a placeholder for more sophisticated term highlighting
  }

  private async addPausePoints(topic: Topic): Promise<void> {
    // Add natural pause points in the content
    // Mark sections where students can take a break if needed
  }

  private async addVisualPlaceholders(topic: Topic): Promise<void> {
    // Identify where visuals would enhance understanding
    const visualSuggestionPrompt = `
      For the topic "${topic.title}", suggest 2-3 visual elements that would help students understand.

      Consider:
      - Diagrams that show relationships
      - Charts or graphs for data
      - Illustrations for abstract concepts
      - Flowcharts for processes

      Format as JSON array:
      [{
        type: "diagram" | "chart" | "illustration" | "flowchart",
        description: "What should the visual show?",
        purpose: "Why is this visual helpful?",
        complexity: "simple" | "moderate" | "complex"
      }]
    `;

    try {
      const response = await llmService.complete({
        prompt: visualSuggestionPrompt,
        maxTokens: 400
      });

      topic.visualPrompts = JSON.parse(response);
    } catch (error) {
      console.error('Error generating visual placeholders:', error);
    }
  }

  private async addEngagementHooks(topic: Topic): Promise<void> {
    // Add surprising facts, questions, or connections
    const hookPrompt = `
      Add 2-3 engagement hooks to make this topic "${topic.title}" more interesting:

      Types of hooks:
      - Surprising fact or statistic
      - Thought-provoking question
      - Real-world connection
      - Historical anecdote
      - Common misconception to address

      Format as JSON array:
      [{
        type: "fact" | "question" | "connection" | "anecdote" | "misconception",
        content: "The hook content",
        placement: "Where to put it (intro/middle/conclusion)"
      }]
    `;

    try {
      const response = await llmService.complete({
        prompt: hookPrompt,
        maxTokens: 500
      });

      const hooks = JSON.parse(response);

      // Insert hooks into content
      this.insertHooksIntoContent(topic, hooks);
    } catch (error) {
      console.error('Error adding engagement hooks:', error);
    }
  }

  private insertHooksIntoContent(topic: Topic, hooks: any[]): void {
    // Insert hooks at strategic points in the content
    const contents = [topic.content.core, topic.content.intermediate, topic.content.advanced];

    hooks.forEach((hook, index) => {
      const contentIndex = Math.min(index, contents.length - 1);
      const content = contents[contentIndex];

      if (content) {
        const hookText = `\n\n> 💡 **Engagement Note**: ${hook.content}\n`;
        contents[contentIndex] = content + hookText;
      }
    });

    [topic.content.core, topic.content.intermediate, topic.content.advanced] = contents;
  }

  private createFormatVariants(topic: Topic): void {
    // Create summary, standard, and deep-dive versions

    // Summary version (already core)
    // Standard version (already intermediate)
    // Deep-dive version (already advanced)

    // Add format indicators
    topic.content.core = this.addFormatIndicator(topic.content.core, 'Quick Read (5-10 min)');
    topic.content.intermediate = this.addFormatIndicator(topic.content.intermediate, 'Standard Lesson (15-20 min)');
    topic.content.advanced = this.addFormatIndicator(topic.content.advanced, 'Deep Dive (30-45 min)');
  }

  private addFormatIndicator(content: string, format: string): string {
    return `> **Format**: ${format}\n\n${content}`;
  }
}
