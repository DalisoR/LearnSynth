import { Router } from 'express';
import { supabase } from '../services/supabase';
import logger from '../utils/logger';

const router = Router();

// Middleware to get user from auth
const getUserId = async (req: any) => {
  return req.user?.id || '00000000-0000-0000-0000-000000000000';
};

// ============================================================
// GROUP DISCUSSIONS
// ============================================================

// Get group discussions
router.get('/:groupId/discussions', async (req: any, res) => {
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

    const { data: discussions, error } = await supabase
      .from('group_discussions')
      .select(`
        *,
        users (
          id,
          full_name,
          email
        ),
        chapters (
          id,
          title,
          chapter_number
        )
      `)
      .eq('group_id', groupId)
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ discussions });
  } catch (error: any) {
    logger.error('Error fetching discussions:', error);
    res.status(500).json({ error: 'Failed to fetch discussions', details: error.message });
  }
});

// Get discussion thread (with replies)
router.get('/:groupId/discussions/:discussionId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId, discussionId } = req.params;

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

    // Get main discussion
    const { data: discussion, error: mainError } = await supabase
      .from('group_discussions')
      .select(`
        *,
        users (
          id,
          full_name,
          email
        ),
        chapters (
          id,
          title,
          chapter_number
        )
      `)
      .eq('id', discussionId)
      .eq('group_id', groupId)
      .single();

    if (mainError) throw mainError;

    // Get replies
    const { data: replies, error: repliesError } = await supabase
      .from('group_discussions')
      .select(`
        *,
        users (
          id,
          full_name,
          email
        )
      `)
      .eq('parent_id', discussionId)
      .order('created_at', { ascending: true });

    if (repliesError) throw repliesError;

    res.json({ discussion, replies });
  } catch (error: any) {
    logger.error('Error fetching discussion:', error);
    res.status(500).json({ error: 'Failed to fetch discussion', details: error.message });
  }
});

// Create discussion
router.post('/:groupId/discussions', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId } = req.params;
    const { title, content, chapter_id, parent_id } = req.body;

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

    const { data: discussion, error } = await supabase
      .from('group_discussions')
      .insert({
        group_id: groupId,
        created_by: userId,
        title,
        content,
        chapter_id,
        parent_id,
      })
      .select(`
        *,
        users (
          id,
          full_name,
          email
        ),
        chapters (
          id,
          title,
          chapter_number
        )
      `)
      .single();

    if (error) throw error;

    res.json({ discussion });
  } catch (error: any) {
    logger.error('Error creating discussion:', error);
    res.status(500).json({ error: 'Failed to create discussion', details: error.message });
  }
});

// Update discussion
router.put('/:groupId/discussions/:discussionId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId, discussionId } = req.params;
    const { title, content } = req.body;

    // Verify user is author
    const { data: discussion, error: fetchError } = await supabase
      .from('group_discussions')
      .select('created_by')
      .eq('id', discussionId)
      .eq('group_id', groupId)
      .single();

    if (fetchError) throw fetchError;

    if (discussion.created_by !== userId) {
      return res.status(403).json({ error: 'Only author can update discussion' });
    }

    const { data: updatedDiscussion, error } = await supabase
      .from('group_discussions')
      .update({ title, content })
      .eq('id', discussionId)
      .eq('group_id', groupId)
      .select()
      .single();

    if (error) throw error;

    res.json({ discussion: updatedDiscussion });
  } catch (error: any) {
    logger.error('Error updating discussion:', error);
    res.status(500).json({ error: 'Failed to update discussion', details: error.message });
  }
});

// Delete discussion
router.delete('/:groupId/discussions/:discussionId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId, discussionId } = req.params;

    // Verify user is author or owner/instructor
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
      .from('group_discussions')
      .delete()
      .eq('id', discussionId)
      .eq('group_id', groupId);

    if (error) throw error;

    res.json({ message: 'Discussion deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting discussion:', error);
    res.status(500).json({ error: 'Failed to delete discussion', details: error.message });
  }
});

// Pin/unpin discussion
router.post('/:groupId/discussions/:discussionId/pin', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId, discussionId } = req.params;
    const { is_pinned } = req.body;

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

    const { data: updatedDiscussion, error } = await supabase
      .from('group_discussions')
      .update({ is_pinned })
      .eq('id', discussionId)
      .eq('group_id', groupId)
      .select()
      .single();

    if (error) throw error;

    res.json({ discussion: updatedDiscussion });
  } catch (error: any) {
    logger.error('Error pinning discussion:', error);
    res.status(500).json({ error: 'Failed to pin discussion', details: error.message });
  }
});

export default router;
