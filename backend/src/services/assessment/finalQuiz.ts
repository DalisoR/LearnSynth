import { Assessment, AssessmentAttempt, Question, QuestionResponse, BloomLevel } from './types';
import { LessonStructure } from '../lessonGenerator/types';
import { questionGenerator } from './questionGenerator';

export interface FinalQuizResult {
  assessment: Assessment;
  attempt: AssessmentAttempt;
  score: number;
  passed: boolean;
  feedback: QuizFeedback;
  recommendations: string[];
}

export interface QuizFeedback {
  overallComment: string;
  strengths: string[];
  weaknesses: string[];
  bloomLevelBreakdown: { [key in BloomLevel]: number };
  topicBreakdown: { [key: string]: number };
  timeAnalysis: {
    totalTime: number;
    averagePerQuestion: number;
    timeManagementScore: number;
  };
}

export class FinalQuizGenerator {
  private questionSpecs: Array<{
    bloomLevel: BloomLevel;
    count: number;
    topic: string;
  }> = [];

  async generateFinalQuiz(
    lesson: LessonStructure,
    options: {
      questionCount?: number;
      timeLimit?: number;
      focusAreas?: string[];
      difficulty?: number;
    } = {}
  ): Promise<Assessment> {
    const {
      questionCount = 15,
      timeLimit = 30,
      focusAreas = lesson.topics.map(t => t.title),
      difficulty = 3
    } = options;

    // Distribute questions across Bloom's taxonomy
    this.distributeQuestions(lesson, questionCount, focusAreas);

    // Generate questions
    const questions: Question[] = [];
    const context = this.buildContext(lesson);

    for (const spec of this.questionSpecs) {
      const batch = await questionGenerator.generateQuestionsBatch(
        Array(spec.count).fill(null).map(() => ({
          topic: spec.topic,
          bloomLevel: spec.bloomLevel,
          type: this.selectQuestionType(spec.bloomLevel),
          difficulty
        })),
        context
      );

      questions.push(...batch);
    }

    // Shuffle questions
    const shuffledQuestions = this.shuffleArray(questions);

    return {
      id: this.generateId(),
      lessonId: lesson.id,
      type: 'final',
      title: `Final Assessment: ${lesson.title}`,
      description: 'Comprehensive assessment covering all learning objectives',
      questions: shuffledQuestions,
      timeLimit,
      passingScore: 75,
      maxAttempts: 2,
      randomizeQuestions: true,
      showCorrectAnswers: true,
      allowReview: true,
      bloomDistribution: this.calculateBloomDistribution(lesson),
      createdAt: new Date()
    };
  }

  async evaluateQuiz(
    assessment: Assessment,
    responses: QuestionResponse[]
  ): Promise<FinalQuizResult> {
    // Grade the quiz
    const gradedResponses = await this.gradeResponses(assessment.questions, responses);

    // Calculate score
    const score = this.calculateScore(gradedResponses, assessment.questions);
    const passed = score >= assessment.passingScore;

    // Generate feedback
    const feedback = await this.generateFeedback(assessment, gradedResponses, score);

    // Provide recommendations
    const recommendations = this.generateRecommendations(
      assessment,
      gradedResponses,
      score,
      passed
    );

    return {
      assessment,
      attempt: {
        id: this.generateId(),
        assessmentId: assessment.id,
        userId: 'current-user', // Would come from auth
        responses: gradedResponses,
        score,
        timeSpent: responses.reduce((sum, r) => sum + r.timeSpent, 0),
        startedAt: new Date(),
        completedAt: new Date(),
        attemptNumber: 1
      },
      score,
      passed,
      feedback,
      recommendations
    };
  }

  private distributeQuestions(
    lesson: LessonStructure,
    totalQuestions: number,
    focusAreas: string[]
  ): void {
    this.questionSpecs = [];

    // Bloom distribution for final quiz
    const bloomDistribution = {
      remember: 0.15,
      understand: 0.20,
      apply: 0.25,
      analyze: 0.20,
      evaluate: 0.15,
      create: 0.05
    };

    // Calculate questions per Bloom level
    Object.entries(bloomDistribution).forEach(([bloom, percentage]) => {
      const count = Math.floor(totalQuestions * percentage);
      if (count > 0) {
        focusAreas.forEach(topic => {
          this.questionSpecs.push({
            bloomLevel: bloom as BloomLevel,
            count: Math.ceil(count / focusAreas.length),
            topic
          });
        });
      }
    });
  }

