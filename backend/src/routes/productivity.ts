import { Router } from 'express';
import productivityService from '../services/analytics/productivityService';
import logger from '../utils/logger';

const router = Router();

/**
 * Get learning heatmap data
 */
router.get('/heatmap/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { weeks } = req.query;
    const heatmap = await productivityService.getLearningHeatmap(
      userId,
      weeks ? parseInt(weeks as string) : 12
    );

    res.json({ heatmap });
  } catch (error) {
    logger.error('Error fetching heatmap data:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
});

/**
 * Get productivity insights
 */
router.get('/insights/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const insights = await productivityService.getProductivityInsights(userId);

    res.json({ insights });
  } catch (error) {
    logger.error('Error fetching productivity insights:', error);
    res.status(500).json({ error: 'Failed to fetch productivity insights' });
  }
});

/**
 * Get weekly study patterns
 */
router.get('/weekly-pattern/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const pattern = await productivityService.getWeeklyPattern(userId);

    res.json({ pattern });
  } catch (error) {
    logger.error('Error fetching weekly pattern:', error);
    res.status(500).json({ error: 'Failed to fetch weekly pattern' });
  }
});

/**
 * Get hourly study patterns
 */
router.get('/hourly-pattern/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const pattern = await productivityService.getHourlyPattern(userId);

    res.json({ pattern });
  } catch (error) {
    logger.error('Error fetching hourly pattern:', error);
    res.status(500).json({ error: 'Failed to fetch hourly pattern' });
  }
});

/**
 * Get study streak information
 */
router.get('/streak/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const streak = await productivityService.getStudyStreak(userId);

    res.json({ streak });
  } catch (error) {
    logger.error('Error fetching study streak:', error);
    res.status(500).json({ error: 'Failed to fetch study streak' });
  }
});

/**
 * Get efficiency metrics
 */
router.get('/efficiency/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const efficiency = await productivityService.getEfficiencyMetrics(userId);

    res.json({ efficiency });
  } catch (error) {
    logger.error('Error fetching efficiency metrics:', error);
    res.status(500).json({ error: 'Failed to fetch efficiency metrics' });
  }
});

/**
 * Get comprehensive productivity data
 */
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [heatmap, insights, weekly, hourly, streak, efficiency] = await Promise.all([
      productivityService.getLearningHeatmap(userId, 12),
      productivityService.getProductivityInsights(userId),
      productivityService.getWeeklyPattern(userId),
      productivityService.getHourlyPattern(userId),
      productivityService.getStudyStreak(userId),
      productivityService.getEfficiencyMetrics(userId),
    ]);

    res.json({
      heatmap,
      insights,
      weekly,
      hourly,
      streak,
      efficiency,
    });
  } catch (error) {
    logger.error('Error fetching productivity dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch productivity dashboard data' });
  }
});

export default router;
