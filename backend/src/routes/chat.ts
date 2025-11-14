import { Router } from 'express';
import { supabase } from '../services/supabase';
import { createLLMService } from '../services/llm/factory';
import { createEmbeddingsService } from '../services/embeddings/factory';
import logger from '../utils/logger';

const router = Router();

// Start a new chat session
router.post('/start', async (req, res) => {
  try {
    const { sessionName, subjectId } = req.body;
    const userId = '00000000-0000-0000-0000-000000000000';

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        subject_id: subjectId,
        session_name: sessionName,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ session });
  } catch (error) {
    logger.error('Error starting chat session:', error);
    res.status(500).json({ error: 'Failed to start chat session' });
  }
});

// Send a message in a chat session
router.post('/:sessionId/message', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, includeKB = true } = req.body;
    const userId = '00000000-0000-0000-0000-000000000000';

    // Save user message
    const { error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: message,
      });

    if (userMsgError) throw userMsgError;

    // Get session details
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    let kbContext = '';

    // Retrieve context from KB if requested
    if (includeKB && session?.subject_id) {
      const embeddingsService = createEmbeddingsService();
      const searchResults = await embeddingsService.search({
        query: message,
        subjectId: session.subject_id,
        limit: 3,
      });

      kbContext = searchResults
        .map(r => `Source: ${r.metadata.source}\nContent: ${r.content}`)
        .join('\n\n');
    }

    // Get recent chat history for context
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10);

    const chatHistory = messages
      ?.map(m => `${m.role}: ${m.content}`)
      .join('\n') || '';

    // Generate response using LLM
    const llmService = createLLMService();
    const response = await llmService.generate({
      prompt: message,
      context: kbContext ? `Knowledge Base Context:\n${kbContext}\n\nChat History:\n${chatHistory}` : chatHistory,
      systemPrompt: 'You are an AI tutor helping students learn. Use the provided knowledge base context when relevant. Cite sources when using information from the knowledge base.',
    });

    // Save assistant message
    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: response.content,
        referenced_snippets: includeKB && session?.subject_id
          ? [
              {
                content: 'Relevant information from knowledge base',
                score: 0.9,
                source: session.subject_id,
              },
            ]
          : [],
      })
      .select()
      .single();

    if (assistantMsgError) throw assistantMsgError;

    res.json({
      message: assistantMsg,
      tokensUsed: response.tokensUsed,
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get chat history
router.get('/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ messages });
  } catch (error) {
    logger.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

export default router;
