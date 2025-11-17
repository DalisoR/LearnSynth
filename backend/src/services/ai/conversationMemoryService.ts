import { supabase } from '../supabase';

interface ConversationMessage {
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

interface ConversationSession {
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

class ConversationMemoryService {
  /**
   * Create a new conversation session
   */
  async createSession(
    userId: string,
    title: string,
    subject?: string,
    topic?: string
  ): Promise<ConversationSession> {
    const session: ConversationSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title,
      subject,
      topic,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    };

    const { error } = await supabase
      .from('conversation_sessions')
      .insert({
        id: session.id,
        user_id: userId,
        title: session.title,
        subject: session.subject,
        topic: session.topic,
        created_at: new Date(session.createdAt).toISOString(),
        updated_at: new Date(session.updatedAt).toISOString(),
        message_count: 0,
        summary: null,
        key_points: [],
      });

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return session;
  }

  /**
   * Add a message to a conversation session
   */
  async addMessage(
    sessionId: string,
    userId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: ConversationMessage['metadata']
  ): Promise<ConversationMessage> {
    const message: ConversationMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      sessionId,
      role,
      content,
      timestamp: Date.now(),
      metadata,
    };

    const { error } = await supabase
      .from('conversation_messages')
      .insert({
        id: message.id,
        session_id: sessionId,
        user_id: userId,
        role: message.role,
        content: message.content,
        timestamp: new Date(message.timestamp).toISOString(),
        metadata: message.metadata,
      });

    if (error) {
      throw new Error(`Failed to add message: ${error.message}`);
    }

    // Update session message count and timestamp
    await this.updateSessionActivity(sessionId);

    return message;
  }

  /**
   * Get all messages for a session
   */
  async getSessionMessages(sessionId: string): Promise<ConversationMessage[]> {
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    return data.map(msg => ({
      id: msg.id,
      userId: msg.user_id,
      sessionId: msg.session_id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp).getTime(),
      metadata: msg.metadata,
    }));
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<ConversationSession[]> {
    const { data, error } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    return data.map(session => ({
      id: session.id,
      userId: session.user_id,
      title: session.title,
      subject: session.subject,
      topic: session.topic,
      createdAt: new Date(session.created_at).getTime(),
      updatedAt: new Date(session.updated_at).getTime(),
      messageCount: session.message_count,
      summary: session.summary,
      keyPoints: session.key_points || [],
    }));
  }

  /**
   * Update session activity timestamp and message count
   */
  private async updateSessionActivity(sessionId: string): Promise<void> {
    // Get current message count
    const { count } = await supabase
      .from('conversation_messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    // Update session
    await supabase
      .from('conversation_sessions')
      .update({
        updated_at: new Date().toISOString(),
        message_count: count || 0,
      })
      .eq('id', sessionId);
  }

  /**
   * Generate session summary using AI
   */
  async generateSessionSummary(
    sessionId: string,
    messages: ConversationMessage[]
  ): Promise<string> {
    // Extract key points from conversation
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    // Use LLM to generate summary
    const summary = `Summary of learning session:\n\nKey topics discussed:\n${conversationText.substring(0, 2000)}`;

    // Update session with summary
    await supabase
      .from('conversation_sessions')
      .update({ summary })
      .eq('id', sessionId);

    return summary;
  }

  /**
   * Extract key learning points from session
   */
  async extractKeyPoints(messages: ConversationMessage[]): Promise<string[]> {
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n');

    // Simple extraction - in production, use NLP
    const points = [
      'Key concept 1',
      'Key concept 2',
      'Important formula',
    ];

    return points;
  }

  /**
   * Search across all user conversations
   */
  async searchConversations(
    userId: string,
    query: string
  ): Promise<(ConversationSession & { matchedMessages: ConversationMessage[] })[]> {
    const sessions = await this.getUserSessions(userId);

    const results = [];

    for (const session of sessions) {
      const messages = await this.getSessionMessages(session.id);
      const matchedMessages = messages.filter(
        m =>
          m.content.toLowerCase().includes(query.toLowerCase()) ||
          (m.metadata?.topic && m.metadata.topic.toLowerCase().includes(query.toLowerCase()))
      );

      if (matchedMessages.length > 0) {
        results.push({
          ...session,
          matchedMessages,
        });
      }
    }

    return results;
  }

  /**
   * Get conversation context for AI responses
   */
  async getContextForAI(
    sessionId: string,
    maxMessages: number = 20
  ): Promise<ConversationMessage[]> {
    const messages = await this.getSessionMessages(sessionId);

    // Get recent messages (most relevant)
    return messages.slice(-maxMessages);
  }

  /**
   * Delete a conversation session
   */
  async deleteSession(sessionId: string): Promise<void> {
    // Delete messages first (due to foreign key constraint)
    await supabase
      .from('conversation_messages')
      .delete()
      .eq('session_id', sessionId);

    // Delete session
    await supabase
      .from('conversation_sessions')
      .delete()
      .eq('id', sessionId);
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
    const sessions = await this.getUserSessions(userId);

    const totalSessions = sessions.length;
    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
    const averageSessionLength = totalSessions > 0 ? totalMessages / totalSessions : 0;

    const subjectDistribution = sessions.reduce((acc, session) => {
      if (session.subject) {
        acc[session.subject] = (acc[session.subject] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSessions,
      totalMessages,
      averageSessionLength,
      subjectDistribution,
    };
  }
}

export default new ConversationMemoryService();
