import { Router } from 'express';
import { supabase } from '../services/supabase';
import logger from '../utils/logger';

const router = Router();

const getUserId = async (req: any) => {
  return req.user?.id || '00000000-0000-0000-0000-000000000000';
};

// ============================================================
// STUDY ANALYTICS
// ============================================================

// Get study analytics for a date range
router.get('/', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { start_date, end_date, study_plan_id } = req.query;

    let query = supabase
      .from('study_analytics')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (start_date) {
      query = query.gte('date', start_date);
    }

    if (end_date) {
      query = query.lte('date', end_date);
    }

    if (study_plan_id) {
      query = query.eq('study_plan_id', study_plan_id);
    }

    const { data: analytics, error } = await query;

    if (error) throw error;

    res.json({ analytics });
  } catch (error: any) {
    logger.error('Error fetching study analytics:', error);
    res.status(500).json({ error: 'Failed to fetch study analytics', details: error.message });
  }
});

// Get study streak
router.get('/streak', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { days_back } = req.query;

    const { data, error } = await supabase.rpc('calculate_study_streak', {
      user_uuid: userId,
      days_back: parseInt(days_back as string) || 365,
    });

    if (error) throw error;

    res.json({ streak: data });
  } catch (error: any) {
    logger.error('Error fetching study streak:', error);
    res.status(500).json({ error: 'Failed to fetch study streak', details: error.message });
  }
});

// Get weekly study summary
router.get('/weekly-summary', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const { data: analytics, error } = await supabase
      .from('study_analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;

    // Calculate totals
    const summary = {
      total_study_time: analytics.reduce((sum, a) => sum + a.total_study_time, 0),
      sessions_completed: analytics.reduce((sum, a) => sum + a.sessions_completed, 0),
      sessions_missed: analytics.reduce((sum, a) => sum + a.sessions_missed, 0),
      goals_met: analytics.reduce((sum, a) => sum + a.goals_met, 0),
      goals_total: analytics.reduce((sum, a) => sum + a.goals_total, 0),
      pomodoro_cycles: analytics.reduce((sum, a) => sum + a.pomodoro_cycles, 0),
      daily_breakdown: analytics,
    };

    res.json({ summary });
  } catch (error: any) {
    logger.error('Error fetching weekly summary:', error);
    res.status(500).json({ error: 'Failed to fetch weekly summary', details: error.message });
  }
});

// Get monthly study summary
router.get('/monthly-summary', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const { data: analytics, error } = await supabase
      .from('study_analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;

    // Calculate totals
    const summary = {
      total_study_time: analytics.reduce((sum, a) => sum + a.total_study_time, 0),
      sessions_completed: analytics.reduce((sum, a) => sum + a.sessions_completed, 0),
      sessions_missed: analytics.reduce((sum, a) => sum + a.sessions_missed, 0),
      goals_met: analytics.reduce((sum, a) => sum + a.goals_met, 0),
      goals_total: analytics.reduce((sum, a) => sum + a.goals_total, 0),
      pomodoro_cycles: analytics.reduce((sum, a) => sum + a.pomodoro_cycles, 0),
      avg_daily_study_time: analytics.length > 0
        ? Math.round(analytics.reduce((sum, a) => sum + a.total_study_time, 0) / analytics.length)
        : 0,
    };

    res.json({ summary });
  } catch (error: any) {
    logger.error('Error fetching monthly summary:', error);
    res.status(500).json({ error: 'Failed to fetch monthly summary', details: error.message });
  }
});

// Get study insights
router.get('/insights', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { study_plan_id } = req.query;

    // Get recent sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('actual_start', { ascending: false })
      .limit(50);

    if (sessionsError) throw sessionsError;

    // Calculate insights
    const insights = {
      total_sessions: sessions.length,
      avg_session_duration: sessions.length > 0
        ? Math.round(sessions.reduce((sum, s) => sum + (s.duration_actual || 0), 0) / sessions.length)
        : 0,
      most_productive_day: null,
      most_productive_time: null,
      completion_rate: null,
      avg_rating: sessions.length > 0
        ? (sessions.reduce((sum, s) => sum + (s.rating || 0), 0) / sessions.filter(s => s.rating).length).toFixed(2)
        : 0,
    };

    // Analyze completion rate
    const { data: allSessions } = await supabase
      .from('study_sessions')
      .select('status')
      .eq('user_id', userId);

    if (allSessions) {
      const completed = allSessions.filter(s => s.status === 'completed').length;
      const total = allSessions.length;
      insights.completion_rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    res.json({ insights, recent_sessions: sessions.slice(0, 10) });
  } catch (error: any) {
    logger.error('Error fetching study insights:', error);
    res.status(500).json({ error: 'Failed to fetch study insights', details: error.message });
  }
});

export default router;
