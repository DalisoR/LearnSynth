import { Router } from 'express';
import socraticTutorService from '../services/ai/socraticTutorService';
import logger from '../utils/logger';

const router = Router();

/**
 * Initialize a Socratic tutoring session
 */
router.post('/session', async (req, res) => {
  try {
    const { userId, topic, subject, userQuestion } = req.body;

    const session = await socraticTutorService.initializeSession(
      userId,
      topic,
      subject,
      userQuestion
    );

    res.json({
      session,
      message: 'Socratic tutoring session initialized',
    });
  } catch (error) {
    logger.error('Error initializing Socratic session:', error);
    res.status(500).json({ error: 'Failed to initialize session' });
  }
});

/**
 * Process user response and get next question
 */
router.post('/session/:sessionId/question', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      userId,
      topic,
      subject,
      userResponse,
    } = req.body;

    const session = {
      id: sessionId,
      userId,
      topic,
      subject,
      currentStage: req.body.currentStage || 'exploration',
      questionCount: req.body.questionCount || 0,
      createdAt: req.body.createdAt || Date.now(),
    };

    const result = await socraticTutorService.processResponse(session, userResponse);

    res.json(result);
  } catch (error) {
    logger.error('Error processing Socratic response:', error);
    res.status(500).json({ error: 'Failed to process response' });
  }
});

/**
 * Get session summary
 */
router.get('/session/:sessionId/summary', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId, topic, subject } = req.query;

    const session = {
      id: sessionId,
      userId: userId as string,
      topic: topic as string,
      subject: subject as string,
      currentStage: 'conclusion' as const,
      questionCount: 0,
      createdAt: Date.now(),
    };

    const summary = await socraticTutorService.getSessionSummary(session);

    res.json({ summary });
  } catch (error) {
    logger.error('Error generating Socratic session summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

/**
 * Generate a specific type of Socratic question
 */
router.post('/generate-question', async (req, res) => {
  try {
    const {
      userId,
      topic,
      subject,
      stage,
      previousResponses,
      questionType,
    } = req.body;

    const session = {
      id: `temp-${Date.now()}`,
      userId,
      topic,
      subject,
      currentStage: stage || 'exploration',
      questionCount: previousResponses?.length || 0,
      createdAt: Date.now(),
    };

    const conversationHistory = previousResponses || [];
    const question = await socraticTutorService.generateQuestion(
      session,
      '',
      conversationHistory
    );

    res.json({ question });
  } catch (error) {
    logger.error('Error generating Socratic question:', error);
    res.status(500).json({ error: 'Failed to generate question' });
  }
});

export default router;
