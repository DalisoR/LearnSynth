import { Router } from 'express';
import { supabase } from '../services/supabase';
import logger from '../utils/logger';

const router = Router();

const getUserId = async (req: any) => {
  return req.user?.id || '00000000-0000-0000-0000-000000000000';
};

// ============================================================
// STUDY PREFERENCES
// ============================================================

// Get user study preferences
router.get('/', async (req: any, res) => {
  try {
    const userId = await getUserId(req);

    const { data: preferences, error } = await supabase
      .from('study_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({ preferences });
  } catch (error: any) {
    logger.error('Error fetching study preferences:', error);
    res.status(500).json({ error: 'Failed to fetch study preferences', details: error.message });
  }
});

// Update user study preferences
router.put('/', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const updates = req.body;

    const { data: preferences, error } = await supabase
      .from('study_preferences')
      .upsert({
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ preferences });
  } catch (error: any) {
    logger.error('Error updating study preferences:', error);
    res.status(500).json({ error: 'Failed to update study preferences', details: error.message });
  }
});

export default router;
