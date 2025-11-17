import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PracticeProblem {
  id: string;
  templateId?: string;
  userId: string;
  subjectId?: string;
  topic: string;
  subtopic?: string;
  difficultyLevel: number;
  problemType: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank' | 'essay' | 'code' | 'numeric';
  question: string;
  questionData?: any;
  correctAnswer: string;
  incorrectOptions?: string[];
  explanation: string;
  hints?: any;
  tags?: string[];
  points: number;
  estimatedTime: number;
  aiGenerated: boolean;
  generationContext?: any;
}

export interface ProblemTemplate {
  id: string;
  subjectId?: string;
  topic: string;
  subtopic?: string;
  difficultyLevel: number;
  problemType: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank' | 'essay' | 'code' | 'numeric';
  questionTemplate: string;
  correctAnswer: string;
  incorrectOptions?: string[];
  explanation: string;
  hints?: any;
  tags?: string[];
  aiGenerated: boolean;
}

export interface GenerationRequest {
  topic: string;
  subtopic?: string;
  difficultyLevel: number;
  problemType: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank' | 'essay' | 'code' | 'numeric';
  count: number;
  subject?: string;
  learningObjectives?: string[];
  context?: string;
}

export interface PracticeAttempt {
  problemId: string;
  userId: string;
  sessionId?: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  hintsUsed: number;
  difficultyRating?: number;
  confidenceLevel?: number;
  mistakeType?: string;
  learningNotes?: string;
}

class AIPracticeProblemsService {
  /**
   * Generate practice problems using AI
   */
  async generateProblems(
    userId: string,
    request: GenerationRequest
  ): Promise<PracticeProblem[]> {
    try {
      const problems: PracticeProblem[] = [];
      const generationContext = {
        topic: request.topic,
        subtopic: request.subtopic,
        difficulty: request.difficultyLevel,
        type: request.problemType,
        subject: request.subject,
        objectives: request.learningObjectives,
        timestamp: Date.now(),
      };

      for (let i = 0; i < request.count; i++) {
        const problem = await this.generateSingleProblem(
          userId,
          request,
          generationContext
        );
        problems.push(problem);
      }

      return problems;
    } catch (error: any) {
      console.error('Error generating problems:', error);
      throw new Error('Failed to generate practice problems');
    }
  }

  /**
   * Generate a single practice problem using AI
   */
  private async generateSingleProblem(
    userId: string,
    request: GenerationRequest,
    context: any
  ): Promise<PracticeProblem> {
    const prompt = this.buildPrompt(request);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educator generating high-quality practice problems. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0].message.content;

    if (!response) {
      throw new Error('No response from AI');
    }

    const problemData = JSON.parse(response);

    const problem: PracticeProblem = {
      id: uuidv4(),
      userId,
      topic: request.topic,
      subtopic: request.subtopic,
      difficultyLevel: request.difficultyLevel,
      problemType: request.problemType,
      question: problemData.question,
      correctAnswer: problemData.correctAnswer,
      incorrectOptions: problemData.incorrectOptions,
      explanation: problemData.explanation,
      hints: problemData.hints || [],
      tags: [...(request.learningObjectives || []), request.topic],
      points: this.calculatePoints(request.difficultyLevel),
      estimatedTime: this.estimateTime(request.problemType, request.difficultyLevel),
      aiGenerated: true,
      generationContext: context,
    };

