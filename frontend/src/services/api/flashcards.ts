import api from './api';

export interface FlashcardData {
  id: string;
  user_id: string;
  deck_id?: string;
  front: string;
  back: string;
  image_url?: string;
  occlusion_data?: ImageOcclusionData;
  tags: string[];
  difficulty: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  flashcard_spaced_repetition?: SpacedRepetitionData;
  flashcard_decks?: { name: string };
}

export interface SpacedRepetitionData {
  flashcard_id: string;
  user_id: string;
  easiness_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string;
  last_reviewed_at?: string;
  review_count: number;
  correct_count: number;
  average_response_time: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewResult {
  flashcardId: string;
  sessionId?: string;
  quality: number;
  responseTime: number;
  reviewType?: 'review' | 'new' | 'relearn';
}

export interface FlashcardDeck {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  card_count: number;
  created_at: string;
  updated_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  cards_reviewed: number;
  cards_correct: number;
  total_response_time: number;
  session_type: 'review' | 'new' | 'mixed';
  created_at: string;
}

export interface StudyQueue {
  dueCards: FlashcardData[];
  newCards: FlashcardData[];
  totalCount: number;
  reviewCount: number;
  newCount: number;
}

export interface ProgressSummary {
  totalCards: number;
  matureCards: number;
  learningCards: number;
  youngCards: number;
  averageEasiness: number;
  retentionRate: number;
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

class FlashcardsService {
  private readonly baseUrl = '/flashcards';

  // ========================================
  // FLASHCARD CRUD OPERATIONS
  // ========================================

  async createFlashcard(data: {
    front: string;
    back: string;
    imageUrl?: string;
    occlusionData?: ImageOcclusionData;
    tags?: string[];
    deckId?: string;
    difficulty?: number;
  }) {
    const response = await api.post(`${this.baseUrl}`, data);
    return response.data;
  }

  async getFlashcards(options?: {
    deckId?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (options?.deckId) params.append('deckId', options.deckId);
    if (options?.tags) {
      options.tags.forEach(tag => params.append('tags', tag));
    }
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await api.get(`${this.baseUrl}?${params.toString()}`);
    return response.data;
  }

  async getFlashcardById(id: string) {
    const response = await api.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async updateFlashcard(id: string, data: Partial<FlashcardData>) {
    const response = await api.put(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  async deleteFlashcard(id: string) {
    const response = await api.delete(`${this.baseUrl}/${id}`);
    return response.data;
  }

  // ========================================
  // DECK OPERATIONS
  // ========================================

  async createDeck(data: { name: string; description?: string }) {
    const response = await api.post(`${this.baseUrl}/decks`, data);
    return response.data;
  }

  async getDecks() {
    const response = await api.get(`${this.baseUrl}/decks`);
    return response.data;
  }

  async updateDeck(id: string, data: { name?: string; description?: string }) {
    const response = await api.put(`${this.baseUrl}/decks/${id}`, data);
    return response.data;
  }

  async deleteDeck(id: string) {
    const response = await api.delete(`${this.baseUrl}/decks/${id}`);
    return response.data;
  }

  // ========================================
  // STUDY SESSION OPERATIONS
  // ========================================

  async startSession(data: { sessionType: 'review' | 'new' | 'mixed'; deckId?: string }) {
    const response = await api.post(`${this.baseUrl}/sessions/start`, data);
    return response.data;
  }

  async endSession(
    id: string,
    data: {
      cardsReviewed: number;
      cardsCorrect: number;
      totalResponseTime: number;
    }
  ) {
    const response = await api.put(`${this.baseUrl}/sessions/${id}/end`, data);
    return response.data;
  }

  async getSessions(limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const response = await api.get(`${this.baseUrl}/sessions?${params.toString()}`);
    return response.data;
  }

  // ========================================
  // REVIEW OPERATIONS
  // ========================================

  async getDueCards(limit?: number, deckId?: string) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (deckId) params.append('deckId', deckId);

    const response = await api.get(`${this.baseUrl}/review/due?${params.toString()}`);
    return response.data;
  }

  async getNewCards(limit?: number, deckId?: string) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (deckId) params.append('deckId', deckId);

    const response = await api.get(`${this.baseUrl}/review/new?${params.toString()}`);
    return response.data;
  }

  async submitReview(data: ReviewResult) {
    const response = await api.post(`${this.baseUrl}/review/submit`, data);
    return response.data;
  }

  async getStudyQueue(deckId?: string) {
    const params = new URLSearchParams();
    if (deckId) params.append('deckId', deckId);

    const response = await api.get(`${this.baseUrl}/study-queue?${params.toString()}`);
    return response.data;
  }

  // ========================================
  // ANALYTICS & PROGRESS
  // ========================================

  async getProgress() {
    const response = await api.get(`${this.baseUrl}/progress`);
    return response.data;
  }

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  formatStudyTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  calculatePercentage(current: number, target: number): number {
    if (target === 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  getDifficultyColor(difficulty: number): string {
    if (difficulty >= 80) return 'red';
    if (difficulty >= 60) return 'orange';
    if (difficulty >= 40) return 'yellow';
    if (difficulty >= 20) return 'green';
    return 'blue';
  }

  getRetentionRateColor(rate: number): string {
    if (rate >= 90) return 'green';
    if (rate >= 80) return 'blue';
    if (rate >= 70) return 'yellow';
    if (rate >= 60) return 'orange';
    return 'red';
  }

  getQualityLabel(quality: number): string {
    if (quality >= 5) return 'Perfect';
    if (quality >= 4) return 'Good';
    if (quality >= 3) return 'Hard';
    if (quality >= 2) return 'Forgot';
    return 'Total Blackout';
  }

  getQualityColor(quality: number): string {
    if (quality >= 5) return 'green';
    if (quality >= 4) return 'blue';
    if (quality >= 3) return 'yellow';
    if (quality >= 2) return 'orange';
    return 'red';
  }

  getCardTypeIcon(type: 'review' | 'new' | 'relearn'): string {
    switch (type) {
      case 'new':
        return '🆕';
      case 'relearn':
        return '🔄';
      case 'review':
        return '📝';
      default:
        return '📚';
    }
  }

  getSessionTypeIcon(type: 'review' | 'new' | 'mixed'): string {
    switch (type) {
      case 'new':
        return '🆕';
      case 'mixed':
        return '🔀';
      case 'review':
        return '📝';
      default:
        return '📚';
    }
  }

  formatInterval(days: number): string {
    if (days === 0) return 'Now';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.round(days / 30)} mo`;
    return `${Math.round(days / 365)} yr`;
  }

  getReviewCountBadge(count: number): { label: string; color: string } {
    if (count === 0) return { label: 'New', color: 'blue' };
    if (count < 5) return { label: `${count}x`, color: 'green' };
    if (count < 10) return { label: `${count}x`, color: 'yellow' };
    if (count < 20) return { label: `${count}x`, color: 'orange' };
    return { label: `${count}x`, color: 'red' };
  }
}

const flashcardsService = new FlashcardsService();
export default flashcardsService;
