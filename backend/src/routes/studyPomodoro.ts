import { Router } from 'express';
import { supabase } from '../services/supabase';
import logger from '../utils/logger';

const router = Router();

const getUserId = async (req: any) => {
  return req.user?.id || '00000000-0000-0000-0000-000000000000';
};

// ============================================================
// POMODORO SESSIONS
// ============================================================

// Start a pomodoro session
router.post('/start', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { study_session_id, session_type, duration_planned } = req.body;

    const { data: pomodoro, error } = await supabase
      .from('pomodoro_sessions')
      .insert({
        user_id: userId,
        study_session_id,
        start_time: new Date().toISOString(),
        session_type: session_type || 'work',
        duration_planned: duration_planned || 25,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ pomodoro });
  } catch (error: any) {
    logger.error('Error starting pomodoro session:', error);
    res.status(500).json({ error: 'Failed to start pomodoro session', details: error.message });
  }
});

// Complete a pomodoro session
router.post('/:pomodoroId/complete', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { pomodoroId } = req.params;

    const { data: pomodoro, error: fetchError } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .eq('id', pomodoroId)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    const endTime = new Date();
    const startTime = new Date(pomodoro.start_time);
    const durationActual = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);

    const { data: updatedPomodoro, error } = await supabase
      .from('pomodoro_sessions')
      .update({
        end_time: endTime.toISOString(),
        duration_actual: durationActual,
        status: 'completed',
      })
      .eq('id', pomodoroId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ pomodoro: updatedPomodoro });
  } catch (error: any) {
    logger.error('Error completing pomodoro session:', error);
    res.status(500).json({ error: 'Failed to complete pomodoro session', details: error.message });
  }
});

// Get pomodoro sessions for a date
router.get('/', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { date, study_session_id } = req.query;

    let query = supabase
      .from('pomodoro_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });

    if (date) {
      const startOfDay = new Date(date as string);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      query = query
        .gte('start_time', startOfDay.toISOString())
        .lt('start_time', endOfDay.toISOString());
    }

    if (study_session_id) {
      query = query.eq('study_session_id', study_session_id);
    }

    const { data: pomodoros, error } = await query;

    if (error) throw error;

    res.json({ pomodoros });
  } catch (error: any) {
    logger.error('Error fetching pomodoro sessions:', error);
    res.status(500).json({ error: 'Failed to fetch pomodoro sessions', details: error.message });
  }
});

export default router;
