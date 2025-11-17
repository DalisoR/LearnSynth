import { Router } from 'express';
import { supabase } from '../services/supabase';
import logger from '../utils/logger';

const router = Router();

// Middleware to get user from auth
const getUserId = async (req: any) => {
  // For now, using a mock user - in production, extract from JWT
  return req.user?.id || '00000000-0000-0000-0000-000000000000';
};

// ============================================================
// GROUP MANAGEMENT
// ============================================================

// Create a group
router.post('/', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { name, description, type, privacy, settings, avatar_url } = req.body;

    // Generate invite code
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name,
        description,
        type: type || 'study',
        owner_id: userId,
        privacy: privacy || 'private',
        invite_code: inviteCode,
        avatar_url,
        settings: settings || {},
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
        status: 'active',
      });

    if (memberError) throw memberError;

    res.json({ group });
  } catch (error: any) {
    logger.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group', details: error.message });
  }
});

// Get user's groups
router.get('/', async (req: any, res) => {
  try {
    const userId = await getUserId(req);

    const { data: memberships, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        role,
        status,
        joined_at,
        groups (
          id,
          name,
          description,
          type,
          owner_id,
          privacy,
          avatar_url,
          created_at,
          is_active,
          settings
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;

    const groups = memberships.map(m => ({
      ...m.groups,
      user_role: m.role,
      joined_at: m.joined_at,
    }));

    res.json({ groups });
  } catch (error: any) {
    logger.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups', details: error.message });
  }
});

// Get group details
router.get('/:groupId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId } = req.params;

    const { data: group, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error) throw error;

    // Check if user is member or group is public
    const { data: membership } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!membership && group.privacy !== 'public') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ group });
  } catch (error: any) {
    logger.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group', details: error.message });
  }
});

// Update group
router.put('/:groupId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId } = req.params;
    const updates = req.body;

    // Check if user is owner
    const { data: group } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', groupId)
      .single();

    if (!group || group.owner_id !== userId) {
      return res.status(403).json({ error: 'Only group owner can update group' });
    }

    const { data: updatedGroup, error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', groupId)
      .select()
      .single();

    if (error) throw error;

    res.json({ group: updatedGroup });
  } catch (error: any) {
    logger.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group', details: error.message });
  }
});

// Delete group
router.delete('/:groupId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId } = req.params;

    // Check if user is owner
    const { data: group } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', groupId)
      .single();

    if (!group || group.owner_id !== userId) {
      return res.status(403).json({ error: 'Only group owner can delete group' });
    }

    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) throw error;

    res.json({ message: 'Group deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group', details: error.message });
  }
});

// Join group (public)
router.post('/:groupId/join', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId } = req.params;

    // Check if group exists and is public
    const { data: group } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.privacy !== 'public') {
      return res.status(403).json({ error: 'This group is private. Request to join instead.' });
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }

    // Add user as member
    const { data: membership, error } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: userId,
        role: 'member',
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ membership });
  } catch (error: any) {
    logger.error('Error joining group:', error);
    res.status(500).json({ error: 'Failed to join group', details: error.message });
  }
});

// Request to join group (private)
router.post('/:groupId/request', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId } = req.params;

    // Check if group exists and is private
    const { data: group } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.privacy !== 'private') {
      return res.status(400).json({ error: 'This group is not private' });
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }

    // Check if already has a pending request
    const { data: existingRequest } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return res.status(400).json({ error: 'Already requested to join' });
    }

    // Add pending request
    const { data: membership, error } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: userId,
        role: 'member',
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ membership });
  } catch (error: any) {
    logger.error('Error requesting to join group:', error);
    res.status(500).json({ error: 'Failed to request join', details: error.message });
  }
});

// Leave group
router.post('/:groupId/leave', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId } = req.params;

    // Check if user is owner
    const { data: group } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', groupId)
      .single();

    if (group?.owner_id === userId) {
      return res.status(400).json({ error: 'Owner cannot leave group. Delete the group instead.' });
    }

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ message: 'Left group successfully' });
  } catch (error: any) {
    logger.error('Error leaving group:', error);
    res.status(500).json({ error: 'Failed to leave group', details: error.message });
  }
});

