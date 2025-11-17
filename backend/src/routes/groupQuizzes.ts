import { Router } from 'express';
import { supabase } from '../services/supabase';
import logger from '../utils/logger';

const router = Router();

// Middleware to get user from auth
const getUserId = async (req: any) => {
  return req.user?.id || '00000000-0000-0000-0000-000000000000';
};

// ============================================================
// GROUP QUIZZES
// ============================================================

// Create a group quiz
router.post('/:groupId/quizzes', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId } = req.params;
    const { title, description, settings, scheduled_for } = req.body;

    // Check if user is owner or instructor
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!membership || !['owner', 'instructor'].includes(membership.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { data: quiz, error } = await supabase
      .from('group_quizzes')
      .insert({
        group_id: groupId,
        created_by: userId,
        title,
        description,
        settings: settings || {},
        scheduled_for,
        status: scheduled_for ? 'scheduled' : 'draft',
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ quiz });
  } catch (error: any) {
    logger.error('Error creating quiz:', error);
    res.status(500).json({ error: 'Failed to create quiz', details: error.message });
  }
});

// Get group quizzes
router.get('/:groupId/quizzes', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId } = req.params;

    // Verify user has access
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: quizzes, error } = await supabase
      .from('group_quizzes')
      .select(`
        *,
        users (
          id,
          full_name,
          email
        )
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ quizzes });
  } catch (error: any) {
    logger.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes', details: error.message });
  }
});

// Get specific quiz
router.get('/:groupId/quizzes/:quizId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId, quizId } = req.params;

    // Verify user has access
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: quiz, error } = await supabase
      .from('group_quizzes')
      .select('*')
      .eq('id', quizId)
      .eq('group_id', groupId)
      .single();

    if (error) throw error;

    res.json({ quiz });
  } catch (error: any) {
    logger.error('Error fetching quiz:', error);
    res.status(500).json({ error: 'Failed to fetch quiz', details: error.message });
  }
});

// Update quiz
router.put('/:groupId/quizzes/:quizId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId, quizId } = req.params;
    const updates = req.body;

    // Check if user is owner or instructor
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!membership || !['owner', 'instructor'].includes(membership.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { data: quiz, error } = await supabase
      .from('group_quizzes')
      .update(updates)
      .eq('id', quizId)
      .eq('group_id', groupId)
      .select()
      .single();

    if (error) throw error;

    res.json({ quiz });
  } catch (error: any) {
    logger.error('Error updating quiz:', error);
    res.status(500).json({ error: 'Failed to update quiz', details: error.message });
  }
});

// Delete quiz
router.delete('/:groupId/quizzes/:quizId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId, quizId } = req.params;

    // Check if user is owner or instructor
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!membership || !['owner', 'instructor'].includes(membership.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { error } = await supabase
      .from('group_quizzes')
      .delete()
      .eq('id', quizId)
      .eq('group_id', groupId);

    if (error) throw error;

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting quiz:', error);
    res.status(500).json({ error: 'Failed to delete quiz', details: error.message });
  }
});

// Take a quiz
router.post('/:groupId/quizzes/:quizId/attempt', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId, quizId } = req.params;
    const { answers, time_spent } = req.body;

    // Verify user is member of group
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get quiz to calculate score
    const { data: quiz, error: quizError } = await supabase
      .from('group_quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (quizError) throw quizError;

    // Calculate score (simplified - in real implementation, this would be more sophisticated)
    const settings = quiz.settings || {};
    const totalQuestions = settings.questionCount || 10;
    const correctAnswers = answers.filter((a: any) => a.isCorrect).length;
    const score = (correctAnswers / totalQuestions) * 100;
    const maxScore = 100;
    const passed = score >= (settings.passingScore || 70);

    const { data: attempt, error } = await supabase
      .from('group_quiz_attempts')
      .insert({
        quiz_id: quizId,
        user_id: userId,
        group_id: groupId,
        score,
        max_score: maxScore,
        passed,
        time_spent,
        answers,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ attempt });
  } catch (error: any) {
    logger.error('Error taking quiz:', error);
    res.status(500).json({ error: 'Failed to submit quiz', details: error.message });
  }
});

// Get quiz attempts
router.get('/:groupId/quizzes/:quizId/attempts', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId, quizId } = req.params;

    // Verify user has access
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: attempts, error } = await supabase
      .from('group_quiz_attempts')
      .select(`
        *,
        users (
          id,
          full_name,
          email
        )
      `)
      .eq('quiz_id', quizId)
      .order('started_at', { ascending: false });

    if (error) throw error;

    res.json({ attempts });
  } catch (error: any) {
    logger.error('Error fetching attempts:', error);
    res.status(500).json({ error: 'Failed to fetch attempts', details: error.message });
  }
});

// Get quiz leaderboard
router.get('/:groupId/quizzes/:quizId/leaderboard', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId, quizId } = req.params;

    // Verify user has access
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: leaderboard, error } = await supabase
      .from('group_quiz_attempts')
      .select(`
        user_id,
        score,
        max_score,
        passed,
        time_spent,
        completed_at,
        users (
          id,
          full_name
        )
      `)
      .eq('quiz_id', quizId)
      .order('score', { ascending: false })
      .order('time_spent', { ascending: true });

    if (error) throw error;

    res.json({ leaderboard });
  } catch (error: any) {
    logger.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard', details: error.message });
  }
});

export default router;
