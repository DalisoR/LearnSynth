/**
 * Enhanced Lesson Generator
 * Transforms raw chapter content into AI-enhanced pedagogical lessons
 * using 4 teaching styles: Socratic, Direct, Constructivist, Encouraging
 */

import { llmService } from '../llm/factory';

export interface EnhancedLessonSection {
  type: 'concept' | 'example' | 'analogy' | 'question' | 'summary';
  title: string;
  content: string;
  teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging';
  keyPoints: string[];
  examples?: string[];
  analogies?: string[];
  questions?: string[];
}

export interface EnhancedLesson {
  chapterId: string;
  originalContent: string;
  enhancedSections: EnhancedLessonSection[];
  teachingApproach: string;
  learningObjectives: string[];
  keyVocabulary: { term: string; definition: string }[];
  summary: string;
  quickQuiz: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }[];
}

export class EnhancedLessonGenerator {
  /**
   * Transform raw chapter content into an enhanced lesson
   */
  async generateEnhancedLesson(
    chapterId: string,
    chapterTitle: string,
    originalContent: string,
    teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging' = 'direct'
  ): Promise<EnhancedLesson> {
    console.log(`🎓 Generating enhanced lesson for: ${chapterTitle} (${teachingStyle} style)`);

    // Break content into manageable chunks
    const contentChunks = this.chunkContent(originalContent);

    // Generate enhanced sections for each chunk
    const enhancedSections: EnhancedLessonSection[] = [];

    for (const chunk of contentChunks) {
      const section = await this.enhanceChunk(chunk, teachingStyle, chapterTitle);
      enhancedSections.push(section);
    }

    // Generate learning objectives
    const learningObjectives = await this.generateLearningObjectives(originalContent, chapterTitle);

    // Generate key vocabulary
    const keyVocabulary = await this.extractKeyVocabulary(originalContent);

    // Generate summary
    const summary = await this.generateSummary(originalContent, chapterTitle);

    // Generate quick quiz
    const quickQuiz = await this.generateQuickQuiz(originalContent, chapterTitle);

    return {
      chapterId,
      originalContent,
      enhancedSections,
      teachingApproach: this.getTeachingApproachDescription(teachingStyle),
      learningObjectives,
      keyVocabulary,
      summary,
      quickQuiz
    };
  }

