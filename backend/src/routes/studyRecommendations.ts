import { Router } from 'express';
import { supabase } from '../services/supabase';
import logger from '../utils/logger';

const router = Router();

const getUserId = async (req: any) => {
  return req.user?.id || '00000000-0000-0000-0000-000000000000';
};

// ============================================================
// STUDY RECOMMENDATIONS
// ============================================================

// Get study recommendations
router.get('/', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { study_plan_id } = req.query;

    let query = supabase
      .from('study_recommendations')
      .select('*')
      .eq('user_id', userId)
      .eq('dismissed', false)
      .order('priority', { ascending: false });

    if (study_plan_id) {
      query = query.eq('study_plan_id', study_plan_id);
    }

    // Filter out expired recommendations
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    const { data: recommendations, error } = await query;

    if (error) throw error;

    res.json({ recommendations });
  } catch (error: any) {
    logger.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations', details: error.message });
  }
});

// Dismiss a recommendation
router.put('/:recommendationId/dismiss', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { recommendationId } = req.params;

    const { data: recommendation, error } = await supabase
      .from('study_recommendations')
      .update({ dismissed: true })
      .eq('id', recommendationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ recommendation });
  } catch (error: any) {
    logger.error('Error dismissing recommendation:', error);
    res.status(500).json({ error: 'Failed to dismiss recommendation', details: error.message });
  }
});

// Generate AI-powered study recommendations
router.post('/generate', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { study_plan_id } = req.body;

    // Get user's recent activity
    const { data: recentSessions } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('actual_start', { ascending: false })
      .limit(20);

    // Get goals
    const { data: goals } = await supabase
      .from('study_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    // Generate recommendations based on data
    const recommendations = [];

    // Recommendation 1: Review struggling topics
    if (recentSessions) {
      const lowRatedSessions = recentSessions.filter(s => s.rating && s.rating <= 2);
      if (lowRatedSessions.length > 0) {
        recommendations.push({
          user_id: userId,
          study_plan_id,
          recommendation_type: 'review',
          title: 'Time for Review Sessions',
          description: `You have ${lowRatedSessions.length} sessions with low ratings. Consider scheduling review sessions for these topics.`,
          priority: 'high',
          action_required: true,
        });
      }
    }

    // Recommendation 2: Goals at risk
    if (goals) {
      const atRiskGoals = goals.filter(g => {
        const daysRemaining = new Date(g.end_date).getTime() - new Date().getTime();
        const daysTotal = new Date(g.end_date).getTime() - new Date(g.start_date).getTime();
        const timeElapsed = 1 - (daysRemaining / daysTotal);
        const progressNeeded = g.current_value / g.target_value;
        return progressNeeded < timeElapsed;
      });

      if (atRiskGoals.length > 0) {
        recommendations.push({
          user_id: userId,
          study_plan_id,
          recommendation_type: 'goal',
          title: 'Goals Need Attention',
          description: `You have ${atRiskGoals.length} goals that are behind schedule. Consider increasing your study time.`,
          priority: 'urgent',
          action_required: true,
        });
      }
    }

    // Recommendation 3: Consistent scheduling
    recommendations.push({
      user_id: userId,
      study_plan_id,
      recommendation_type: 'schedule',
      title: 'Optimize Your Schedule',
      description: 'Based on your activity, you study most effectively in the mornings. Try scheduling difficult subjects earlier in the day.',
      priority: 'medium',
      action_required: false,
    });

    // Insert recommendations
    const { data: inserted, error } = await supabase
      .from('study_recommendations')
      .insert(recommendations)
      .select();

    if (error) throw error;

    res.json({ recommendations: inserted });
  } catch (error: any) {
    logger.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations', details: error.message });
  }
});

export default router;
