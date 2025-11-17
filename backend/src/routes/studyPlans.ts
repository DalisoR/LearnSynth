import { Router } from 'express';
import { supabase } from '../services/supabase';
import logger from '../utils/logger';

const router = Router();

// Middleware to get user from auth
const getUserId = async (req: any) => {
  return req.user?.id || '00000000-0000-0000-0000-000000000000';
};

// ============================================================
// STUDY PLANS
// ============================================================

// Create a new study plan
router.post('/', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const {
      name,
      description,
      subject_id,
      group_id,
      start_date,
      target_completion_date,
      total_hours_estimated,
      settings,
    } = req.body;

    const { data: plan, error } = await supabase
      .from('study_plans')
      .insert({
        user_id: userId,
        name,
        description,
        subject_id,
        group_id,
        start_date,
        target_completion_date,
        total_hours_estimated,
        settings: settings || {},
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ plan });
  } catch (error: any) {
    logger.error('Error creating study plan:', error);
    res.status(500).json({ error: 'Failed to create study plan', details: error.message });
  }
});

// Get user's study plans
router.get('/', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { status } = req.query;

    let query = supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: plans, error } = await query;

    if (error) throw error;

    res.json({ plans });
  } catch (error: any) {
    logger.error('Error fetching study plans:', error);
    res.status(500).json({ error: 'Failed to fetch study plans', details: error.message });
  }
});

// Get specific study plan
router.get('/:planId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { planId } = req.params;

    const { data: plan, error } = await supabase
      .from('study_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    res.json({ plan });
  } catch (error: any) {
    logger.error('Error fetching study plan:', error);
    res.status(500).json({ error: 'Failed to fetch study plan', details: error.message });
  }
});

// Update study plan
router.put('/:planId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { planId } = req.params;
    const updates = req.body;

    const { data: plan, error } = await supabase
      .from('study_plans')
      .update(updates)
      .eq('id', planId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ plan });
  } catch (error: any) {
    logger.error('Error updating study plan:', error);
    res.status(500).json({ error: 'Failed to update study plan', details: error.message });
  }
});

// Delete study plan
router.delete('/:planId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { planId } = req.params;

    const { error } = await supabase
      .from('study_plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ message: 'Study plan deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting study plan:', error);
    res.status(500).json({ error: 'Failed to delete study plan', details: error.message });
  }
});

// Auto-generate study plan from document
router.post('/generate-from-document', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { name, document_id, exam_date, daily_hours } = req.body;

    const { data, error } = await supabase.rpc('auto_generate_study_plan', {
      user_uuid: userId,
      plan_name: name,
      doc_id: document_id,
      exam_date,
      daily_hours,
    });

    if (error) throw error;

    res.json({ plan_id: data, message: 'Study plan generated successfully' });
  } catch (error: any) {
    logger.error('Error generating study plan:', error);
    res.status(500).json({ error: 'Failed to generate study plan', details: error.message });
  }
});

// Update study plan progress
router.put('/:planId/progress', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { planId } = req.params;
    const { total_hours_completed } = req.body;

    const { data: plan, error } = await supabase
      .from('study_plans')
      .update({ total_hours_completed })
      .eq('id', planId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ plan });
  } catch (error: any) {
    logger.error('Error updating study plan progress:', error);
    res.status(500).json({ error: 'Failed to update progress', details: error.message });
  }
});

export default router;
