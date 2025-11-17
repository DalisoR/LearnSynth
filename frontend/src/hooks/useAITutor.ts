import { useState, useEffect, useCallback } from 'react';
import aiTutorService, {
  ConversationSession,
  ConversationMessage,
  SendMessageRequest,
} from '../services/api/aiTutor';

export interface UseAITutorOptions {
  autoCreateSession?: boolean;
  sessionTitle?: string;
  subject?: string;
  topic?: string;
  learningStyle?: string;
  emotion?: string;
  difficulty?: string;
}

export const useAITutor = (userId: string, options: UseAITutorOptions = {}) => {
  const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load user's conversation sessions
   */
  const loadSessions = useCallback(async () => {
    try {
      const userSessions = await aiTutorService.getUserSessions(userId);
      setSessions(userSessions);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError('Failed to load conversation sessions');
    }
  }, [userId]);

  /**
   * Create a new conversation session
   */
  const createSession = useCallback(
    async (title: string, subject?: string, topic?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const session = await aiTutorService.createSession(title, subject, topic, userId);
        setCurrentSession(session);
        setMessages([]);
        await loadSessions();
        return session;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [userId, loadSessions]
  );

  /**
   * Load conversation history
   */
  const loadConversation = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const [sessionData, history] = await Promise.all([
        aiTutorService.getUserSessions(userId).then(sessions =>
          sessions.find(s => s.id === sessionId)
        ),
        aiTutorService.getConversationHistory(sessionId),
      ]);

      if (!sessionData) {
        throw new Error('Session not found');
      }

      setCurrentSession(sessionData);
      setMessages(history);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversation';
      setError(errorMessage);
      console.error('Failed to load conversation:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Send a message to the AI tutor
   */
  const sendMessage = useCallback(
    async (content: string, options?: Partial<SendMessageRequest>) => {
      if (!currentSession) {
        throw new Error('No active session. Create or select a session first.');
      }

      setIsTyping(true);
      setError(null);

      try {
        const response = await aiTutorService.sendMessage(currentSession.id, {
          message: content,
          userId,
          includeKB: options?.includeKB ?? true,
          subjectIds: options?.subjectIds || [],
          includeWebSearch: options?.includeWebSearch ?? true,
          learningStyle: options?.learningStyle || options.learningStyle,
          emotion: options?.emotion || options.emotion,
          difficulty: options?.difficulty || options.difficulty,
        });

        // Add both user and assistant messages to the conversation
        setMessages(prev => [...prev, response.userMessage, response.message]);

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsTyping(false);
      }
    },
    [currentSession, userId]
  );

  /**
   * Search across all conversations
   */
  const searchConversations = useCallback(
    async (query: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const results = await aiTutorService.searchConversations(userId, query);
        return results;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  /**
   * Delete a conversation session
   */
  const deleteSession = useCallback(
    async (sessionId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        await aiTutorService.deleteSession(sessionId);
        setSessions(prev => prev.filter(s => s.id !== sessionId));

        // If we're deleting the current session, clear it
        if (currentSession?.id === sessionId) {
          setCurrentSession(null);
          setMessages([]);
        }

        await loadSessions();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete session';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [currentSession, userId, loadSessions]
  );

  /**
   * Generate session summary
   */
  const generateSummary = useCallback(async () => {
    if (!currentSession) return;

    setIsLoading(true);
    setError(null);

    try {
      const summary = await aiTutorService.generateSessionSummary(currentSession.id);
      setCurrentSession(prev => prev ? { ...prev, summary } : null);
      await loadSessions(); // Refresh to get updated data
      return summary;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate summary';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentSession, loadSessions]);

  /**
   * Get AI tutor recommendations
   */
  const getRecommendations = useCallback(async () => {
    if (!currentSession) return [];

    setIsLoading(true);
    setError(null);

    try {
      const recommendations = await aiTutorService.getRecommendations(currentSession.id);
      return recommendations;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get recommendations';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentSession]);

  /**
   * Clear current conversation
   */
  const clearCurrentSession = useCallback(() => {
    setCurrentSession(null);
    setMessages([]);
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load sessions on mount and when userId changes
  useEffect(() => {
    if (userId) {
      loadSessions();
    }
  }, [userId, loadSessions]);

  // Auto-create session if enabled
  useEffect(() => {
    if (options.autoCreateSession && userId && sessions.length === 0) {
      createSession(
        options.sessionTitle || 'New Conversation',
        options.subject,
        options.topic
      ).catch(err => {
        console.error('Auto-create session failed:', err);
      });
    }
  }, [options, userId, sessions.length, createSession]);

  return {
    // State
    currentSession,
    messages,
    sessions,
    isLoading,
    isTyping,
    error,

    // Actions
    createSession,
    loadConversation,
    sendMessage,
    searchConversations,
    deleteSession,
    generateSummary,
    getRecommendations,
    clearCurrentSession,
    clearError,
    loadSessions,

    // Helper getters
    hasActiveSession: !!currentSession,
    messageCount: messages.length,
  };
};
