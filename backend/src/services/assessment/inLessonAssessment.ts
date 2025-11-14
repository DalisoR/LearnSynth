import { Question, QuestionResponse, BloomLevel } from './types';
import { LessonStructure, Topic } from '../lessonGenerator/types';

export interface Checkpoint {
  id: string;
  position: number; // percentage through lesson (0-100)
  question: string;
  type: 'reflection' | 'knowledge-check' | 'prediction';
  prompt?: string;
  expectedResponse?: string;
  hint?: string;
  points: number;
}

export interface InLessonAssessment {
  checkpoints: Checkpoint[];
  realTimeFeedback: RealTimeFeedback;
  remediationTriggers: RemediationTrigger[];
}

export interface RealTimeFeedback {
  showImmediateFeedback: boolean;
  showHints: boolean;
  allowRetry: boolean;
  maxRetries: number;
  adaptiveDifficulty: boolean;
}

export interface RemediationTrigger {
  condition: 'low-score' | 'high-time' | 'multiple-retries';
  threshold: number;
  action: 'show-hint' | 'suggest-review' | 'provide-example' | 'offer-break';
  message: string;
}

export class InLessonAssessmentEngine {
  private checkpoints: Checkpoint[] = [];

  async generateCheckpointQuiz(
    topic: Topic,
    position: number, // 0-100 percentage through topic
    config: {
      includeReflection?: boolean;
      includePrediction?: boolean;
      difficulty?: number;
    } = {}
  ): Promise<Checkpoint[]> {
    const { includeReflection = true, includePrediction = false } = config;

    const checkpoints: Checkpoint[] = [];

    // Mid-topic checkpoint (50-60%)
    if (position >= 50 && position <= 60 && includeReflection) {
      checkpoints.push({
        id: this.generateId(),
        position: 55,
        question: `Let's pause and reflect. What is the most important thing you've learned about ${topic.title} so far?`,
        type: 'reflection',
        prompt: 'Take a moment to think about the key concepts.',
        expectedResponse: 'Any coherent summary of learning.',
        hint: 'Think about what builds upon previous knowledge.',
        points: 1
      });
    }

    // Knowledge check checkpoint (25-30% or 70-75%)
    const shouldHaveKnowledgeCheck = position === 25 || position === 70;
    if (shouldHaveKnowledgeCheck) {
      checkpoints.push(this.generateKnowledgeCheck(topic, position));
    }

    // Prediction checkpoint (end of topic)
    if (includePrediction && position >= 80) {
      checkpoints.push({
        id: this.generateId(),
        position: 85,
        question: `Based on what you've learned, predict how ${topic.title} might be applied in a real-world scenario.`,
        type: 'prediction',
        expectedResponse: 'A reasonable application of the concept.',
        hint: 'Think about practical uses.',
        points: 1
      });
    }

    this.checkpoints = checkpoints;
    return checkpoints;
  }

  private generateKnowledgeCheck(topic: Topic, position: number): Checkpoint {
    // Generate a simple question based on topic content
    if (position === 25) {
      return {
        id: this.generateId(),
        position: 25,
        question: `Quick check: What is the main purpose of ${topic.title}?`,
        type: 'knowledge-check',
        expectedResponse: 'To achieve X goal or solve Y problem.',
        hint: 'Think about why this topic matters.',
        points: 1
      };
    } else {
      return {
        id: this.generateId(),
        position: 70,
        question: `Knowledge check: How does ${topic.title} connect to what you learned earlier?`,
        type: 'knowledge-check',
        expectedResponse: 'It builds on concept A by adding concept B.',
        hint: 'Look for the relationship between concepts.',
        points: 1
      };
    }
  }

  async processCheckpointResponse(
    checkpoint: Checkpoint,
    response: string
  ): Promise<CheckpointResult> {
    const result: CheckpointResult = {
      checkpointId: checkpoint.id,
      correct: this.evaluateResponse(checkpoint, response),
      feedback: '',
      hint: '',
      pointsEarned: 0,
      needsRemediation: false
    };

    // Generate feedback
    if (result.correct) {
      result.feedback = this.generatePositiveFeedback(checkpoint);
      result.pointsEarned = checkpoint.points;
    } else {
      result.feedback = this.generateCorrectiveFeedback(checkpoint);
      result.hint = checkpoint.hint || 'Review the material and try again.';
    }

    // Check if remediation is needed
    if (!result.correct) {
      result.needsRemediation = true;
    }

    return result;
  }

