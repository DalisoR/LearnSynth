import { Question, BloomLevel, QuestionType } from './types';
import { llmService } from '../llm/factory';

export class QuestionGenerator {
  async generateMCQ(
    topic: string,
    bloomLevel: BloomLevel,
    context: string,
    difficulty: number = 3
  ): Promise<Question> {
    const prompt = `
      Create a multiple-choice question about "${topic}" at ${bloomLevel} level.

      Context: ${context}

      Requirements:
      - 4 options (1 correct, 3 plausible distractors)
      - Distractors should be based on common misconceptions
      - Include clear explanation for correct answer
      - Difficulty: ${difficulty}/5

      Format as JSON with: type, question, options[], correctAnswer, explanation, hint
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 600
      });

      const question = JSON.parse(response.content);
      return this.standardizeQuestion(question, topic, bloomLevel, 'mcq', difficulty);
    } catch (error) {
      console.error('Error generating MCQ:', error);
      return this.generateFallbackMCQ(topic, bloomLevel, difficulty);
    }
  }

  async generateShortAnswer(
    topic: string,
    bloomLevel: BloomLevel,
    context: string,
    difficulty: number = 3
  ): Promise<Question> {
    const prompt = `
      Create a short-answer question about "${topic}" at ${bloomLevel} level.

      Context: ${context}

      Requirements:
      - Answer in 1-3 sentences
      - Test understanding of key concepts
      - Include model answer
      - Provide hint for struggling students
      - Difficulty: ${difficulty}/5

      Format as JSON with: type, question, correctAnswer, explanation, hint
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 500
      });

      const question = JSON.parse(response.content);
      return this.standardizeQuestion(question, topic, bloomLevel, 'short-answer', difficulty);
    } catch (error) {
      console.error('Error generating short-answer:', error);
      return this.generateFallbackShortAnswer(topic, bloomLevel, difficulty);
    }
  }

  async generateScenarioQuestion(
    topic: string,
    bloomLevel: BloomLevel,
    context: string,
    difficulty: number = 3
  ): Promise<Question> {
    const prompt = `
      Create a scenario-based question about "${topic}" at ${bloomLevel} level.

      Context: ${context}

      Requirements:
      - Present a realistic scenario
      - Ask application-focused question
      - Provide model answer with reasoning
      - Include step-by-step explanation
      - Difficulty: ${difficulty}/5

      Format as JSON with: type, question, correctAnswer, explanation, hint
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 700
      });

      const question = JSON.parse(response.content);
      return this.standardizeQuestion(question, topic, bloomLevel, 'scenario', difficulty);
    } catch (error) {
      console.error('Error generating scenario question:', error);
      return this.generateFallbackScenario(topic, bloomLevel, difficulty);
    }
  }

  async generateEssayQuestion(
    topic: string,
    bloomLevel: BloomLevel,
    context: string,
    difficulty: number = 3
  ): Promise<Question> {
    const prompt = `
      Create an essay question about "${topic}" at ${bloomLevel} level.

      Context: ${context}

      Requirements:
      - Require critical thinking or creativity
      - Provide rubric or key points for evaluation
      - Include example of excellent answer
      - Difficulty: ${difficulty}/5

      Format as JSON with: type, question, correctAnswer, explanation, hint
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 800
      });

      const question = JSON.parse(response.content);
      return this.standardizeQuestion(question, topic, bloomLevel, 'essay', difficulty);
    } catch (error) {
      console.error('Error generating essay question:', error);
      return this.generateFallbackEssay(topic, bloomLevel, difficulty);
    }
  }

  async generateMatchingQuestion(
    topic: string,
    context: string,
    difficulty: number = 3
  ): Promise<Question> {
    const prompt = `
      Create a matching question about "${topic}" concepts.

      Context: ${context}

      Requirements:
      - 5-7 pairs to match
      - Include clear instructions
      - Provide correct matching
      - Difficulty: ${difficulty}/5

      Format as JSON with: type, question, options[], correctAnswer, explanation
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 600
      });

      const question = JSON.parse(response.content);
      return this.standardizeQuestion(question, topic, 'understand', 'matching', difficulty);
    } catch (error) {
      console.error('Error generating matching question:', error);
      return this.generateFallbackMatching(topic, difficulty);
    }
  }

  async generateFillBlankQuestion(
    topic: string,
    context: string,
    difficulty: number = 3
  ): Promise<Question> {
    const prompt = `
      Create a fill-in-the-blank question about "${topic}".

      Context: ${context}

      Requirements:
      - 1-3 blanks in the sentence
      - Provide correct answers
      - Include context hints
      - Difficulty: ${difficulty}/5

      Format as JSON with: type, question, correctAnswer, explanation, hint
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 500
      });

      const question = JSON.parse(response.content);
      return this.standardizeQuestion(question, topic, 'remember', 'fill-blank', difficulty);
    } catch (error) {
      console.error('Error generating fill-blank question:', error);
      return this.generateFallbackFillBlank(topic, difficulty);
    }
  }

  private standardizeQuestion(
    question: any,
    topic: string,
    bloomLevel: BloomLevel,
    type: QuestionType,
    difficulty: number
  ): Question {
    return {
      id: this.generateId(),
      type,
      bloomLevel,
      difficulty,
      topic,
      question: question.question,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || 'Review the lesson material.',
      hint: question.hint || 'Think about the key concepts.',
      points: 1,
      tags: [topic, bloomLevel, type]
    };
  }

  // Fallback generators for when LLM fails
  private generateFallbackMCQ(topic: string, bloomLevel: BloomLevel, difficulty: number): Question {
    return {
      id: this.generateId(),
      type: 'mcq',
      bloomLevel,
      difficulty,
      topic,
      question: `What is the most important aspect of ${topic}?`,
      options: [
        'Understanding the basics',
        'Memorizing facts',
        'Practicing regularly',
        'All of the above'
      ],
      correctAnswer: 'All of the above',
      explanation: 'Comprehensive learning involves all these elements.',
      hint: 'Consider what contributes to mastery.',
      points: 1,
      tags: [topic, bloomLevel]
    };
  }

  private generateFallbackShortAnswer(topic: string, bloomLevel: BloomLevel, difficulty: number): Question {
    return {
      id: this.generateId(),
      type: 'short-answer',
      bloomLevel,
      difficulty,
      topic,
      question: `Explain the key principle of ${topic} in your own words.`,
      correctAnswer: 'A clear understanding of the fundamental concepts and their relationships.',
      explanation: 'This demonstrates comprehension of the topic.',
      hint: 'Focus on the core idea.',
      points: 1,
      tags: [topic, bloomLevel]
    };
  }

  private generateFallbackScenario(topic: string, bloomLevel: BloomLevel, difficulty: number): Question {
    return {
      id: this.generateId(),
      type: 'scenario',
      bloomLevel,
      difficulty,
      topic,
      question: `A colleague asks you to explain ${topic} to a beginner. How would you approach this?`,
      correctAnswer: 'Start with basic concepts and build up gradually with examples.',
      explanation: 'Effective teaching requires scaffolding knowledge.',
      hint: 'Think about the learning process.',
      points: 1,
      tags: [topic, bloomLevel]
    };
  }

  private generateFallbackEssay(topic: string, bloomLevel: BloomLevel, difficulty: number): Question {
    return {
      id: this.generateId(),
      type: 'essay',
      bloomLevel,
      difficulty,
      topic,
      question: `Discuss the significance of ${topic} in modern applications and suggest future developments.`,
      correctAnswer: 'Comprehensive analysis with examples and predictions.',
      explanation: 'This demonstrates deep understanding and critical thinking.',
      hint: 'Consider current trends and future possibilities.',
      points: 1,
      tags: [topic, bloomLevel]
    };
  }

  private generateFallbackMatching(topic: string, difficulty: number): Question {
    return {
      id: this.generateId(),
      type: 'matching',
      bloomLevel: 'understand',
      difficulty,
      topic,
      question: `Match the ${topic} concepts with their definitions:`,
      options: [
        'A. Concept 1', 'B. Concept 2', 'C. Concept 3',
        '1. Definition 1', '2. Definition 2', '3. Definition 3'
      ],
      correctAnswer: 'A-1, B-2, C-3',
      explanation: 'Matching tests understanding of relationships.',
      hint: 'Read each definition carefully.',
      points: 1,
      tags: [topic]
    };
  }

  private generateFallbackFillBlank(topic: string, difficulty: number): Question {
    return {
      id: this.generateId(),
      type: 'fill-blank',
      bloomLevel: 'remember',
      difficulty,
      topic,
      question: `${topic} is an important concept that _____ understanding.`,
      correctAnswer: 'enhances',
      explanation: 'This shows the value of the topic.',
      hint: 'Think about what the topic provides.',
      points: 1,
      tags: [topic]
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // Batch generation for multiple questions
  async generateQuestionsBatch(
    specifications: Array<{
      topic: string;
      bloomLevel: BloomLevel;
      type: QuestionType;
      difficulty?: number;
    }>,
    context?: string
  ): Promise<Question[]> {
    const questions: Question[] = [];

    for (const spec of specifications) {
      let question: Question;

      switch (spec.type) {
        case 'mcq':
          question = await this.generateMCQ(
            spec.topic,
            spec.bloomLevel,
            context || '',
            spec.difficulty || 3
          );
          break;
        case 'short-answer':
          question = await this.generateShortAnswer(
            spec.topic,
            spec.bloomLevel,
            context || '',
            spec.difficulty || 3
          );
          break;
        case 'scenario':
          question = await this.generateScenarioQuestion(
            spec.topic,
            spec.bloomLevel,
            context || '',
            spec.difficulty || 3
          );
          break;
        case 'essay':
          question = await this.generateEssayQuestion(
            spec.topic,
            spec.bloomLevel,
            context || '',
            spec.difficulty || 3
          );
          break;
        case 'matching':
          question = await this.generateMatchingQuestion(
            spec.topic,
            context || '',
            spec.difficulty || 3
          );
          break;
        case 'fill-blank':
          question = await this.generateFillBlankQuestion(
            spec.topic,
            context || '',
            spec.difficulty || 3
          );
          break;
        default:
          question = await this.generateMCQ(
            spec.topic,
            spec.bloomLevel,
            context || '',
            spec.difficulty || 3
          );
      }

      questions.push(question);
    }

    return questions;
  }
}

export const questionGenerator = new QuestionGenerator();
