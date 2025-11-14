/**
 * Gamification Routes
 * API endpoints for badges, achievements, streaks, and leaderboards
 */

import { Router } from 'express';
import { gamificationService } from '../services/learning/gamificationService';

const router = Router();

// Get user achievements
router.get('/achievements', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const achievements = await gamificationService.getUserAchievements(userId as string);

    res.json({
      success: true,
      achievements
    });

  } catch (error: any) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user streak
router.get('/streak', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const streak = await gamificationService.getUserStreak(userId as string);

    if (!streak) {
      return res.json({
        success: true,
        currentStreak: 0,
        longestStreak: 0
      });
    }

    res.json({
      success: true,
      ...streak
    });

  } catch (error: any) {
    console.error('Error fetching streak:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update learning streak
router.post('/update-streak', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const streak = await gamificationService.updateLearningStreak(userId);

    res.json({
      success: true,
      ...streak
    });

  } catch (error: any) {
    console.error('Error updating streak:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit } = req.query;

    const leaderboard = await gamificationService.getLeaderboard(
      limit ? parseInt(limit as string) : 100
    );

    res.json({
      success: true,
      leaderboard
    });

  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Award points
router.post('/award-points', async (req, res) => {
  try {
    const { userId, action, amount } = req.body;

    if (!userId || !action || amount === undefined) {
      return res.status(400).json({ error: 'userId, action, and amount are required' });
    }

    await gamificationService.awardPoints(userId, action, amount);

    res.json({
      success: true,
      message: 'Points awarded successfully'
    });

  } catch (error: any) {
    console.error('Error awarding points:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