  private selectQuestionType(bloomLevel: BloomLevel): string {
    const typeMap: { [key in BloomLevel]: string[] } = {
      remember: ['mcq', 'fill-blank'],
      understand: ['mcq', 'matching', 'short-answer'],
      apply: ['scenario', 'short-answer', 'mcq'],
      analyze: ['short-answer', 'scenario'],
      evaluate: ['essay', 'scenario'],
      create: ['essay']
    };

    const types = typeMap[bloomLevel];
    return types[Math.floor(Math.random() * types.length)];
  }

  private buildContext(lesson: LessonStructure): string {
    return `
      Lesson: ${lesson.title}
      Objectives: ${lesson.objectives.primary.join(', ')}
      Topics: ${lesson.topics.map(t => t.title).join(', ')}
      Prerequisites: ${lesson.prerequisites.join(', ')}
    `;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private async gradeResponses(
    questions: Question[],
    responses: QuestionResponse[]
  ): Promise<QuestionResponse[]> {
    return responses.map(response => {
      const question = questions.find(q => q.id === response.questionId);
      if (!question) {
        return { ...response, isCorrect: false };
      }

      const isCorrect = this.evaluateAnswer(question, response.response);
      return {
        ...response,
        isCorrect
      };
    });
  }

  private evaluateAnswer(question: Question, response: string | string[]): boolean {
    const correct = question.correctAnswer;

    if (typeof response === 'string' && typeof correct === 'string') {
      return this.compareAnswers(response, correct);
    }

    if (Array.isArray(response) && Array.isArray(correct)) {
      return response.length === correct.length &&
             response.every(r => correct.includes(r));
    }

    return false;
  }

  private compareAnswers(studentAnswer: string, correctAnswer: string): boolean {
    // Normalize answers for comparison
    const normalize = (s: string) => s.toLowerCase().trim();

    const normalizedStudent = normalize(studentAnswer);
    const normalizedCorrect = normalize(correctAnswer);

    if (normalizedStudent === normalizedCorrect) return true;

    // Check for keyword overlap
    const studentWords = new Set(normalizedStudent.split(/\s+/));
    const correctWords = new Set(normalizedCorrect.split(/\s+/));

    const overlap = Array.from(studentWords).filter(word =>
      correctWords.has(word) && word.length > 3
    ).length;

    const threshold = Math.max(2, correctWords.size * 0.5);
    return overlap >= threshold;
  }

  private calculateScore(
    responses: QuestionResponse[],
    questions: Question[]
  ): number {
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    const earnedPoints = responses
      .filter(r => r.isCorrect)
      .reduce((sum, r) => {
        const question = questions.find(q => q.id === r.questionId);
        return sum + (question?.points || 0);
      }, 0);

    return totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  }

  private async generateFeedback(
    assessment: Assessment,
    responses: QuestionResponse[],
    score: number
  ): Promise<QuizFeedback> {
    const questions = assessment.questions;
    const responsesByQuestion = new Map(
      responses.map(r => [r.questionId, r])
    );

    // Calculate Bloom level performance
    const bloomPerformance: { [key in BloomLevel]: number } = {
      remember: 0,
      understand: 0,
      apply: 0,
      analyze: 0,
      evaluate: 0,
      create: 0
    };

    let totalQuestions = 0;

    questions.forEach(question => {
      const response = responsesByQuestion.get(question.id);
      if (response) {
        totalQuestions++;
        if (response.isCorrect) {
          bloomPerformance[question.bloomLevel]++;
        }
      }
    });

    // Convert to percentages
    Object.keys(bloomPerformance).forEach(level => {
      const key = level as BloomLevel;
      const count = questions.filter(q => q.bloomLevel === key).length;
      bloomPerformance[key] = count > 0 ? (bloomPerformance[key] / count) * 100 : 0;
    });

    // Calculate topic breakdown
    const topicBreakdown: { [key: string]: number } = {};
    questions.forEach(question => {
      if (!topicBreakdown[question.topic]) {
        topicBreakdown[question.topic] = { correct: 0, total: 0 };
      }
      topicBreakdown[question.topic].total++;
      const response = responsesByQuestion.get(question.id);
      if (response?.isCorrect) {
        topicBreakdown[question.topic].correct++;
      }
    });

    const topicPercentages: { [key: string]: number } = {};
    Object.entries(topicBreakdown).forEach(([topic, stats]) => {
      topicPercentages[topic] = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    });

    // Generate strengths and weaknesses
    const strengths = Object.entries(topicPercentages)
      .filter(([, score]) => score >= 75)
      .map(([topic]) => topic);

    const weaknesses = Object.entries(topicPercentages)
      .filter(([, score]) => score < 60)
      .map(([topic]) => topic);

    return {
      overallComment: this.generateOverallComment(score),
      strengths: strengths.length > 0 ? strengths : ['Showed effort in all areas'],
      weaknesses: weaknesses.length > 0 ? weaknesses : ['Room for improvement'],
      bloomLevelBreakdown: bloomPerformance,
      topicBreakdown: topicPercentages,
      timeAnalysis: {
        totalTime: responses.reduce((sum, r) => sum + r.timeSpent, 0),
        averagePerQuestion: responses.length > 0
          ? responses.reduce((sum, r) => sum + r.timeSpent, 0) / responses.length
          : 0,
        timeManagementScore: this.calculateTimeManagementScore(responses)
      }
    };
  }

  private generateOverallComment(score: number): string {
    if (score >= 90) {
      return 'Outstanding performance! You have mastered the material.';
    } else if (score >= 75) {
      return 'Good job! You have solid understanding of the concepts.';
    } else if (score >= 60) {
      return 'You passed! Review the topics where you struggled.';
    } else {
      return 'You need more practice. Focus on the core concepts.';
    }
  }

  private calculateTimeManagementScore(responses: QuestionResponse[]): number {
    const averageTime = responses.reduce((sum, r) => sum + r.timeSpent, 0) / responses.length;

    // Optimal time per question is about 60-90 seconds
    if (averageTime >= 60 && averageTime <= 90) return 100;
    if (averageTime < 60) return 70; // Too fast, might be guessing
    if (averageTime > 120) return 60; // Too slow, might be struggling

    return 85;
  }

  private generateRecommendations(
    assessment: Assessment,
    responses: QuestionResponse[],
    score: number,
    passed: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (!passed || score < 75) {
      recommendations.push('Review the lesson content, especially topics with low scores');
      recommendations.push('Practice with additional questions on weak areas');
    }

    const slowQuestions = responses.filter(r => r.timeSpent > 120);
    if (slowQuestions.length > 0) {
      recommendations.push('Practice working through problems more efficiently');
    }

    const questions = assessment.questions;
    const weakBloomLevels = this.identifyWeakBloomLevels(responses, questions);

    if (weakBloomLevels.length > 0) {
      recommendations.push(`Focus on ${weakBloomLevels.join(', ')} skills`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue practicing to reinforce your knowledge');
    }

    return recommendations;
  }

  private identifyWeakBloomLevels(
    responses: QuestionResponse[],
    questions: Question[]
  ): string[] {
    const weakLevels: string[] = [];
    const levelStats = new Map<BloomLevel, { correct: number; total: number }>();

    responses.forEach(response => {
      const question = questions.find(q => q.id === response.questionId);
      if (question) {
        const stats = levelStats.get(question.bloomLevel) || { correct: 0, total: 0 };
        stats.total++;
        if (response.isCorrect) stats.correct++;
        levelStats.set(question.bloomLevel, stats);
      }
    });

    levelStats.forEach((stats, level) => {
      const percentage = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      if (percentage < 60) {
        weakLevels.push(level);
      }
    });

    return weakLevels;
  }

  private calculateBloomDistribution(lesson: LessonStructure): any {
    return {
      remember: 15,
      understand: 20,
      apply: 25,
      analyze: 20,
      evaluate: 15,
      create: 5
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

export const finalQuizGenerator = new FinalQuizGenerator();