    return problem;
  }

  /**
   * Build AI prompt for problem generation
   */
  private buildPrompt(request: GenerationRequest): string {
    const difficultyLabels = {
      0: 'very easy (elementary)',
      20: 'easy (beginner)',
      40: 'moderate (intermediate)',
      60: 'challenging (upper-intermediate)',
      80: 'hard (advanced)',
      100: 'very hard (expert)',
    };

    const difficultyLabel = Object.entries(difficultyLabels)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const problemTypeInstructions = {
      multiple_choice:
        'Provide 4 options (1 correct, 3 incorrect). Include incorrectOptions array.',
      true_false: 'Correct answer should be "true" or "false".',
      short_answer: 'Provide a concise answer (1-2 sentences).',
      fill_blank: 'Indicate blank(s) in the question with underscores.',
      essay: 'Provide a detailed essay question with rubric.',
      code: 'Provide programming problem with input/output examples.',
      numeric: 'Provide a numerical answer (include units if applicable).',
    };

    return `
Generate a ${request.problemType.replace('_', ' ')} practice problem.

Topic: ${request.topic}${request.subtopic ? ` (${request.subtopic})` : ''}
Difficulty: ${request.difficultyLevel}/100 (${difficultyLabels[request.difficultyLevel as keyof typeof difficultyLabels] || 'custom'})
Subject: ${request.subject || 'General'}

Instructions for ${request.problemType}:
${problemTypeInstructions[request.problemType]}

${request.learningObjectives ? `Learning objectives to address:\n${request.learningObjectives.map((o) => `- ${o}`).join('\n')}\n` : ''}
${request.context ? `Additional context:\n${request.context}\n` : ''}

Return ONLY a JSON object with this exact structure:
{
  "question": "The practice problem question",
  "correctAnswer": "The correct answer",
  "incorrectOptions": ["wrong option 1", "wrong option 2", "wrong option 3"], // Only for multiple_choice
  "explanation": "Detailed explanation of the correct answer",
  "hints": ["hint 1", "hint 2"] // Array of helpful hints
}

Ensure the problem is:
- Clear and unambiguous
- Appropriate for the specified difficulty level
- Educational and focused on the topic
- Free from bias and errors
`;
  }

  /**
   * Create problem from template
   */
  async createFromTemplate(
    userId: string,
    templateId: string,
    customizations?: Partial<PracticeProblem>
  ): Promise<PracticeProblem> {
    // This would fetch template from database
    // For now, returning a mock implementation
    const template = await this.getTemplate(templateId);

    const problem: PracticeProblem = {
      id: uuidv4(),
      templateId,
      userId,
      topic: customizations?.topic || template.topic,
      subtopic: customizations?.subtopic || template.subtopic,
      difficultyLevel: customizations?.difficultyLevel || template.difficultyLevel,
      problemType: customizations?.problemType || template.problemType,
      question: this.processTemplate(template.questionTemplate, customizations),
      correctAnswer: template.correctAnswer,
      incorrectOptions: template.incorrectOptions,
      explanation: template.explanation,
      hints: template.hints,
      tags: template.tags,
      points: this.calculatePoints(customizations?.difficultyLevel || template.difficultyLevel),
      estimatedTime: this.estimateTime(template.problemType, template.difficultyLevel),
      aiGenerated: false,
    };

    return problem;
  }

  /**
   * Analyze user performance on a problem
   */
  analyzePerformance(attempts: PracticeAttempt[]): {
    accuracy: number;
    averageTime: number;
    improvementTrend: 'improving' | 'declining' | 'stable';
    commonMistakes: string[];
    recommendations: string[];
  } {
    if (attempts.length === 0) {
      return {
        accuracy: 0,
        averageTime: 0,
        improvementTrend: 'stable',
        commonMistakes: [],
        recommendations: [],
      };
    }

    const accuracy =
      (attempts.filter((a) => a.isCorrect).length / attempts.length) * 100;

    const averageTime =
      attempts.reduce((sum, a) => sum + a.timeSpent, 0) / attempts.length;

    // Calculate trend (last 3 vs first 3 attempts)
    const recentAttempts = attempts.slice(-3);
    const earlyAttempts = attempts.slice(0, 3);

    const recentAccuracy =
      (recentAttempts.filter((a) => a.isCorrect).length /
        Math.max(recentAttempts.length, 1)) *
      100;
    const earlyAccuracy =
      (earlyAttempts.filter((a) => a.isCorrect).length /
        Math.max(earlyAttempts.length, 1)) *
      100;

    const improvementTrend =
      recentAccuracy > earlyAccuracy + 10
        ? 'improving'
        : recentAccuracy < earlyAccuracy - 10
        ? 'declining'
        : 'stable';

    // Find common mistakes
    const mistakes = attempts
      .filter((a) => !a.isCorrect)
      .map((a) => a.mistakeType)
      .filter((m): m is string => m !== undefined);

    const mistakeCounts: { [key: string]: number } = {};
    mistakes.forEach((m) => {
      mistakeCounts[m] = (mistakeCounts[m] || 0) + 1;
    });

    const commonMistakes = Object.entries(mistakeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([mistake]) => mistake);

    // Generate recommendations
    const recommendations: string[] = [];
    if (accuracy < 50) {
      recommendations.push('Focus on reviewing fundamental concepts');
    } else if (accuracy < 80) {
      recommendations.push('Practice more problems at this difficulty level');
    } else {
      recommendations.push('Ready to move to higher difficulty');
    }

    if (averageTime > 180) {
      recommendations.push('Work on improving problem-solving speed');
    }

    if (commonMistakes.length > 0) {
      recommendations.push(
        `Pay special attention to: ${commonMistakes.join(', ')}`
      );
    }

    return {
      accuracy: Math.round(accuracy),
      averageTime: Math.round(averageTime),
      improvementTrend,
      commonMistakes,
      recommendations,
    };
  }

  /**
   * Adaptive difficulty adjustment
   */
  async adjustDifficulty(
    currentDifficulty: number,
    performance: { accuracy: number; averageTime: number }
  ): Promise<number> {
    // Simple adaptive algorithm
    if (performance.accuracy >= 90 && performance.averageTime < 120) {
      // High performance - increase difficulty
      return Math.min(100, currentDifficulty + 10);
    } else if (performance.accuracy < 60 || performance.averageTime > 300) {
      // Low performance - decrease difficulty
      return Math.max(0, currentDifficulty - 10);
    }

    return currentDifficulty;
  }

  /**
   * Recommend next problems based on performance
   */
  async recommendProblems(
    userId: string,
    topic: string,
    masteryScore: number
  ): Promise<{
    recommendedDifficulty: number;
    problemCount: number;
    focusAreas: string[];
  }> {
    const recommendedDifficulty = Math.round(masteryScore);
    const problemCount = masteryScore < 50 ? 10 : masteryScore < 80 ? 5 : 3;

    const focusAreas: string[] = [];
    if (masteryScore < 30) {
      focusAreas.push('Review fundamentals', 'Practice basic concepts');
    } else if (masteryScore < 70) {
      focusAreas.push('Apply concepts', 'Solve varied problems');
    } else {
      focusAreas.push('Advanced applications', 'Challenge problems');
    }

    return {
      recommendedDifficulty,
      problemCount,
      focusAreas,
    };
  }

  /**
   * Helper: Get template from database (mock)
   */
  private async getTemplate(templateId: string): Promise<ProblemTemplate> {
    // In real implementation, fetch from database
    throw new Error('Not implemented');
  }

  /**
   * Helper: Process template with customizations
   */
  private processTemplate(template: string, customizations?: any): string {
    let processed = template;

    if (customizations?.variables) {
      Object.entries(customizations.variables).forEach(([key, value]) => {
        processed = processed.replace(new RegExp(`{{${key}}}`, 'g'), value as string);
      });
    }

    return processed;
  }

  /**
   * Helper: Calculate points based on difficulty
   */
  private calculatePoints(difficulty: number): number {
    // Base: 10 points, scale with difficulty
    return Math.round(10 + (difficulty / 100) * 20);
  }

  /**
   * Helper: Estimate time based on problem type and difficulty
   */
  private estimateTime(problemType: string, difficulty: number): number {
    const baseTimes: { [key: string]: number } = {
      multiple_choice: 60,
      true_false: 30,
      short_answer: 120,
      fill_blank: 90,
      essay: 600,
      code: 900,
      numeric: 90,
    };

    const baseTime = baseTimes[problemType] || 120;
    const difficultyMultiplier = 1 + (difficulty / 100) * 0.5;

    return Math.round(baseTime * difficultyMultiplier);
  }

  /**
   * Generate personalized practice set
   */
  async generatePersonalizedSet(
    userId: string,
    subjectId: string,
    targetSkills: string[]
  ): Promise<{
    problems: PracticeProblem[];
    sessionPlan: {
      totalProblems: number;
      estimatedDuration: number;
      difficultyProgression: number[];
    };
  }> {
    // Fetch user's mastery data
    const masteryData = await this.getUserMasteryData(userId, subjectId);

    // Generate problems for each target skill
    const allProblems: PracticeProblem[] = [];
    const difficultyProgression: number[] = [];

    for (const skill of targetSkills) {
      const currentMastery = masteryData[skill] || 30;
      const targetDifficulty = this.adjustDifficulty(currentMastery, {
        accuracy: currentMastery,
        averageTime: 150,
      });

      difficultyProgression.push(targetDifficulty);

      const skillProblems = await this.generateProblems(userId, {
        topic: skill,
        difficultyLevel: targetDifficulty,
        problemType: 'multiple_choice',
        count: 5,
      });

      allProblems.push(...skillProblems);
    }

    return {
      problems: allProblems,
      sessionPlan: {
        totalProblems: allProblems.length,
        estimatedDuration: allProblems.reduce((sum, p) => sum + p.estimatedTime, 0),
        difficultyProgression,
      },
    };
  }

  /**
   * Helper: Get user mastery data (mock)
   */
  private async getUserMasteryData(
    userId: string,
    subjectId: string
  ): Promise<{ [key: string]: number }> {
    // In real implementation, fetch from database
    return {};
  }

  /**
   * Evaluate answer using AI for complex problems
   */
  async evaluateAnswer(
    problem: PracticeProblem,
    userAnswer: string
  ): Promise<{
    isCorrect: boolean;
    score: number;
    feedback: string;
    improvements: string[];
  }> {
    if (problem.problemType === 'multiple_choice' || problem.problemType === 'true_false') {
      const isCorrect = userAnswer.trim().toLowerCase() === problem.correctAnswer.trim().toLowerCase();
      return {
        isCorrect,
        score: isCorrect ? 100 : 0,
        feedback: isCorrect
          ? 'Correct! Well done.'
          : `Incorrect. The correct answer is: ${problem.correctAnswer}`,
        improvements: isCorrect ? [] : ['Review the explanation'],
      };
    }

    // For complex answers, use AI evaluation
    const prompt = `
Evaluate this answer to a practice problem.

Problem: ${problem.question}
Correct Answer: ${problem.correctAnswer}
Student Answer: ${userAnswer}

Provide a score (0-100) and constructive feedback.
Return JSON with: { "isCorrect": boolean, "score": number, "feedback": string, "improvements": string[] }
`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator. Evaluate answers fairly and provide helpful feedback.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const response = completion.choices[0].message.content;
      if (!response) throw new Error('No response from AI');

      const result = JSON.parse(response);
      return result;
    } catch (error: any) {
      console.error('Error evaluating answer:', error);
      return {
        isCorrect: false,
        score: 0,
        feedback: 'Unable to evaluate answer automatically.',
        improvements: ['Please review the concept and try again'],
      };
    }
  }
}

export default new AIPracticeProblemsService();
