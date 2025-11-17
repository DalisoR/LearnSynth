import { Router } from 'express';
import analyticsService from '../services/analytics/analyticsService';
import logger from '../utils/logger';

const router = Router();

/**
 * Get learning metrics summary
 */
router.get('/metrics/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const metrics = await analyticsService.getLearningMetrics(userId);

    res.json({ metrics });
  } catch (error) {
    logger.error('Error fetching learning metrics:', error);
    res.status(500).json({ error: 'Failed to fetch learning metrics' });
  }
});

/**
 * Get daily activity data
 */
router.get('/activity/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days } = req.query;
    const activity = await analyticsService.getDailyActivity(
      userId,
      days ? parseInt(days as string) : 30
    );

    res.json({ activity });
  } catch (error) {
    logger.error('Error fetching daily activity:', error);
    res.status(500).json({ error: 'Failed to fetch daily activity' });
  }
});

/**
 * Get progress by subject
 */
router.get('/subjects/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const progress = await analyticsService.getSubjectProgress(userId);

    res.json({ progress });
  } catch (error) {
    logger.error('Error fetching subject progress:', error);
    res.status(500).json({ error: 'Failed to fetch subject progress' });
  }
});

/**
 * Get weekly progress
 */
router.get('/weekly/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { weeks } = req.query;
    const progress = await analyticsService.getWeeklyProgress(
      userId,
      weeks ? parseInt(weeks as string) : 12
    );

    res.json({ progress });
  } catch (error) {
    logger.error('Error fetching weekly progress:', error);
    res.status(500).json({ error: 'Failed to fetch weekly progress' });
  }
});

/**
 * Get quiz performance
 */
router.get('/quiz-performance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;
    const performance = await analyticsService.getQuizPerformance(
      userId,
      limit ? parseInt(limit as string) : 20
    );

    res.json({ performance });
  } catch (error) {
    logger.error('Error fetching quiz performance:', error);
    res.status(500).json({ error: 'Failed to fetch quiz performance' });
  }
});

/**
 * Get knowledge gaps
 */
router.get('/knowledge-gaps/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const gaps = await analyticsService.getKnowledgeGaps(userId);

    res.json({ gaps });
  } catch (error) {
    logger.error('Error fetching knowledge gaps:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge gaps' });
  }
});

/**
 * Get study goals
 */
router.get('/goals/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const goals = await analyticsService.getStudyGoals(userId);

    res.json({ goals });
  } catch (error) {
    logger.error('Error fetching study goals:', error);
    res.status(500).json({ error: 'Failed to fetch study goals' });
  }
});

/**
 * Get learning recommendations
 */
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const recommendations = await analyticsService.getRecommendations(userId);

    res.json({ recommendations });
  } catch (error) {
    logger.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

/**
 * Get comprehensive dashboard data
 */
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [metrics, activity, subjects, weekly, performance, gaps, goals, recommendations] =
      await Promise.all([
        analyticsService.getLearningMetrics(userId),
        analyticsService.getDailyActivity(userId, 30),
        analyticsService.getSubjectProgress(userId),
        analyticsService.getWeeklyProgress(userId, 12),
        analyticsService.getQuizPerformance(userId, 20),
        analyticsService.getKnowledgeGaps(userId),
        analyticsService.getStudyGoals(userId),
        analyticsService.getRecommendations(userId),
      ]);

    res.json({
      metrics,
      activity,
      subjects,
      weekly,
      performance,
      gaps,
      goals,
      recommendations,
    });
  } catch (error) {
    logger.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
