import { Router } from 'express';
import { supabase } from '../services/supabase';
import logger from '../utils/logger';

const router = Router();

const getUserId = async (req: any) => {
  return req.user?.id || '00000000-0000-0000-0000-000000000000';
};

// ============================================================
// STUDY GOALS
// ============================================================

// Create a new study goal
router.post('/', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const {
      study_plan_id,
      title,
      description,
      goal_type,
      target_value,
      unit,
      start_date,
      end_date,
      metadata,
    } = req.body;

    const { data: goal, error } = await supabase
      .from('study_goals')
      .insert({
        user_id: userId,
        study_plan_id,
        title,
        description,
        goal_type,
        target_value,
        unit,
        start_date,
        end_date,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ goal });
  } catch (error: any) {
    logger.error('Error creating study goal:', error);
    res.status(500).json({ error: 'Failed to create study goal', details: error.message });
  }
});

// Get user's study goals
router.get('/', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { status, goal_type, study_plan_id } = req.query;

    let query = supabase
      .from('study_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (goal_type) {
      query = query.eq('goal_type', goal_type);
    }

    if (study_plan_id) {
      query = query.eq('study_plan_id', study_plan_id);
    }

    const { data: goals, error } = await query;

    if (error) throw error;

    res.json({ goals });
  } catch (error: any) {
    logger.error('Error fetching study goals:', error);
    res.status(500).json({ error: 'Failed to fetch study goals', details: error.message });
  }
});

// Update study goal progress
router.put('/:goalId/progress', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { goalId } = req.params;
    const { current_value } = req.body;

    const { data: goal, error } = await supabase
      .from('study_goals')
      .update({ current_value })
      .eq('id', goalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Check if goal is completed
    if (goal.current_value >= goal.target_value && goal.status === 'active') {
      await supabase
        .from('study_goals')
        .update({ status: 'completed' })
        .eq('id', goalId);
    }

    res.json({ goal });
  } catch (error: any) {
    logger.error('Error updating goal progress:', error);
    res.status(500).json({ error: 'Failed to update goal progress', details: error.message });
  }
});

// Delete study goal
router.delete('/:goalId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { goalId } = req.params;

    const { error } = await supabase
      .from('study_goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ message: 'Study goal deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting study goal:', error);
    res.status(500).json({ error: 'Failed to delete study goal', details: error.message });
  }
});

export default router;
