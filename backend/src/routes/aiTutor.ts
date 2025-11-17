import { Router } from 'express';
import conversationMemoryService from '../services/ai/conversationMemoryService';
import { createLLMService } from '../services/llm/factory';
import { createEmbeddingsService } from '../services/embeddings/factory';
import enhancedLessonService from '../services/learning/enhancedLessonService';
import logger from '../utils/logger';

const router = Router();

/**
 * Create a new AI tutor session with enhanced memory
 */
router.post('/session', async (req, res) => {
  try {
    const { title, subject, topic, userId } = req.body;
    const session = await conversationMemoryService.createSession(
      userId,
      title,
      subject,
      topic
    );

    res.json({
      session,
      message: 'AI Tutor session created successfully',
    });
  } catch (error) {
    logger.error('Error creating AI tutor session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * Send message to AI tutor with conversation memory
 */
router.post('/session/:sessionId/message', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      message,
      userId,
      includeKB = true,
      subjectIds = [],
      includeWebSearch = true,
      learningStyle = 'conversational',
      emotion = 'neutral',
      difficulty = 'adaptive',
    } = req.body;

    logger.info(`Processing AI tutor message for session ${sessionId}`);

    // Add user message to memory
    const userMessage = await conversationMemoryService.addMessage(
      sessionId,
      userId,
      'user',
      message,
      {
        subject: subjectIds[0],
        emotion,
        learningStyle,
        difficulty,
      }
    );

    // Get conversation context for AI
    const contextMessages = await conversationMemoryService.getContextForAI(
      sessionId,
      20 // Last 20 messages
    );

    // Build conversation history for LLM
    const chatHistory = contextMessages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    // Retrieve KB context
    let kbContext = '';
    let referencedSnippets: any[] = [];

    if (includeKB && subjectIds.length > 0) {
      const embeddingsService = createEmbeddingsService();

      for (const subjectId of subjectIds) {
        try {
          const searchResults = await embeddingsService.search({
            query: message,
            subjectId: subjectId,
            limit: 3,
          });

          const kbSnippets = searchResults.map(r => ({
            content: r.content,
            score: r.relevanceScore,
            source: subjectId,
            metadata: r.metadata,
          }));

          referencedSnippets.push(...kbSnippets);

          const kbText = searchResults
            .map(r => `Source: ${r.metadata?.chapter_title || 'Document'}\nContent: ${r.content}`)
            .join('\n\n');

          if (kbText) {
            kbContext += (kbContext ? '\n\n' : '') + kbText;
          }
        } catch (kbError) {
          logger.error(`Error searching KB ${subjectId}:`, kbError);
        }
      }
    }

    // Build personalized system prompt
    let systemPrompt = `You are an expert AI tutor specializing in ${subjectIds[0] || 'general education'}.

Teaching Style: ${learningStyle}
Difficulty Level: ${difficulty}

Your approach:
1. Remember the conversation history and build upon previous explanations
2. Adapt your teaching style to the user's emotional state (${emotion})
3. Break down complex concepts into digestible parts
4. Ask follow-up questions to check understanding
5. Provide encouraging and supportive feedback
6. Connect new concepts to previously discussed topics`;

    if (kbContext) {
      systemPrompt += `\n\nUse the provided knowledge base context when relevant. Cite sources when using specific information.`;
    }

    systemPrompt += `\n\nKeep responses conversational, engaging, and educational.`;

    // Build full context
    let fullContext = chatHistory;
    if (kbContext) {
      fullContext = `Relevant Knowledge:\n${kbContext}\n\nConversation History:\n${chatHistory}`;
    }

    // Generate AI response
    const llmService = createLLMService();
    const response = await llmService.generate({
      prompt: message,
      context: fullContext,
      systemPrompt,
    });

    // Add assistant message to memory
    const assistantMessage = await conversationMemoryService.addMessage(
      sessionId,
      userId,
      'assistant',
      response.content,
      {
        subject: subjectIds[0],
        learningStyle,
        emotion: 'helpful',
      }
    );

    res.json({
      message: assistantMessage,
      userMessage,
      tokensUsed: response.tokensUsed,
      kbResults: referencedSnippets.length,
      kbUsed: includeKB && referencedSnippets.length > 0,
      sessionId,
    });
  } catch (error) {
    logger.error('Error sending AI tutor message:', error);
    res.status(500).json({
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get conversation history for a session
 */
router.get('/session/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await conversationMemoryService.getSessionMessages(sessionId);

    res.json({ messages });
  } catch (error) {
    logger.error('Error fetching conversation history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * Get all sessions for a user
 */
router.get('/sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await conversationMemoryService.getUserSessions(userId);

    res.json({ sessions });
  } catch (error) {
    logger.error('Error fetching user sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * Search across all conversations
 */
router.get('/search/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { query } = req.query as { query: string };

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const results = await conversationMemoryService.searchConversations(userId, query);

    res.json({ results });
  } catch (error) {
    logger.error('Error searching conversations:', error);
    res.status(500).json({ error: 'Failed to search conversations' });
  }
});

/**
 * Get session statistics
 */
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await conversationMemoryService.getSessionStats(userId);

    res.json({ stats });
  } catch (error) {
    logger.error('Error fetching session stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * Generate session summary
 */
router.post('/session/:sessionId/summary', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await conversationMemoryService.getSessionMessages(sessionId);

    const summary = await conversationMemoryService.generateSessionSummary(sessionId, messages);

    res.json({ summary });
  } catch (error) {
    logger.error('Error generating session summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

/**
 * Delete a conversation session
 */
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await conversationMemoryService.deleteSession(sessionId);

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    logger.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

/**
 * Get AI tutor recommendations based on conversation history
 */
router.get('/session/:sessionId/recommendations', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await conversationMemoryService.getSessionMessages(sessionId);

    // Analyze conversation for topics and suggest related content
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ');

    const llmService = createLLMService();
    const response = await llmService.generate({
      prompt: `Based on this learning conversation, suggest 3-5 next topics or areas to explore: ${userMessages.substring(0, 1000)}`,
      systemPrompt: 'You are an educational advisor. Suggest relevant next learning topics.',
    });

    res.json({
      recommendations: response.content.split('\n').filter(line => line.trim()),
    });
  } catch (error) {
    logger.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

export default router;
