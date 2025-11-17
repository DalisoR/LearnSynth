import { Router } from 'express';
import { supabase } from '../services/supabase';
import logger from '../utils/logger';

const router = Router();

const getUserId = async (req: any) => {
  return req.user?.id || '00000000-0000-0000-0000-000000000000';
};

// ============================================================
// STUDY SESSIONS
// ============================================================

// Create a new study session
router.post('/', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const {
      study_plan_id,
      title,
      description,
      subject_id,
      chapter_id,
      document_id,
      group_id,
      session_type,
      scheduled_start,
      scheduled_end,
      duration_planned,
      priority,
    } = req.body;

    const { data: session, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: userId,
        study_plan_id,
        title,
        description,
        subject_id,
        chapter_id,
        document_id,
        group_id,
        session_type: session_type || 'study',
        scheduled_start,
        scheduled_end,
        duration_planned,
        priority: priority || 'medium',
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ session });
  } catch (error: any) {
    logger.error('Error creating study session:', error);
    res.status(500).json({ error: 'Failed to create study session', details: error.message });
  }
});

// Get user's study sessions
router.get('/', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { start_date, end_date, status, study_plan_id, session_type } = req.query;

    let query = supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_start', { ascending: true });

    if (study_plan_id) {
      query = query.eq('study_plan_id', study_plan_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (session_type) {
      query = query.eq('session_type', session_type);
    }

    if (start_date) {
      query = query.gte('scheduled_start', start_date);
    }

    if (end_date) {
      query = query.lte('scheduled_start', end_date);
    }

    const { data: sessions, error } = await query;

    if (error) throw error;

    res.json({ sessions });
  } catch (error: any) {
    logger.error('Error fetching study sessions:', error);
    res.status(500).json({ error: 'Failed to fetch study sessions', details: error.message });
  }
});

// Get upcoming sessions
router.get('/upcoming', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { days_ahead } = req.query;

    const { data: sessions, error } = await supabase
      .rpc('get_upcoming_sessions', {
        user_uuid: userId,
        days_ahead: parseInt(days_ahead as string) || 7,
      });

    if (error) throw error;

    res.json({ sessions });
  } catch (error: any) {
    logger.error('Error fetching upcoming sessions:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming sessions', details: error.message });
  }
});

// Get specific session
router.get('/:sessionId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { sessionId } = req.params;

    const { data: session, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    res.json({ session });
  } catch (error: any) {
    logger.error('Error fetching study session:', error);
    res.status(500).json({ error: 'Failed to fetch study session', details: error.message });
  }
});

// Update study session
router.put('/:sessionId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { sessionId } = req.params;
    const updates = req.body;

    const { data: session, error } = await supabase
      .from('study_sessions')
      .update(updates)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ session });
  } catch (error: any) {
    logger.error('Error updating study session:', error);
    res.status(500).json({ error: 'Failed to update study session', details: error.message });
  }
});

// Delete study session
router.delete('/:sessionId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { sessionId } = req.params;

    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ message: 'Study session deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting study session:', error);
    res.status(500).json({ error: 'Failed to delete study session', details: error.message });
  }
});

// Start a study session
router.post('/:sessionId/start', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { sessionId } = req.params;

    const { data: session, error } = await supabase
      .from('study_sessions')
      .update({
        status: 'in_progress',
        actual_start: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .eq('status', 'scheduled')
      .select()
      .single();

    if (error) throw error;

    res.json({ session });
  } catch (error: any) {
    logger.error('Error starting study session:', error);
    res.status(500).json({ error: 'Failed to start study session', details: error.message });
  }
});

// Complete a study session
router.post('/:sessionId/complete', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { sessionId } = req.params;
    const { completion_notes, rating } = req.body;

    const { data: session, error: sessionError } = await supabase
      .from('study_sessions')
      .select('actual_start, duration_planned')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError) throw sessionError;

    const actualEnd = new Date().toISOString();
    const actualStart = new Date(session.actual_start);
    const durationActual = Math.floor((new Date(actualEnd).getTime() - actualStart.getTime()) / 60000);

    const { data: updatedSession, error } = await supabase
      .from('study_sessions')
      .update({
        status: 'completed',
        actual_end: actualEnd,
        duration_actual: durationActual,
        completion_notes,
        rating,
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Update study plan progress
    await supabase
      .from('study_plans')
      .update({
        total_hours_completed: supabase.sql`total_hours_completed + ${durationActual / 60}`,
      })
      .eq('id', updatedSession.study_plan_id)
      .eq('user_id', userId);

    // Record analytics
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('study_analytics')
      .upsert({
        user_id: userId,
        study_plan_id: updatedSession.study_plan_id,
        date: today,
        total_study_time: supabase.sql`study_analytics.total_study_time + ${durationActual}`,
        sessions_completed: supabase.sql`study_analytics.sessions_completed + 1`,
      }, {
        onConflict: 'user_id,study_plan_id,date',
      });

    res.json({ session: updatedSession });
  } catch (error: any) {
    logger.error('Error completing study session:', error);
    res.status(500).json({ error: 'Failed to complete study session', details: error.message });
  }
});

// Reschedule a study session
router.post('/:sessionId/reschedule', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { sessionId } = req.params;
    const { new_start, new_end } = req.body;

    const { data: session, error } = await supabase
      .from('study_sessions')
      .update({
        scheduled_start: new_start,
        scheduled_end: new_end,
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .eq('status', 'scheduled')
      .select()
      .single();

    if (error) throw error;

    res.json({ session });
  } catch (error: any) {
    logger.error('Error rescheduling study session:', error);
    res.status(500).json({ error: 'Failed to reschedule study session', details: error.message });
  }
});

// Mark session as missed
router.post('/:sessionId/missed', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { sessionId } = req.params;

    const { data: session, error } = await supabase
      .from('study_sessions')
      .update({ status: 'missed' })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ session });
  } catch (error: any) {
    logger.error('Error marking session as missed:', error);
    res.status(500).json({ error: 'Failed to mark session as missed', details: error.message });
  }
});

export default router;
