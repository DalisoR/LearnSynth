import { Router } from 'express';
import { supabase } from '../services/supabase';
import logger from '../utils/logger';

const router = Router();

// Create a study group
router.post('/', async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    const userId = '00000000-0000-0000-0000-000000000000';

    const { data: group, error } = await supabase
      .from('study_groups')
      .insert({
        owner_id: userId,
        name,
        description,
        is_private: isPrivate || false,
      })
      .select()
      .single();

    if (error) throw error;

    // Add owner as member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: userId,
        role: 'owner',
      });

    if (memberError) throw memberError;

    res.json({ group });
  } catch (error) {
    logger.error('Error creating study group:', error);
    res.status(500).json({ error: 'Failed to create study group' });
  }
});

// Get user's study groups
router.get('/', async (req, res) => {
  try {
    const userId = '00000000-0000-0000-0000-000000000000';

    const { data: groups, error } = await supabase
      .from('group_members')
      .select(`
        groups (*)
      `)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ groups: groups.map(g => g.groups) });
  } catch (error) {
    logger.error('Error fetching study groups:', error);
    res.status(500).json({ error: 'Failed to fetch study groups' });
  }
});

// Assign lesson to group
router.post('/:groupId/assign', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { lessonId, dueDate } = req.body;

    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert({
        group_id: groupId,
        lesson_id: lessonId,
        due_date: dueDate,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ assignment });
  } catch (error) {
    logger.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Get group analytics
router.get('/:groupId/analytics', async (req, res) => {
  try {
    const { groupId } = req.params;

    // Get assignments with completion status
    const { data: assignments, error } = await supabase
      .from('assignments')
      .select(`
        *,
        group_member_progress (*)
      `)
      .eq('group_id', groupId);

    if (error) throw error;

    const total = assignments.length;
    const completed = assignments.filter(a =>
      a.group_member_progress?.some(p => p.status === 'completed')
    ).length;

    const avgScore = assignments
      .filter(a => a.group_member_progress?.some(p => p.score))
      .reduce((sum, a) => {
        const score = a.group_member_progress?.find(p => p.score)?.score || 0;
        return sum + score;
      }, 0) / Math.max(completed, 1);

    res.json({
      analytics: {
        totalAssignments: total,
        completedAssignments: completed,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        averageScore: Math.round(avgScore),
      },
    });
  } catch (error) {
    logger.error('Error fetching group analytics:', error);
    res.status(500).json({ error: 'Failed to fetch group analytics' });
  }
});

export default router;
