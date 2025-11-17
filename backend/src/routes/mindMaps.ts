import express, { Request, Response } from 'express';
import { supabase } from '../services/supabase';
import aiMindMapService from '../services/learning/aiMindMapService';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ========================================
// MIND MAP GENERATION
// ========================================

// Generate AI mind map from content
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      title,
      content,
      sourceType,
      sourceId,
      layoutType,
      theme,
      maxDepth,
      maxNodes,
      includeDetails,
      generationPrompt,
    } = req.body;

    if (!title || !content || !sourceType) {
      return res.status(400).json({
        error: 'title, content, and sourceType are required',
      });
    }

    // Generate mind map using AI service
    const mindMap = await aiMindMapService.generateMindMap(userId, {
      title,
      content,
      sourceType,
      sourceId,
      layoutType,
      theme,
      maxDepth,
      maxNodes,
      includeDetails,
      generationPrompt,
    });

    // Save mind map to database
    const { data: savedMindMap, error: saveError } = await supabase
      .from('mind_maps')
      .insert({
        id: mindMap.id,
        user_id: userId,
        title: mindMap.title,
        source_content: content,
        source_type: sourceType,
        source_id: sourceId || null,
        structure: mindMap.structure,
        layout_type: mindMap.layoutType,
        theme: mindMap.theme,
        ai_generated: true,
        generation_prompt: mindMap.generationPrompt,
        generation_metadata: mindMap.generationMetadata,
        version: 1,
      })
      .select()
      .single();

    if (saveError) {
      return res.status(500).json({ error: saveError.message });
    }

    // Save nodes and connections separately
    const nodesToSave = mindMap.structure.nodes.map((node) => ({
      id: uuidv4(),
      mind_map_id: mindMap.id,
      node_id: node.id,
      parent_node_id: node.parent || null,
      level: node.level,
      label: node.label,
      content: node.content || null,
      node_type: node.type,
      position_x: node.position?.x || 0,
      position_y: node.position?.y || 0,
      shape: node.style?.shape || 'rectangle',
      color: node.style?.color || null,
      background_color: node.style?.backgroundColor || null,
      text_color: node.style?.textColor || null,
      font_size: node.style?.fontSize || 14,
      font_weight: node.style?.fontWeight || 'normal',
      style: node.style || {},
      metadata: {
        position: node.position,
        style: node.style,
      },
    }));

    const connectionsToSave = mindMap.structure.connections.map((conn) => ({
      id: uuidv4(),
      mind_map_id: mindMap.id,
      source_node_id: conn.source,
      target_node_id: conn.target,
      label: conn.label || null,
      connection_type: conn.type || 'default',
      style: {
        type: conn.type,
      },
      metadata: {},
    }));

    // Insert nodes
    const { error: nodesError } = await supabase
      .from('mind_map_nodes')
      .insert(nodesToSave);

    if (nodesError) {
      console.error('Error saving nodes:', nodesError);
    }

    // Insert connections
    const { error: connectionsError } = await supabase
      .from('mind_map_connections')
      .insert(connectionsToSave);

    if (connectionsError) {
      console.error('Error saving connections:', connectionsError);
    }

    res.status(201).json({ mindMap: savedMindMap });
  } catch (error: any) {
    console.error('Error generating mind map:', error);
    res.status(500).json({ error: 'Failed to generate mind map' });
  }
});

// ========================================
// MIND MAP RETRIEVAL
// ========================================

// Get user's mind maps
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit = 20, offset = 0, sourceType, search } = req.query;

    let query = supabase
      .from('mind_maps')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (sourceType) {
      query = query.eq('source_type', sourceType);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data: mindMaps, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ mindMaps });
  } catch (error: any) {
    console.error('Error fetching mind maps:', error);
    res.status(500).json({ error: 'Failed to fetch mind maps' });
  }
});