// ============================================================
// MEMBER MANAGEMENT
// ============================================================

// Get group members
router.get('/:groupId/members', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId } = req.params;

    const { data: members, error } = await supabase
      .from('group_members')
      .select(`
        id,
        role,
        status,
        joined_at,
        permissions,
        user_id,
        users (
          id,
          email,
          full_name
        )
      `)
      .eq('group_id', groupId)
      .eq('status', 'active');

    if (error) throw error;

    res.json({ members });
  } catch (error: any) {
    logger.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members', details: error.message });
  }
});

// Update member role
router.put('/:groupId/members/:userId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId, userId: targetUserId } = req.params;
    const { role, permissions } = req.body;

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

    const { data: updatedMember, error } = await supabase
      .from('group_members')
      .update({ role, permissions })
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)
      .select()
      .single();

    if (error) throw error;

    res.json({ member: updatedMember });
  } catch (error: any) {
    logger.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update member', details: error.message });
  }
});

// Remove member
router.delete('/:groupId/members/:userId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId, userId: targetUserId } = req.params;

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
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', targetUserId);

    if (error) throw error;

    res.json({ message: 'Member removed successfully' });
  } catch (error: any) {
    logger.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member', details: error.message });
  }
});

// ============================================================
// INVITATIONS
// ============================================================

// Send invitation
router.post('/:groupId/invite', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId } = req.params;
    const { email, role } = req.body;

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

    // Generate unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const { data: invitation, error } = await supabase
      .from('group_invitations')
      .insert({
        group_id: groupId,
        email,
        role: role || 'member',
        invited_by: userId,
        invite_code: inviteCode,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ invitation });
  } catch (error: any) {
    logger.error('Error sending invitation:', error);
    res.status(500).json({ error: 'Failed to send invitation', details: error.message });
  }
});

// Accept invitation
router.post('/:groupId/accept', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId } = req.params;
    const { invite_code } = req.body;

    const { data: invitation, error } = await supabase
      .from('group_invitations')
      .select('*')
      .eq('group_id', groupId)
      .eq('invite_code', invite_code)
      .eq('status', 'pending')
      .single();

    if (error || !invitation) {
      return res.status(400).json({ error: 'Invalid or expired invitation' });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Update invitation status
    await supabase
      .from('group_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    // Add user as member
    const { data: membership, error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: userId,
        role: invitation.role,
        status: 'active',
      })
      .select()
      .single();

    if (memberError) throw memberError;

    res.json({ membership });
  } catch (error: any) {
    logger.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Failed to accept invitation', details: error.message });
  }
});

// ============================================================
// GROUP ANALYTICS
// ============================================================

// Get group analytics
router.get('/:groupId/analytics', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId } = req.params;

    // Verify user has access to analytics
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get total members
    const { count: totalMembers } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('status', 'active');

    // Get active members today
    const { count: activeMembers } = await supabase
      .from('group_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('date', new Date().toISOString().split('T')[0]);

    // Get quiz statistics
    const { data: quizAttempts } = await supabase
      .from('group_quiz_attempts')
      .select('*')
      .eq('group_id', groupId);

    const avgQuizScore = quizAttempts.length > 0
      ? quizAttempts.reduce((sum, a) => sum + (a.score / a.max_score * 100), 0) / quizAttempts.length
      : 0;

    // Get study streaks (simplified)
    const { data: recentActivity } = await supabase
      .from('group_analytics')
      .select('*')
      .eq('group_id', groupId)
      .order('date', { ascending: false })
      .limit(7);

    res.json({
      analytics: {
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0,
        avgQuizScore: Math.round(avgQuizScore),
        recentActivity,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching group analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
  }
});

// Get member analytics
router.get('/:groupId/analytics/members', async (req: any, res) => {
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

    // Get all member analytics
    const { data: analytics, error } = await supabase
      .from('group_analytics')
      .select('*')
      .eq('group_id', groupId);

    if (error) throw error;

    res.json({ analytics });
  } catch (error: any) {
    logger.error('Error fetching member analytics:', error);
    res.status(500).json({ error: 'Failed to fetch member analytics', details: error.message });
  }
});

export default router;