  /**
   * Enhance a content chunk with AI-powered teaching
   */
  private async enhanceChunk(
    chunk: string,
    teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging',
    chapterTitle: string
  ): Promise<EnhancedLessonSection> {
    const prompt = this.buildEnhancementPrompt(chunk, teachingStyle, chapterTitle);

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 1500,
        temperature: 0.7
      });

      return this.parseEnhancedSection(response.content, teachingStyle);
    } catch (error) {
      console.error('Error enhancing chunk:', error);

      // Fallback: basic enhancement
      return {
        type: 'concept',
        title: 'Key Concept',
        content: chunk,
        teachingStyle,
        keyPoints: [chunk.substring(0, 100)]
      };
    }
  }

  /**
   * Build prompt for content enhancement
   */
  private buildEnhancementPrompt(
    content: string,
    teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging',
    chapterTitle: string
  ): string {
    const styleInstructions = {
      socratic: `
        TEACHING STYLE: Socratic Method
        - Ask thoughtful questions that guide students to discover concepts
        - Challenge assumptions and encourage critical thinking
        - Use the "Why?" and "How do you know?" approach
        - Help students connect dots and draw their own conclusions
        - Don't just give answers - help them think through problems
      `,
      direct: `
        TEACHING STYLE: Direct Instruction
        - Provide clear, structured explanations
        - Break complex ideas into simple steps
        - Give concrete examples and demonstrations
        - Be authoritative and informative
        - Focus on accuracy and clarity
        - Teach the "what, why, and how" directly
      `,
      constructivist: `
        TEACHING STYLE: Constructivist
        - Connect new concepts to what students already know
        - Build knowledge progressively from foundation to advanced
        - Encourage students to form their own understanding
        - Use analogies and real-world connections
        - Help students see patterns and relationships
        - Relate abstract concepts to concrete experiences
      `,
      encouraging: `
        TEACHING STYLE: Encouraging Mentor
        - Be supportive and positive
        - Celebrate learning milestones
        - Build confidence in the learner
        - Use encouraging language
        - Focus on growth mindset
        - Make learning feel achievable and exciting
      `
    };

    return `
      You are an expert teacher. Transform the following content using the ${teachingStyle} teaching style.

      ${styleInstructions[teachingStyle]}

      IMPORTANT RULES:
      1. Ground all explanations in the source material - never add false information
      2. Enhance the content with pedagogical techniques
      3. Make it engaging and understandable
      4. If using examples, make them clear and relevant
      5. Keep the core facts accurate

      CONTENT TO ENHANCE:
      ${content}

      CHAPTER: ${chapterTitle}

      Return ONLY a JSON object with this structure:
      {
        "type": "concept|example|analogy|question|summary",
        "title": "Compelling section title",
        "content": "Enhanced explanation in ${teachingStyle} style (200-300 words)",
        "keyPoints": ["Point 1", "Point 2", "Point 3"],
        "examples": ["Concrete example 1", "Concrete example 2"],
        "analogies": ["Simple analogy to explain the concept"],
        "questions": ["Thought-provoking question for reflection"]
      }

      Make it educational, engaging, and pedagogical!
    `;
  }

  /**
   * Chunk content into manageable sections
   */
  private chunkContent(content: string): string[] {
    const maxChunkSize = 800; // characters
    const paragraphs = content.split('\n\n');

    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        currentChunk += '\n\n' + paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Parse enhanced section from AI response
   */
  private parseEnhancedSection(response: string, teachingStyle: string): EnhancedLessonSection {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          type: data.type || 'concept',
          title: data.title || 'Enhanced Learning',
          content: data.content || response,
          teachingStyle,
          keyPoints: data.keyPoints || [],
          examples: data.examples || [],
          analogies: data.analogies || [],
          questions: data.questions || []
        };
      }
    } catch (error) {
      console.error('Error parsing enhanced section:', error);
    }

    // Fallback
    return {
      type: 'concept',
      title: 'Enhanced Content',
      content: response,
      teachingStyle,
      keyPoints: [response.substring(0, 150)]
    };
  }

  /**
   * Generate learning objectives
   */
  private async generateLearningObjectives(
    content: string,
    chapterTitle: string
  ): Promise<string[]> {
    const prompt = `
      Based on this chapter content, create 3-5 clear learning objectives.
      What should a student be able to DO after learning this?

      Chapter: ${chapterTitle}
      Content: ${content.substring(0, 2000)}

      Format: Return as JSON array of strings.
      Example: ["Define key terms", "Explain the main concept", "Apply to real-world scenarios"]
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 400,
        temperature: 0.6
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error generating learning objectives:', error);
    }

    return [
      `Understand the key concepts in ${chapterTitle}`,
      `Apply the main principles`,
      `Connect to broader learning objectives`
    ];
  }

  /**
   * Extract key vocabulary
   */
  private async extractKeyVocabulary(content: string): Promise<{ term: string; definition: string }[]> {
    const prompt = `
      Extract 5-8 key terms from this content with clear definitions.

      Content: ${content.substring(0, 2000)}

      Return as JSON array:
      [{"term": "Term", "definition": "Clear definition"}]
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 600,
        temperature: 0.5
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error extracting vocabulary:', error);
    }

    return [];
  }

  /**
   * Generate chapter summary
   */
  private async generateSummary(content: string, chapterTitle: string): Promise<string> {
    const prompt = `
      Create a concise, engaging summary of this chapter.
      Focus on the main ideas and why they matter.

      Chapter: ${chapterTitle}
      Content: ${content.substring(0, 2000)}

      Return 2-3 sentences that capture the essence.
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 300,
        temperature: 0.7
      });

      return response.content.trim();
    } catch (error) {
      console.error('Error generating summary:', error);
      return `This chapter covers important concepts in ${chapterTitle}.`;
    }
  }

  /**
   * Generate quick quiz
   */
  private async generateQuickQuiz(content: string, chapterTitle: string): Promise<any[]> {
    const prompt = `
      Create 3 multiple-choice questions based on this chapter content.

      Chapter: ${chapterTitle}
      Content: ${content.substring(0, 2000)}

      Return as JSON array:
      [{
        "question": "Question text",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": 0,
        "explanation": "Why this is correct"
      }]
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 800,
        temperature: 0.7
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
    }

    return [];
  }

  /**
   * Get teaching approach description
   */
  private getTeachingApproachDescription(style: string): string {
    const descriptions = {
      socratic: 'Learn through guided questioning and discovery',
      direct: 'Clear, structured instruction and explanation',
      constructivist: 'Build knowledge through connections and examples',
      encouraging: 'Supportive mentorship with positive reinforcement'
    };
    return descriptions[style] || 'Engaging pedagogical approach';
  }
}

export const enhancedLessonGenerator = new EnhancedLessonGenerator();