// Get specific mind map by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get mind map
    const { data: mindMap, error: mindMapError } = await supabase
      .from('mind_maps')
      .select('*')
      .eq('id', id)
      .single();

    if (mindMapError) {
      return res.status(404).json({ error: 'Mind map not found' });
    }

    // Check if user has access
    if (mindMap.user_id !== userId && !mindMap.is_public) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('mind_map_nodes')
      .select('*')
      .eq('mind_map_id', id)
      .order('level', { ascending: true });

    if (nodesError) {
      console.error('Error fetching nodes:', nodesError);
    }

    // Get connections
    const { data: connections, error: connectionsError } = await supabase
      .from('mind_map_connections')
      .select('*')
      .eq('mind_map_id', id);

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
    }

    // Combine structure
    const structure = {
      nodes: nodes || [],
      connections: connections || [],
    };

    // Get analytics
    const analytics = aiMindMapService.analyzeMindMap({
      nodes: (nodes || []).map((n) => ({
        id: n.node_id,
        label: n.label,
        content: n.content,
        type: n.node_type,
        level: n.level,
        parent: n.parent_node_id,
        position: { x: n.position_x, y: n.position_y },
        style: {
          shape: n.shape,
          color: n.color,
          backgroundColor: n.background_color,
          textColor: n.text_color,
          fontSize: n.font_size,
          fontWeight: n.font_weight,
        },
      })),
      connections: (connections || []).map((c) => ({
        source: c.source_node_id,
        target: c.target_node_id,
        label: c.label,
        type: c.connection_type,
      })),
    });

    res.json({
      mindMap,
      structure,
      analytics,
    });
  } catch (error: any) {
    console.error('Error fetching mind map:', error);
    res.status(500).json({ error: 'Failed to fetch mind map' });
  }
});

// Get mind map structure only
router.get('/:id/structure', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: structure, error } = await supabase.rpc(
      'generate_mind_map_structure',
      { mind_map_id_param: id }
    );

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ structure });
  } catch (error: any) {
    console.error('Error fetching mind map structure:', error);
    res.status(500).json({ error: 'Failed to fetch structure' });
  }
});

// ========================================
// MIND MAP MANAGEMENT
// ========================================

// Update mind map
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, structure, layoutType, theme, settings, tags } = req.body;

    // Update mind map
    const { data: mindMap, error } = await supabase
      .from('mind_maps')
      .update({
        title,
        structure,
        layout_type: layoutType,
        theme,
        settings,
        tags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ mindMap });
  } catch (error: any) {
    console.error('Error updating mind map:', error);
    res.status(500).json({ error: 'Failed to update mind map' });
  }
});

// Delete mind map
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('mind_maps')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Mind map deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting mind map:', error);
    res.status(500).json({ error: 'Failed to delete mind map' });
  }
});

// ========================================
// LAYOUT & THEME
// ========================================

// Regenerate layout
router.post('/:id/regenerate-layout', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { layoutType } = req.body;

    if (!layoutType) {
      return res.status(400).json({ error: 'layoutType is required' });
    }

    // Get current mind map
    const { data: mindMap, error: mindMapError } = await supabase
      .from('mind_maps')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (mindMapError) {
      return res.status(404).json({ error: 'Mind map not found' });
    }

    // Regenerate layout
    const newStructure = await aiMindMapService.regenerateLayout(
      id,
      mindMap.structure,
      layoutType
    );

    // Update mind map
    const { data: updatedMindMap, error } = await supabase
      .from('mind_maps')
      .update({
        structure: newStructure,
        layout_type: layoutType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ mindMap: updatedMindMap });
  } catch (error: any) {
    console.error('Error regenerating layout:', error);
    res.status(500).json({ error: 'Failed to regenerate layout' });
  }
});

