import { Router } from 'express';
import { supabase } from '../services/supabase';
import { createLLMService } from '../services/llm/factory';
import { createEmbeddingsService } from '../services/embeddings/factory';
import logger from '../utils/logger';

const router = Router();

// Start a new chat session
router.post('/start', async (req, res) => {
  try {
    const { sessionName, subjectId, subjectIds } = req.body;
    const userId = '00000000-0000-0000-0000-000000000000';

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        subject_id: subjectId, // Keep for backward compatibility
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
    const {
      message,
      includeKB = true,
      subjectIds = [], // Support multiple KBs
      includeWebSearch = true // Complement with web search
    } = req.body;
    const userId = '00000000-0000-0000-0000-000000000000';

    logger.info(`Processing chat message. KBs: ${subjectIds.length}, Web: ${includeWebSearch}`);

    // Save user message
    const { error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: message,
      });

    if (userMsgError) throw userMsgError;

    let kbContext = '';
    let referencedSnippets: any[] = [];

    // Retrieve context from KBs if requested and KBs are provided
    if (includeKB && subjectIds.length > 0) {
      const embeddingsService = createEmbeddingsService();

      // Search across all selected KBs
      for (const subjectId of subjectIds) {
        try {
          const searchResults = await embeddingsService.search({
            query: message,
            subjectId: subjectId,
            limit: 3, // Top 3 results per KB
          });

          const kbSnippets = searchResults.map(r => ({
            content: r.content,
            score: r.relevanceScore,
            source: subjectId,
            metadata: r.metadata
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
          // Continue with other KBs
        }
      }
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

    // Build system prompt
    let systemPrompt = 'You are an expert AI tutor and learning assistant. ';

    if (includeKB && kbContext) {
      systemPrompt += 'Use the provided knowledge base context to answer questions accurately. When you use information from the knowledge base, cite it by mentioning the source. ';
    } else {
      systemPrompt += 'You are a helpful AI assistant similar to ChatGPT. Provide comprehensive and accurate information. ';
    }

    if (includeWebSearch) {
      systemPrompt += 'You may also incorporate general knowledge and internet resources to provide complete answers. ';
    }

    systemPrompt += 'Keep responses conversational, clear, and educational. Break down complex concepts into easy-to-understand explanations.';

    // Build context for LLM
    let fullContext = chatHistory;
    if (kbContext) {
      fullContext = `Knowledge Base Context:\n${kbContext}\n\nChat History:\n${chatHistory}`;
    }

    // Generate response using LLM
    const llmService = createLLMService();
    const response = await llmService.generate({
      prompt: message,
      context: fullContext,
      systemPrompt,
    });

    // Save assistant message
    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: response.content,
        referenced_snippets: referencedSnippets,
      })
      .select()
      .single();

    if (assistantMsgError) throw assistantMsgError;

    res.json({
      message: assistantMsg,
      tokensUsed: response.tokensUsed,
      kbResults: referencedSnippets.length,
      kbUsed: includeKB && referencedSnippets.length > 0,
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({
      error: 'Failed to send message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
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
