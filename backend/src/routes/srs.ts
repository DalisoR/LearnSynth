import { Router } from 'express';
import { supabase } from '../services/supabase';
import { calculateNextReview } from '../services/srs/sm2';
import logger from '../utils/logger';

const router = Router();

// Get due SRS items
router.get('/due', async (req, res) => {
  try {
    const userId = '00000000-0000-0000-0000-000000000000';
    const now = new Date().toISOString();

    const { data: items, error } = await supabase
      .from('srs_items')
      .select(`
        *,
        lessons (
          id,
          lesson_title,
          flashcards
        )
      `)
      .eq('user_id', userId)
      .lte('next_review', now)
      .order('next_review', { ascending: true })
      .limit(20);

    if (error) throw error;

    res.json({ items });
  } catch (error) {
    logger.error('Error fetching due SRS items:', error);
    res.status(500).json({ error: 'Failed to fetch due SRS items' });
  }
});

// Submit SRS review
router.post('/review', async (req, res) => {
  try {
    const { srsItemId, quality } = req.body;
    const userId = '00000000-0000-0000-0000-000000000000';

    // Get current SRS item
    const { data: item, error: getError } = await supabase
      .from('srs_items')
      .select('*')
      .eq('id', srsItemId)
      .eq('user_id', userId)
      .single();

    if (getError) throw getError;

    // Calculate next review using SM-2
    const result = calculateNextReview(
      {
        easeFactor: item.ease_factor,
        interval: item.interval,
        repetitions: item.repetitions,
      },
      quality
    );

    // Update SRS item
    const { data: updatedItem, error: updateError } = await supabase
      .from('srs_items')
      .update({
        ease_factor: result.easeFactor,
        interval: result.interval,
        repetitions: result.repetitions,
        next_review: result.nextReview.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', srsItemId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({ item: updatedItem, result });
  } catch (error) {
    logger.error('Error submitting SRS review:', error);
    res.status(500).json({ error: 'Failed to submit SRS review' });
  }
});

export default router;