// Change theme
router.put('/:id/theme', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { theme } = req.body;

    if (!theme) {
      return res.status(400).json({ error: 'theme is required' });
    }

    const { data: mindMap, error } = await supabase
      .from('mind_maps')
      .update({
        theme,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ mindMap });
  } catch (error: any) {
    console.error('Error updating theme:', error);
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

// ========================================
// ENHANCEMENT & EXPORT
// ========================================

// Enhance mind map with AI
router.post('/:id/enhance', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { additionalContent } = req.body;

    // Get current mind map
    const { data: mindMap, error: mindMapError } = await supabase
      .from('mind_maps')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (mindMapError) {
      return res.status(404).json({ error: 'Mind map not found' });
    }

    // Enhance structure
    const enhancedStructure = await aiMindMapService.enhanceMindMap(
      mindMap.structure,
      additionalContent
    );

    // Update mind map
    const { data: updatedMindMap, error } = await supabase
      .from('mind_maps')
      .update({
        structure: enhancedStructure,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ mindMap: updatedMindMap });
  } catch (error: any) {
    console.error('Error enhancing mind map:', error);
    res.status(500).json({ error: 'Failed to enhance mind map' });
  }
});

// Export mind map
router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { format = 'json' } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get mind map
    const { data: mindMap, error: mindMapError } = await supabase
      .from('mind_maps')
      .select('*')
      .eq('id', id)
      .single();

    if (mindMapError || (mindMap.user_id !== userId && !mindMap.is_public)) {
      return res.status(404).json({ error: 'Mind map not found' });
    }

    // Get structure
    const { data: structure } = await supabase.rpc(
      'generate_mind_map_structure',
      { mind_map_id_param: id }
    );

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${mindMap.title.replace(/\s+/g, '_')}.json"`
      );
      res.json({
        mindMap,
        structure,
        exportedAt: new Date().toISOString(),
      });
    } else if (format === 'markdown') {
      const markdown = aiMindMapService.exportToMarkdown(
        mindMap.title,
        structure
      );
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${mindMap.title.replace(/\s+/g, '_')}.md"`
      );
      res.send(markdown);
    } else {
      return res.status(400).json({ error: 'Unsupported export format' });
    }
  } catch (error: any) {
    console.error('Error exporting mind map:', error);
    res.status(500).json({ error: 'Failed to export mind map' });
  }
});

// ========================================
// SHARING & COLLABORATION
// ========================================

// Share mind map
router.post('/:id/share', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { isPublic, collaborators } = req.body;

    // Update public status
    if (isPublic !== undefined) {
      const { error: updateError } = await supabase
        .from('mind_maps')
        .update({
          is_public: isPublic,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId);

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }
    }

    // Add collaborators
    if (collaborators && Array.isArray(collaborators)) {
      const collaboratorsToAdd = collaborators.map((collab: any) => ({
        id: uuidv4(),
        mind_map_id: id,
        user_id: collab.userId,
        permission_level: collab.permission || 'view',
        invited_by: userId,
        status: 'pending',
      }));

      const { error: collabError } = await supabase
        .from('mind_map_collaborators')
        .insert(collaboratorsToAdd);

      if (collabError) {
        console.error('Error adding collaborators:', collabError);
      }
    }

    res.json({ message: 'Mind map sharing settings updated' });
  } catch (error: any) {
    console.error('Error sharing mind map:', error);
    res.status(500).json({ error: 'Failed to update sharing settings' });
  }
});

// Get collaborators
router.get('/:id/collaborators', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: collaborators, error } = await supabase
      .from('mind_map_collaborators')
      .select('*')
      .eq('mind_map_id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ collaborators });
  } catch (error: any) {
    console.error('Error fetching collaborators:', error);
    res.status(500).json({ error: 'Failed to fetch collaborators' });
  }
});

// ========================================
// ANALYTICS
// ========================================

// Get mind map analytics
router.get('/:id/analytics', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get structure
    const { data: structure } = await supabase.rpc(
      'generate_mind_map_structure',
      { mind_map_id_param: id }
    );

    // Analyze structure
    const analytics = aiMindMapService.analyzeMindMap(structure);

    // Get user statistics
    const { data: userMindMaps } = await supabase
      .from('mind_maps')
      .select('id')
      .eq('user_id', userId);

    const userStats = {
      totalMindMaps: userMindMaps?.length || 0,
      analytics,
    };

    res.json({ analytics: userStats });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
