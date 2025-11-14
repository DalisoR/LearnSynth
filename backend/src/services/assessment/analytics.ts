import {
  Assessment,
  AssessmentAttempt,
  AssessmentAnalytics,
  QuestionAnalytics,
  LearningGap,
  CompetencyMapping
} from './types';

export class AssessmentAnalyticsEngine {
  async generateAnalytics(
    assessment: Assessment,
    attempts: AssessmentAttempt[]
  ): Promise<AssessmentAnalytics> {
    const analytics: AssessmentAnalytics = {
      assessmentId: assessment.id,
      totalAttempts: attempts.length,
      averageScore: this.calculateAverageScore(attempts),
      averageTime: this.calculateAverageTime(attempts),
      passRate: this.calculatePassRate(attempts, assessment.passingScore),
      questionAnalytics: this.analyzeQuestions(assessment, attempts),
      bloomLevelPerformance: this.analyzeBloomLevels(assessment, attempts),
      difficultyAnalysis: this.analyzeDifficulty(assessment, attempts)
    };

    return analytics;
  }

  private calculateAverageScore(attempts: AssessmentAttempt[]): number {
    if (attempts.length === 0) return 0;
    const total = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
    return total / attempts.length;
  }

  private calculateAverageTime(attempts: AssessmentAttempt[]): number {
    if (attempts.length === 0) return 0;
    const total = attempts.reduce((sum, attempt) => sum + attempt.timeSpent, 0);
    return total / attempts.length;
  }

  private calculatePassRate(attempts: AssessmentAttempt[], passingScore: number): number {
    if (attempts.length === 0) return 0;
    const passed = attempts.filter(attempt => attempt.score >= passingScore).length;
    return (passed / attempts.length) * 100;
  }

  private analyzeQuestions(
    assessment: Assessment,
    attempts: AssessmentAttempt[]
  ): QuestionAnalytics[] {
    return assessment.questions.map(question => {
      const questionAttempts = this.getQuestionAttempts(question.id, attempts);

      const analytics: QuestionAnalytics = {
        questionId: question.id,
        totalAttempts: questionAttempts.length,
        correctAnswers: questionAttempts.filter(r => r.isCorrect).length,
        incorrectAnswers: questionAttempts.filter(r => !r.isCorrect).length,
        averageTime: this.calculateAverageQuestionTime(question.id, attempts),
        hintUsage: this.calculateHintUsage(question.id, attempts),
        difficultyRating: this.calculateDifficultyRating(question.id, attempts)
      };

      return analytics;
    });
  }

  private getQuestionAttempts(questionId: string, attempts: AssessmentAttempt[]) {
    const allResponses: any[] = [];
    attempts.forEach(attempt => {
      attempt.responses.forEach(response => {
        if (response.questionId === questionId) {
          allResponses.push(response);
        }
      });
    });
    return allResponses;
  }

  private calculateAverageQuestionTime(questionId: string, attempts: AssessmentAttempt[]): number {
    const questionAttempts = this.getQuestionAttempts(questionId, attempts);
    if (questionAttempts.length === 0) return 0;

    const totalTime = questionAttempts.reduce((sum, attempt) => sum + attempt.timeSpent, 0);
    return totalTime / questionAttempts.length;
  }

  private calculateHintUsage(questionId: string, attempts: AssessmentAttempt[]): number {
    const questionAttempts = this.getQuestionAttempts(questionId, attempts);
    return questionAttempts.reduce((sum, attempt) => sum + attempt.hintsUsed, 0);
  }

  private calculateDifficultyRating(questionId: string, attempts: AssessmentAttempt[]): number {
    // Calculate actual difficulty based on performance
    const questionAttempts = this.getQuestionAttempts(questionId, attempts);
    if (questionAttempts.length === 0) return 0;

    const correctRate = questionAttempts.filter(r => r.isCorrect).length / questionAttempts.length;

    // Convert to 1-5 difficulty scale (lower correct rate = higher difficulty)
    return Math.max(1, Math.min(5, 5 - correctRate * 4));
  }

  private analyzeBloomLevels(
    assessment: Assessment,
    attempts: AssessmentAttempt[]
  ): { [key: string]: number } {
    const bloomStats: { [key: string]: { correct: number; total: number } } = {};

    assessment.questions.forEach(question => {
      const bloomLevel = question.bloomLevel;
      if (!bloomStats[bloomLevel]) {
        bloomStats[bloomLevel] = { correct: 0, total: 0 };
      }

      const questionAttempts = this.getQuestionAttempts(question.id, attempts);
      bloomStats[bloomLevel].total += questionAttempts.length;
      bloomStats[bloomLevel].correct += questionAttempts.filter(r => r.isCorrect).length;
    });

    // Convert to percentages
    const result: { [key: string]: number } = {};
    Object.entries(bloomStats).forEach(([level, stats]) => {
      result[level] = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    });

    return result;
  }

  private analyzeDifficulty(
    assessment: Assessment,
    attempts: AssessmentAttempt[]
  ): { [key: number]: number } {
    const difficultyStats: { [key: number]: { correct: number; total: number } } = {};

    assessment.questions.forEach(question => {
      const difficulty = question.difficulty;
      if (!difficultyStats[difficulty]) {
        difficultyStats[difficulty] = { correct: 0, total: 0 };
      }

      const questionAttempts = this.getQuestionAttempts(question.id, attempts);
      difficultyStats[difficulty].total += questionAttempts.length;
      difficultyStats[difficulty].correct += questionAttempts.filter(r => r.isCorrect).length;
    });

    // Convert to percentages
    const result: { [key: number]: number } = {};
    Object.entries(difficultyStats).forEach(([diff, stats]) => {
      result[parseInt(diff)] = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    });

    return result;
  }

