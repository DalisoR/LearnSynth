import { Router } from 'express';
import { supabase } from '../services/supabase';
import logger from '../utils/logger';

const router = Router();

// Middleware to get user from auth
const getUserId = async (req: any) => {
  return req.user?.id || '00000000-0000-0000-0000-000000000000';
};

// ============================================================
// GROUP MATERIALS (DOCUMENTS)
// ============================================================

// Get group documents
router.get('/:groupId/materials', async (req: any, res) => {
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

    const { data: documents, error } = await supabase
      .from('group_documents')
      .select(`
        id,
        category,
        is_pinned,
        shared_at,
        access_level,
        document_id,
        uploaded_by,
        documents (
          id,
          title,
          file_type,
          file_size,
          file_path,
          metadata,
          created_at
        ),
        users (
          id,
          full_name,
          email
        )
      `)
      .eq('group_id', groupId)
      .order('shared_at', { ascending: false });

    if (error) throw error;

    res.json({ documents });
  } catch (error: any) {
    logger.error('Error fetching group materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials', details: error.message });
  }
});

// Upload/share document to group
router.post('/:groupId/materials', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId } = req.params;
    const { document_id, category, access_level } = req.body;

    // Check if user is owner or instructor
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if member has permission to upload
    const canUpload = membership.role === 'owner' ||
      membership.role === 'instructor' ||
      (membership.role === 'member' && access_level === 'all');

    if (!canUpload) {
      return res.status(403).json({ error: 'Insufficient permissions to upload' });
    }

    const { data: groupDoc, error } = await supabase
      .from('group_documents')
      .insert({
        group_id: groupId,
        document_id,
        uploaded_by: userId,
        category: category || 'general',
        access_level: access_level || 'all',
      })
      .select(`
        *,
        documents (
          id,
          title,
          file_type,
          file_size,
          file_path,
          metadata,
          created_at
        )
      `)
      .single();

    if (error) throw error;

    res.json({ document: groupDoc });
  } catch (error: any) {
    logger.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document', details: error.message });
  }
});

// Update document metadata
router.put('/:groupId/materials/:docId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId, docId } = req.params;
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

    const { data: updatedDoc, error } = await supabase
      .from('group_documents')
      .update(updates)
      .eq('id', docId)
      .eq('group_id', groupId)
      .select()
      .single();

    if (error) throw error;

    res.json({ document: updatedDoc });
  } catch (error: any) {
    logger.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document', details: error.message });
  }
});

// Remove document from group
router.delete('/:groupId/materials/:docId', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId, docId } = req.params;

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
      .from('group_documents')
      .delete()
      .eq('id', docId)
      .eq('group_id', groupId);

    if (error) throw error;

    res.json({ message: 'Document removed successfully' });
  } catch (error: any) {
    logger.error('Error removing document:', error);
    res.status(500).json({ error: 'Failed to remove document', details: error.message });
  }
});

// Pin/unpin document
router.post('/:groupId/materials/:docId/pin', async (req: any, res) => {
  try {
    const userId = await getUserId(req);
    const { groupId, docId } = req.params;
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

    const { data: updatedDoc, error } = await supabase
      .from('group_documents')
      .update({ is_pinned })
      .eq('id', docId)
      .eq('group_id', groupId)
      .select()
      .single();

    if (error) throw error;

    res.json({ document: updatedDoc });
  } catch (error: any) {
    logger.error('Error pinning document:', error);
    res.status(500).json({ error: 'Failed to pin document', details: error.message });
  }
});

export default router;