  private evaluateResponse(checkpoint: Checkpoint, response: string): boolean {
    if (checkpoint.type === 'knowledge-check' && checkpoint.expectedResponse) {
      // Simple keyword matching for now
      // In production, could use semantic similarity
      const responseLower = response.toLowerCase();
      const expectedLower = checkpoint.expectedResponse.toLowerCase();

      const responseWords = new Set(responseLower.split(/\s+/));
      const expectedWords = new Set(expectedLower.split(/\s+/));

      const overlap = Array.from(responseWords).filter(word =>
        expectedWords.has(word) && word.length > 3
      ).length;

      const threshold = Math.max(1, expectedWords.size * 0.3);
      return overlap >= threshold;
    }

    // For reflection and prediction, always consider correct
    // (subjective responses)
    return true;
  }

  private generatePositiveFeedback(checkpoint: Checkpoint): string {
    const feedback = [
      'Excellent! You\'re on the right track.',
      'Great job! Your understanding is clear.',
      'Well done! That\'s exactly right.',
      'Perfect! You\'ve grasped the key concept.',
      'Excellent work! Keep it up.'
    ];

    return feedback[Math.floor(Math.random() * feedback.length)];
  }

  private generateCorrectiveFeedback(checkpoint: Checkpoint): string {
    const feedback = [
      'Not quite. Let me help clarify.',
      'Let\'s review this together.',
      'Good attempt! Here\'s what to consider.',
      'You\'re thinking in the right direction.',
      'Let\'s work through this step by step.'
    ];

    return feedback[Math.floor(Math.random() * feedback.length)];
  }

  async generateAdaptiveHint(
    checkpoint: Checkpoint,
    previousAttempts: number
  ): Promise<string> {
    const hints = [
      `Think about the main purpose of ${checkpoint.question}`,
      'Consider what you already know about this topic',
      'Look for clues in the question itself',
      'Connect this to real-world examples',
      'Break the concept into smaller parts'
    ];

    // Progressive disclosure - reveal more detailed hints on subsequent attempts
    const hintIndex = Math.min(previousAttempts - 1, hints.length - 1);
    return hints[hintIndex] || 'Review the lesson content carefully.';
  }

  getProgressMetrics(checkpoints: Checkpoint[]): ProgressMetrics {
    const totalCheckpoints = checkpoints.length;
    const completed = checkpoints.filter(c => c.id).length;

    return {
      totalCheckpoints,
      completedCheckpoints: completed,
      completionRate: totalCheckpoints > 0 ? completed / totalCheckpoints : 0,
      pointsPossible: checkpoints.reduce((sum, c) => sum + c.points, 0),
      pointsEarned: 0, // Will be calculated from responses
      engagementScore: this.calculateEngagementScore(checkpoints)
    };
  }

  private calculateEngagementScore(checkpoints: Checkpoint[]): number {
    // Simple engagement metric based on checkpoint variety
    const types = new Set(checkpoints.map(c => c.type));
    const variety = types.size / 3; // Assuming 3 types max

    return Math.min(variety * 100, 100);
  }

  identifyLearningGaps(
    checkpointResults: CheckpointResult[],
    topic: Topic
  ): LearningGap[] {
    const gaps: LearningGap[] = [];

    const failedCheckpoints = checkpointResults.filter(r => !r.correct);
    const topics = new Set<string>([topic.title]);

    failedCheckpoints.forEach(result => {
      gaps.push({
        topic: topic.title,
        bloomLevel: 'understand', // Default for checkpoints
        masteryScore: 50, // Assuming partial knowledge
        recommendedActions: [
          'Review the topic section again',
          'Try the practice questions',
          'Watch the visual aids',
          'Check the key terms glossary'
        ],
        relatedQuestions: [result.checkpointId]
      });
    });

    return gaps;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

export interface CheckpointResult {
  checkpointId: string;
  correct: boolean;
  feedback: string;
  hint: string;
  pointsEarned: number;
  needsRemediation: boolean;
}

export interface ProgressMetrics {
  totalCheckpoints: number;
  completedCheckpoints: number;
  completionRate: number;
  pointsPossible: number;
  pointsEarned: number;
  engagementScore: number;
}

export interface LearningGap {
  topic: string;
  bloomLevel: BloomLevel;
  masteryScore: number;
  recommendedActions: string[];
  relatedQuestions: string[];
}

export const inLessonAssessmentEngine = new InLessonAssessmentEngine();
