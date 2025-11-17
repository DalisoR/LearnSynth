export interface ReviewResult {
  quality: number; // 0-5 scale
  responseTime: number; // milliseconds
  timestamp: number;
}

export interface FlashcardData {
  id: string;
  front: string;
  back: string;
  imageUrl?: string;
  occlusionData?: ImageOcclusionData;
  tags: string[];
  difficulty: number; // 0-100
  createdAt: number;
  updatedAt: number;
}

export interface SpacedRepetitionData {
  flashcardId: string;
  easinessFactor: number; // SM-2 parameter (default 2.5)
  interval: number; // days until next review
  repetitions: number; // consecutive correct recalls
  nextReviewDate: number; // timestamp
  lastReviewedAt?: number;
  reviewHistory: ReviewResult[];
  totalReviews: number;
  correctReviews: number;
  averageResponseTime: number;
}

export interface StudySession {
  id: string;
  userId: string;
  startTime: number;
  endTime?: number;
  cardsReviewed: number;
  cardsCorrect: number;
  totalResponseTime: number;
  sessionType: 'review' | 'new' | 'mixed';
}

export interface StudyQueue {
  dueCards: FlashcardData[];
  newCards: FlashcardData[];
  totalCount: number;
  reviewCount: number;
  newCount: number;
}

class SpacedRepetitionService {
  /**
   * Calculate next review date using SM-2 algorithm
   */
  calculateNextReview(
    currentData: SpacedRepetitionData,
    result: ReviewResult
  ): SpacedRepetitionData {
    let { easinessFactor, interval, repetitions } = currentData;

    // If quality is 0-2, reset repetition count
    if (result.quality < 3) {
      repetitions = 0;
      interval = 1;
    } else {
      // If quality is 3+, increment repetition count
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easinessFactor);
      }
      repetitions += 1;
    }

    // Update easiness factor
    easinessFactor = easinessFactor + (0.1 - (5 - result.quality) * (0.08 + (5 - result.quality) * 0.02));

    // Ensure easiness factor doesn't go below 1.3
    if (easinessFactor < 1.3) {
      easinessFactor = 1.3;
    }

    // Calculate next review date
    const nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;

    // Update review history
    const reviewHistory = [...currentData.reviewHistory, result];

    // Calculate average response time
    const totalResponseTime = currentData.totalReviews * currentData.averageResponseTime + result.responseTime;
    const totalReviews = currentData.totalReviews + 1;

    return {
      ...currentData,
      easinessFactor,
      interval,
      repetitions,
      nextReviewDate,
      lastReviewedAt: Date.now(),
      reviewHistory,
      totalReviews,
      correctReviews: result.quality >= 3 ? currentData.correctReviews + 1 : currentData.correctReviews,
      averageResponseTime: totalResponseTime / totalReviews,
    };
  }

  /**
   * Get cards due for review
   */
  async getDueCards(userId: string, limit: number = 20): Promise<FlashcardData[]> {
    // This would query the database for cards where nextReviewDate <= now
    // For now, returning mock data
    return [];
  }

  /**
   * Get new cards for learning
   */
  async getNewCards(userId: string, limit: number = 10): Promise<FlashcardData[]> {
    // This would query for cards that haven't been studied yet
    // For now, returning mock data
    return [];
  }

  /**
   * Calculate difficulty rating for a flashcard
   */
  calculateDifficulty(srData: SpacedRepetitionData): number {
    if (srData.totalReviews === 0) return 50; // Default medium difficulty

    // Calculate based on review history
    const failureRate = 1 - (srData.correctReviews / srData.totalReviews);
    const responseTimeFactor = Math.min(srData.averageResponseTime / 10000, 1); // Normalize to max 10s

    // Difficulty = failure rate (70%) + response time (30%)
    const difficulty = (failureRate * 0.7 + responseTimeFactor * 0.3) * 100;

    return Math.max(0, Math.min(100, difficulty));
  }

  /**
   * Get study queue for a user
   */
  async getStudyQueue(userId: string): Promise<StudyQueue> {
    const dueCards = await this.getDueCards(userId);
    const newCards = await this.getNewCards(userId);

    return {
      dueCards,
      newCards,
      totalCount: dueCards.length + newCards.length,
      reviewCount: dueCards.length,
      newCount: newCards.length,
    };
  }

  /**
   * Generate study session statistics
   */
  generateSessionStats(session: StudySession): {
    accuracy: number;
    averageResponseTime: number;
    cardsPerMinute: number;
    difficulty: 'easy' | 'medium' | 'hard';
  } {
    const accuracy = session.cardsReviewed > 0
      ? (session.cardsCorrect / session.cardsReviewed) * 100
      : 0;

    const averageResponseTime = session.cardsReviewed > 0
      ? session.totalResponseTime / session.cardsReviewed
      : 0;

    const durationMinutes = session.endTime
      ? (session.endTime - session.startTime) / 60000
      : 1;

    const cardsPerMinute = session.cardsReviewed / durationMinutes;

    const difficulty = cardsPerMinute > 1 ? 'easy' : cardsPerMinute > 0.5 ? 'medium' : 'hard';

    return {
      accuracy: Math.round(accuracy),
      averageResponseTime: Math.round(averageResponseTime),
      cardsPerMinute: Math.round(cardsPerMinute * 10) / 10,
      difficulty,
    };
  }

  /**
   * Recommend cards for review based on difficulty
   */
  recommendCards(cards: FlashcardData[], count: number): FlashcardData[] {
    // Sort by difficulty (highest first) and shuffle slightly for variety
    return cards
      .sort((a, b) => b.difficulty - a.difficulty)
      .slice(0, count);
  }

  /**
   * Calculate retention rate
   */
  calculateRetentionRate(correctReviews: number, totalReviews: number): number {
    if (totalReviews === 0) return 0;
    return (correctReviews / totalReviews) * 100;
  }

  /**
   * Get learning progress metrics
   */
  getProgressMetrics(srData: SpacedRepetitionData[]): {
    totalCards: number;
    matureCards: number;
    learningCards: number;
    youngCards: number;
    averageEasiness: number;
    retentionRate: number;
  } {
    const totalCards = srData.length;
    const matureCards = srData.filter(c => c.interval >= 21).length;
    const learningCards = srData.filter(c => c.repetitions === 0).length;
    const youngCards = srData.filter(c => c.interval < 21 && c.repetitions > 0).length;

    const averageEasiness = srData.reduce((sum, c) => sum + c.easinessFactor, 0) / totalCards;
    const totalReviews = srData.reduce((sum, c) => sum + c.totalReviews, 0);
    const correctReviews = srData.reduce((sum, c) => sum + c.correctReviews, 0);
    const retentionRate = this.calculateRetentionRate(correctReviews, totalReviews);

    return {
      totalCards,
      matureCards,
      learningCards,
      youngCards,
      averageEasiness: Math.round(averageEasiness * 100) / 100,
      retentionRate: Math.round(retentionRate),
    };
  }
}

export interface ImageOcclusionData {
  originalImageUrl: string;
  maskedImageUrl: string;
  occlusions: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    isCorrect?: boolean;
  }>;
  totalOcclusions: number;
  correctOcclusions: number;
}

export default new SpacedRepetitionService();
