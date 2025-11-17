import api from './api';

export interface ConversationMessage {
  id: string;
  userId: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    subject?: string;
    topic?: string;
    difficulty?: string;
    emotion?: string;
    learningStyle?: string;
  };
}

export interface ConversationSession {
  id: string;
  userId: string;
  title: string;
  subject?: string;
  topic?: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  summary?: string;
  keyPoints?: string[];
}

export interface SendMessageRequest {
  message: string;
  userId: string;
  includeKB?: boolean;
  subjectIds?: string[];
  includeWebSearch?: boolean;
  learningStyle?: string;
  emotion?: string;
  difficulty?: string;
}

export interface SendMessageResponse {
  message: ConversationMessage;
  userMessage: ConversationMessage;
  tokensUsed: number;
  kbResults: number;
  kbUsed: boolean;
  sessionId: string;
}

class AITutorService {
  /**
   * Create a new AI tutor session
   */
  async createSession(
    title: string,
    subject?: string,
    topic?: string,
    userId?: string
  ): Promise<ConversationSession> {
    const response = await api.post('/ai-tutor/session', {
      title,
      subject,
      topic,
      userId,
    });

    return response.data.session;
  }

  /**
   * Send message to AI tutor
   */
  async sendMessage(
    sessionId: string,
    messageData: SendMessageRequest
  ): Promise<SendMessageResponse> {
    const response = await api.post(
      `/ai-tutor/session/${sessionId}/message`,
      messageData
    );

    return response.data;
  }

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(sessionId: string): Promise<ConversationMessage[]> {
    const response = await api.get(`/ai-tutor/session/${sessionId}/history`);

    return response.data.messages;
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<ConversationSession[]> {
    const response = await api.get(`/ai-tutor/sessions/${userId}`);

    return response.data.sessions;
  }

  /**
   * Search across all conversations
   */
  async searchConversations(
    userId: string,
    query: string
  ): Promise<{
    sessionId: string;
    title: string;
    matchedMessages: ConversationMessage[];
  }[]> {
    const response = await api.get(`/ai-tutor/search/${userId}`, {
      params: { query },
    });

    return response.data.results;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(userId: string): Promise<{
    totalSessions: number;
    totalMessages: number;
    averageSessionLength: number;
    subjectDistribution: Record<string, number>;
  }> {
    const response = await api.get(`/ai-tutor/stats/${userId}`);

    return response.data.stats;
  }

  /**
   * Generate session summary
   */
  async generateSessionSummary(sessionId: string): Promise<string> {
    const response = await api.post(`/ai-tutor/session/${sessionId}/summary`);

    return response.data.summary;
  }

  /**
   * Get AI tutor recommendations
   */
  async getRecommendations(sessionId: string): Promise<string[]> {
    const response = await api.get(`/ai-tutor/session/${sessionId}/recommendations`);

    return response.data.recommendations;
  }

  /**
   * Delete a conversation session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await api.delete(`/ai-tutor/session/${sessionId}`);
  }

  /**
   * Continue a conversation (alias for sendMessage for convenience)
   */
  async continueConversation(
    sessionId: string,
    message: string,
    options?: Partial<SendMessageRequest>
  ): Promise<SendMessageResponse> {
    return this.sendMessage(sessionId, {
      message,
      userId: options?.userId || '',
      includeKB: options?.includeKB ?? true,
      subjectIds: options?.subjectIds || [],
      includeWebSearch: options?.includeWebSearch ?? true,
      learningStyle: options?.learningStyle || 'conversational',
      emotion: options?.emotion || 'neutral',
      difficulty: options?.difficulty || 'adaptive',
    });
  }

  /**
   * Start a new conversation with AI tutor
   */
  async startConversation(
    title: string,
    initialMessage: string,
    userId: string,
    subjectIds: string[] = [],
    options?: {
      subject?: string;
      topic?: string;
      learningStyle?: string;
      emotion?: string;
      difficulty?: string;
    }
  ): Promise<SendMessageResponse> {
    // Create session
    const session = await this.createSession(
      title,
      options?.subject,
      options?.topic,
      userId
    );

    // Send initial message
    return this.sendMessage(session.id, {
      message: initialMessage,
      userId,
      includeKB: subjectIds.length > 0,
      subjectIds,
      includeWebSearch: true,
      learningStyle: options?.learningStyle || 'conversational',
      emotion: options?.emotion || 'neutral',
      difficulty: options?.difficulty || 'adaptive',
    });
  }
}

export default new AITutorService();
