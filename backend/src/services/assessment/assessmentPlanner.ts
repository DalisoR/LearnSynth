import { LessonStructure, Topic } from '../lessonGenerator/types';
import { Assessment, AssessmentType, BloomLevel, BloomDistribution } from './types';
import { llmService } from '../llm/factory';

export class AssessmentPlanner {
  async planAssessment(
    lesson: LessonStructure,
    options: {
      type: AssessmentType;
      questionCount?: number;
      timeLimit?: number;
      difficulty?: number;
      focusTopics?: string[];
    }
  ): Promise<Assessment> {
    const {
      type,
      questionCount = this.getDefaultQuestionCount(type),
      timeLimit = this.getDefaultTimeLimit(type),
      difficulty = 3,
      focusTopics
    } = options;

    // Plan question distribution across Bloom's taxonomy
    const bloomDistribution = this.calculateBloomDistribution(type, lesson.topics.length);

    // Select focus topics
    const selectedTopics = focusTopics || lesson.topics.map(t => t.title);

    // Generate questions for each topic
    const questions = await this.generateQuestionsForTopics(
      selectedTopics,
      lesson,
      bloomDistribution,
      questionCount
    );

    return {
      id: this.generateId(),
      lessonId: lesson.id,
      type,
      title: this.generateTitle(type, lesson.title),
      description: this.generateDescription(type),
      questions,
      timeLimit,
      passingScore: this.getPassingScore(type),
      maxAttempts: this.getMaxAttempts(type),
      randomizeQuestions: true,
      showCorrectAnswers: type !== 'final',
      allowReview: true,
      bloomDistribution,
      createdAt: new Date()
    };
  }

  private calculateBloomDistribution(
    type: AssessmentType,
    topicCount: number
  ): BloomDistribution {
    // Different assessment types focus on different Bloom levels
    const distributions: { [key in AssessmentType]: BloomDistribution } = {
      checkpoint: {
        remember: 30,
        understand: 50,
        apply: 20,
        analyze: 0,
        evaluate: 0,
        create: 0
      },
      practice: {
        remember: 10,
        understand: 30,
        apply: 40,
        analyze: 15,
        evaluate: 5,
        create: 0
      },
      final: {
        remember: 10,
        understand: 20,
        apply: 25,
        analyze: 25,
        evaluate: 15,
        create: 5
      },
      remediation: {
        remember: 20,
        understand: 40,
        apply: 30,
        analyze: 10,
        evaluate: 0,
        create: 0
      }
    };

    return distributions[type];
  }

  private async generateQuestionsForTopics(
    topics: string[],
    lesson: LessonStructure,
    bloomDistribution: BloomDistribution,
    totalQuestions: number
  ): Promise<any[]> {
    const questions: any[] = [];
    const questionsPerTopic = Math.ceil(totalQuestions / topics.length);

    // Map Bloom levels to question allocation
    const bloomLevels: BloomLevel[] = [
      'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
    ];

    const bloomQuestions = Math.floor(totalQuestions / bloomLevels.length);
    const remainder = totalQuestions % bloomLevels.length;

    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      const bloomAllocation = this.allocateBloomLevels(bloomDistribution, bloomQuestions);

      for (const [bloomLevel, count] of Object.entries(bloomAllocation)) {
        for (let j = 0; j < count; j++) {
          const question = await this.createQuestion(
            topic,
            bloomLevel as BloomLevel,
            lesson
          );
          if (question) {
            questions.push(question);
          }
        }
      }
    }