  async identifyLearningGaps(
    userId: string,
    lessonId: string,
    allAttempts: AssessmentAttempt[]
  ): Promise<LearningGap[]> {
    const userAttempts = allAttempts.filter(a => a.userId === userId && a.assessmentId === lessonId);
    const learningGaps: LearningGap[] = [];

    // Analyze performance by topic
    const topicPerformance = this.analyzeTopicPerformance(userAttempts);

    Object.entries(topicPerformance).forEach(([topic, performance]) => {
      if (performance.score < 70) {
        learningGaps.push({
          topic,
          bloomLevel: 'understand', // Default
          masteryScore: performance.score,
          recommendedActions: this.generateRecommendations(topic, performance.score),
          relatedQuestions: performance.questions
        });
      }
    });

    return learningGaps;
  }

  private analyzeTopicPerformance(attempts: AssessmentAttempt[]): {
    [topic: string]: { score: number; questions: string[] }
  } {
    const topicStats: { [topic: string]: { correct: number; total: number; questions: string[] } } = {};

    attempts.forEach(attempt => {
      attempt.responses.forEach(response => {
        // In a real implementation, we'd have question metadata
        // This is a simplified version
        const topic = 'General'; // Placeholder

        if (!topicStats[topic]) {
          topicStats[topic] = { correct: 0, total: 0, questions: [] };
        }

        topicStats[topic].total++;
        if (response.isCorrect) {
          topicStats[topic].correct++;
        }
        if (!topicStats[topic].questions.includes(response.questionId)) {
          topicStats[topic].questions.push(response.questionId);
        }
      });
    });

    // Convert to percentages
    const result: { [topic: string]: { score: number; questions: string[] } } = {};
    Object.entries(topicStats).forEach(([topic, stats]) => {
      result[topic] = {
        score: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
        questions: stats.questions
      };
    });

    return result;
  }

  private generateRecommendations(topic: string, score: number): string[] {
    const recommendations: string[] = [];

    if (score < 50) {
      recommendations.push(`Start from the beginning with ${topic}`);
      recommendations.push('Watch the lesson videos');
      recommendations.push('Review key definitions');
    } else if (score < 70) {
      recommendations.push(`Practice more questions on ${topic}`);
      recommendations.push('Review examples and case studies');
      recommendations.push('Ask for help if concepts are unclear');
    } else {
      recommendations.push(`Reinforce ${topic} with additional practice`);
      recommendations.push('Try more advanced questions');
    }

    return recommendations;
  }

  async createCompetencyMapping(
    assessment: Assessment,
    userAttempts: AssessmentAttempt[]
  ): Promise<CompetencyMapping[]> {
    // This would map competencies to questions based on learning objectives
    // Simplified implementation

    const competency: CompetencyMapping = {
      competency: assessment.title,
      requiredQuestions: assessment.questions.map(q => q.id),
      masteryThreshold: assessment.passingScore,
      currentLevel: this.calculateCompetencyLevel(userAttempts, assessment)
    };

    return [competency];
  }

  private calculateCompetencyLevel(
    attempts: AssessmentAttempt[],
    assessment: Assessment
  ): number {
    if (attempts.length === 0) return 0;

    // Use the best attempt
    const bestAttempt = attempts.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    return bestAttempt.score;
  }

  generatePredictiveInsights(
    analytics: AssessmentAnalytics
  ): PredictiveInsights {
    const insights: PredictiveInsights = {
      studentLikelyToPass: analytics.averageScore >= analytics.passRate,
      recommendedNextSteps: [],
      riskFactors: [],
      strengthsToLeverage: []
    };

    // Generate insights based on analytics
    if (analytics.averageScore < 60) {
      insights.riskFactors.push('Low average score - additional support needed');
    }

    if (analytics.averageTime < 60000) {
      insights.riskFactors.push('Very fast completion - possible guessing');
    }

    if (analytics.passRate < 50) {
      insights.recommendedNextSteps.push('Consider remedial content before retaking');
    }

    // Identify strengths
    const strongBloomLevels = Object.entries(analytics.bloomLevelPerformance)
      .filter(([, score]) => score >= 75)
      .map(([level]) => level);

    if (strongBloomLevels.length > 0) {
      insights.strengthsToLeverage = strongBloomLevels;
    }

    return insights;
  }

  exportAnalyticsReport(
    analytics: AssessmentAnalytics,
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify(analytics, null, 2);
      case 'csv':
        return this.convertToCSV(analytics);
      default:
        return JSON.stringify(analytics, null, 2);
    }
  }

  private convertToCSV(analytics: AssessmentAnalytics): string {
    // Simple CSV conversion
    let csv = 'Question ID,Total Attempts,Correct,Incorrect,Avg Time (s),Hint Usage\n';

    analytics.questionAnalytics.forEach(q => {
      csv += `${q.questionId},${q.totalAttempts},${q.correctAnswers},${q.incorrectAnswers},${q.averageTime},${q.hintUsage}\n`;
    });

    return csv;
  }
}

export interface PredictiveInsights {
  studentLikelyToPass: boolean;
  recommendedNextSteps: string[];
  riskFactors: string[];
  strengthsToLeverage: string[];
}

export const assessmentAnalyticsEngine = new AssessmentAnalyticsEngine();