    return questions;
  }

  private allocateBloomLevels(
    distribution: BloomDistribution,
    baseCount: number
  ): { [key: string]: number } {
    const allocation: { [key: string]: number } = {};

    // Calculate proportional distribution
    const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);

    Object.entries(distribution).forEach(([level, percentage]) => {
      allocation[level] = Math.floor((percentage / 100) * baseCount);
    });

    return allocation;
  }

  private async createQuestion(
    topic: string,
    bloomLevel: BloomLevel,
    lesson: LessonStructure
  ): Promise<any> {
    const questionTemplate = this.getQuestionTemplate(bloomLevel);
    const prompt = `
      Create a ${questionTemplate.type} question about "${topic}" at the "${bloomLevel}" level of Bloom's taxonomy.

      Context from lesson:
      - Learning objectives: ${lesson.objectives.primary.join(', ')}
      - Key topics: ${topic}

      Requirements:
      - Bloom level: ${bloomLevel}
      - Question type: ${questionTemplate.type}
      - Difficulty: 3/5
      - Include clear correct answer
      - Add explanation for why the answer is correct
      - Make it educational and engaging

      Format as JSON:
      {
        "id": "unique-id",
        "type": "${questionTemplate.type}",
        "bloomLevel": "${bloomLevel}",
        "difficulty": 3,
        "topic": "${topic}",
        "question": "question text",
        "options": ["A", "B", "C", "D"], // if MCQ
        "correctAnswer": "correct answer",
        "explanation": "why this is correct",
        "hint": "helpful hint",
        "points": 1,
        "tags": ["tag1", "tag2"]
      }
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 800
      });

      const question = JSON.parse(response);
      question.id = this.generateId();

      // Validate question
      if (!this.validateQuestion(question)) {
        console.warn('Question validation failed, skipping:', question);
        return null;
      }

      return question;
    } catch (error) {
      console.error(`Error creating ${bloomLevel} question for ${topic}:`, error);
      return this.createFallbackQuestion(topic, bloomLevel);
    }
  }

  private getQuestionTemplate(bloomLevel: BloomLevel): { type: string } {
    const templates: { [key in BloomLevel]: { type: string } } = {
      remember: { type: 'mcq' },
      understand: { type: 'mcq' },
      apply: { type: 'scenario' },
      analyze: { type: 'short-answer' },
      evaluate: { type: 'essay' },
      create: { type: 'essay' }
    };

    return templates[bloomLevel] || { type: 'mcq' };
  }

  private createFallbackQuestion(topic: string, bloomLevel: BloomLevel): any {
    const fallbackQuestions: { [key in BloomLevel]: any } = {
      remember: {
        id: this.generateId(),
        type: 'mcq',
        bloomLevel,
        difficulty: 3,
        topic,
        question: `What is the most important concept in ${topic}?`,
        options: ['Concept A', 'Concept B', 'Concept C', 'Concept D'],
        correctAnswer: 'Concept A',
        explanation: 'This is the foundational concept that other ideas build upon.',
        hint: 'Think about the core definition.',
        points: 1,
        tags: [topic, 'foundational']
      },
      understand: {
        id: this.generateId(),
        type: 'mcq',
        bloomLevel,
        difficulty: 3,
        topic,
        question: `Which statement best describes ${topic}?`,
        options: [
          'It is a basic concept',
          'It is a complex system',
          'It is an outdated idea',
          'It is only theoretical'
        ],
        correctAnswer: 'It is a complex system',
        explanation: 'This captures the nuanced nature of the topic.',
        hint: 'Consider the key characteristics.',
        points: 1,
        tags: [topic, 'comprehension']
      },
      apply: {
        id: this.generateId(),
        type: 'scenario',
        bloomLevel,
        difficulty: 3,
        topic,
        question: `A student encounters a problem related to ${topic}. What should they do first?`,
        correctAnswer: 'Analyze the problem and identify key elements',
        explanation: 'The first step in application is understanding the problem.',
        hint: 'Think about the problem-solving process.',
        points: 1,
        tags: [topic, 'application']
      },
      analyze: {
        id: this.generateId(),
        type: 'short-answer',
        bloomLevel,
        difficulty: 3,
        topic,
        question: `Break down the main components of ${topic} and explain how they relate to each other.`,
        correctAnswer: 'Component A relates to Component B through process X',
        explanation: 'Analysis requires identifying parts and relationships.',
        hint: 'Consider cause and effect.',
        points: 1,
        tags: [topic, 'analysis']
      },
      evaluate: {
        id: this.generateId(),
        type: 'essay',
        bloomLevel,
        difficulty: 3,
        topic,
        question: `Evaluate the effectiveness of ${topic} in real-world scenarios. Provide evidence for your reasoning.`,
        correctAnswer: 'High effectiveness in scenarios A and B',
        explanation: 'Evaluation requires evidence and reasoning.',
        hint: 'Use specific examples.',
        points: 1,
        tags: [topic, 'evaluation']
      },
      create: {
        id: this.generateId(),
        type: 'essay',
        bloomLevel,
        difficulty: 3,
        topic,
        question: `Design an innovative approach to teaching ${topic} to beginners. Explain your design choices.`,
        correctAnswer: 'Multi-sensory approach with interactive elements',
        explanation: 'Creation involves combining known elements in new ways.',
        hint: 'Consider different learning styles.',
        points: 1,
        tags: [topic, 'creation']
      }
    };

    return fallbackQuestions[bloomLevel];
  }

  private validateQuestion(question: any): boolean {
    // Basic validation
    if (!question.question || question.question.length < 10) return false;
    if (!question.correctAnswer) return false;
    if (question.type === 'mcq' && (!question.options || question.options.length < 3)) return false;

    return true;
  }

  private generateTitle(type: AssessmentType, lessonTitle: string): string {
    const titles: { [key in AssessmentType]: string } = {
      checkpoint: `Quick Check: ${lessonTitle}`,
      practice: `Practice Questions: ${lessonTitle}`,
      final: `Final Assessment: ${lessonTitle}`,
      remediation: `Review & Practice: ${lessonTitle}`
    };

    return titles[type];
  }

  private generateDescription(type: AssessmentType): string {
    const descriptions: { [key in AssessmentType]: string } = {
      checkpoint: 'Test your understanding of key concepts covered in this lesson.',
      practice: 'Practice applying what you\'ve learned with varied question types.',
      final: 'Demonstrate your comprehensive understanding of this topic.',
      remediation: 'Focus on areas that need improvement based on your performance.'
    };

    return descriptions[type];
  }

  private getDefaultQuestionCount(type: AssessmentType): number {
    const counts: { [key in AssessmentType]: number } = {
      checkpoint: 5,
      practice: 10,
      final: 15,
      remediation: 8
    };

    return counts[type];
  }

  private getDefaultTimeLimit(type: AssessmentType): number {
    const limits: { [key in AssessmentType]: number } = {
      checkpoint: 5,
      practice: 20,
      final: 30,
      remediation: 15
    };

    return limits[type];
  }

  private getPassingScore(type: AssessmentType): number {
    const scores: { [key in AssessmentType]: number } = {
      checkpoint: 70,
      practice: 60,
      final: 75,
      remediation: 80
    };

    return scores[type];
  }

  private getMaxAttempts(type: AssessmentType): number {
    const attempts: { [key in AssessmentType]: number } = {
      checkpoint: 2,
      practice: 3,
      final: 2,
      remediation: 3
    };

    return attempts[type];
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

export const assessmentPlanner = new AssessmentPlanner();
