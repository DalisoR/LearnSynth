import api from './api';

// Types
export interface MindMapNode {
  id: string;
  label: string;
  content?: string;
  type: 'topic' | 'subtopic' | 'detail' | 'note' | 'reference';
  level: number;
  parent?: string;
  position?: { x: number; y: number };
  style?: {
    shape?: 'rectangle' | 'circle' | 'diamond' | 'rounded' | 'cloud';
    color?: string;
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold' | 'light';
  };
}

export interface MindMapConnection {
  source: string;
  target: string;
  label?: string;
  type?: 'default' | 'arrow' | 'dashed' | 'thick' | 'bidirectional';
}

export interface MindMapStructure {
  nodes: MindMapNode[];
  connections: MindMapConnection[];
}

export interface MindMap {
  id: string;
  user_id: string;
  title: string;
  source_content?: string;
  source_type: 'lesson' | 'chapter' | 'document' | 'manual';
  source_id?: string;
  structure: MindMapStructure;
  layout_type: 'radial' | 'hierarchical' | 'mind_map' | 'flowchart' | 'tree';
  theme: 'default' | 'colorful' | 'dark' | 'minimal' | 'academic';
  ai_generated: boolean;
  generation_prompt?: string;
  version: number;
  is_public: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface MindMapWithStructure extends MindMap {
  structure: MindMapStructure;
}

export interface GenerateMindMapRequest {
  title: string;
  content: string;
  sourceType: 'lesson' | 'chapter' | 'document' | 'manual';
  sourceId?: string;
  layoutType?: 'radial' | 'hierarchical' | 'mind_map' | 'flowchart' | 'tree';
  theme?: 'default' | 'colorful' | 'dark' | 'minimal' | 'academic';
  maxDepth?: number;
  maxNodes?: number;
  includeDetails?: boolean;
  generationPrompt?: string;
}

export interface RegenerateLayoutRequest {
  layoutType: 'radial' | 'hierarchical' | 'mind_map' | 'flowchart' | 'tree';
}

export interface UpdateThemeRequest {
  theme: 'default' | 'colorful' | 'dark' | 'minimal' | 'academic';
}

export interface ShareRequest {
  isPublic?: boolean;
  collaborators?: Array<{
    userId: string;
    permission?: 'view' | 'comment' | 'edit' | 'admin';
  }>;
}

export interface MindMapAnalytics {
  nodeCount: number;
  connectionCount: number;
  maxLevel: number;
  density: number;
  mainTopics: string[];
  complexity: 'low' | 'medium' | 'high';
}

export interface UserMindMapStats {
  totalMindMaps: number;
  analytics: MindMapAnalytics;
}

export interface ListParams {
  limit?: number;
  offset?: number;
  sourceType?: string;
  search?: string;
}

export interface ExportParams {
  format?: 'json' | 'markdown';
}

// API Functions

/**
 * Generate a new AI mind map from content
 */
export const generateMindMap = async (data: GenerateMindMapRequest): Promise<{ mindMap: MindMap }> => {
  const response = await api.post('/mind-maps/generate', data);
  return response.data;
};

/**
 * Get user's mind maps list
 */
export const getMindMaps = async (params?: ListParams): Promise<{ mindMaps: MindMap[] }> => {
  const response = await api.get('/mind-maps', { params });
  return response.data;
};

/**
 * Get specific mind map by ID
 */
export const getMindMap = async (id: string): Promise<{
  mindMap: MindMap;
  structure: MindMapStructure;
  analytics: MindMapAnalytics;
}> => {
  const response = await api.get(`/mind-maps/${id}`);
  return response.data;
};

/**
 * Get mind map structure only
 */
export const getMindMapStructure = async (id: string): Promise<{ structure: MindMapStructure }> => {
  const response = await api.get(`/mind-maps/${id}/structure`);
  return response.data;
};

/**
 * Update mind map
 */
export const updateMindMap = async (
  id: string,
  data: {
    title?: string;
    structure?: MindMapStructure;
    layoutType?: string;
    theme?: string;
    settings?: any;
    tags?: string[];
  }
): Promise<{ mindMap: MindMap }> => {
  const response = await api.put(`/mind-maps/${id}`, data);
  return response.data;
};

/**
 * Delete mind map
 */
export const deleteMindMap = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/mind-maps/${id}`);
  return response.data;
};

/**
 * Regenerate mind map layout
 */
export const regenerateLayout = async (
  id: string,
  data: RegenerateLayoutRequest
): Promise<{ mindMap: MindMap }> => {
  const response = await api.post(`/mind-maps/${id}/regenerate-layout`, data);
  return response.data;
};

/**
 * Update mind map theme
 */
export const updateTheme = async (id: string, data: UpdateThemeRequest): Promise<{ mindMap: MindMap }> => {
  const response = await api.put(`/mind-maps/${id}/theme`, data);
  return response.data;
};

/**
 * Enhance mind map with AI
 */
export const enhanceMindMap = async (
  id: string,
  data: { additionalContent?: string }
): Promise<{ mindMap: MindMap }> => {
  const response = await api.post(`/mind-maps/${id}/enhance`, data);
  return response.data;
};

/**
 * Export mind map
 */
export const exportMindMap = async (id: string, params?: ExportParams): Promise<Blob> => {
  const response = await api.get(`/mind-maps/${id}/export`, {
    params,
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Share mind map
 */
export const shareMindMap = async (id: string, data: ShareRequest): Promise<{ message: string }> => {
  const response = await api.post(`/mind-maps/${id}/share`, data);
  return response.data;
};

/**
 * Get mind map collaborators
 */
export const getCollaborators = async (id: string): Promise<{ collaborators: any[] }> => {
  const response = await api.get(`/mind-maps/${id}/collaborators`);
  return response.data;
};

/**
 * Get mind map analytics
 */
export const getMindMapAnalytics = async (id: string): Promise<{ analytics: UserMindMapStats }> => {
  const response = await api.get(`/mind-maps/${id}/analytics`);
  return response.data;
};

// Helper Functions

/**
 * Get layout type display label
 */
export const getLayoutTypeLabel = (layoutType: string): string => {
  const labels: { [key: string]: string } = {
    radial: 'Radial',
    hierarchical: 'Hierarchical',
    mind_map: 'Mind Map',
    flowchart: 'Flowchart',
    tree: 'Tree',
  };
  return labels[layoutType] || layoutType;
};

/**
 * Get theme display label
 */
export const getThemeLabel = (theme: string): string => {
  const labels: { [key: string]: string } = {
    default: 'Default',
    colorful: 'Colorful',
    dark: 'Dark',
    minimal: 'Minimal',
    academic: 'Academic',
  };
  return labels[theme] || theme;
};

/**
 * Get theme colors
 */
export const getThemeColors = (theme: string): { [key: string]: string } => {
  const colorSchemes: { [key: string]: { [key: string]: string } } = {
    default: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
    },
    colorful: {
      primary: '#ff6b6b',
      secondary: '#4ecdc4',
      success: '#95e1d3',
      warning: '#ffd93d',
      danger: '#ff8b94',
    },
    dark: {
      primary: '#60a5fa',
      secondary: '#a78bfa',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171',
    },
    minimal: {
      primary: '#000000',
      secondary: '#666666',
      success: '#22c55e',
      warning: '#eab308',
      danger: '#dc2626',
    },
    academic: {
      primary: '#1e40af',
      secondary: '#7c3aed',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
    },
  };
  return colorSchemes[theme] || colorSchemes.default;
};

/**
 * Get complexity label and color
 */
export const getComplexityInfo = (complexity: string): { label: string; color: string } => {
  const complexityInfo: { [key: string]: { label: string; color: string } } = {
    low: { label: 'Low', color: '#10b981' },
    medium: { label: 'Medium', color: '#f59e0b' },
    high: { label: 'High', color: '#ef4444' },
  };
  return complexityInfo[complexity] || complexityInfo.low;
};

/**
 * Get source type icon
 */
export const getSourceTypeIcon = (sourceType: string): string => {
  const icons: { [key: string]: string } = {
    lesson: '📚',
    chapter: '📖',
    document: '📄',
    manual: '📝',
  };
  return icons[sourceType] || '📌';
};

/**
 * Format date
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Calculate depth from nodes
 */
export const calculateMaxDepth = (nodes: MindMapNode[]): number => {
  return nodes.reduce((max, node) => Math.max(max, node.level), 0);
};

/**
 * Get node count by level
 */
export const getNodesByLevel = (nodes: MindMapNode[]): { [level: number]: number } => {
  const byLevel: { [level: number]: number } = {};
  nodes.forEach((node) => {
    byLevel[node.level] = (byLevel[node.level] || 0) + 1;
  });
  return byLevel;
};

/**
 * Format node count
 */
export const formatNodeCount = (count: number): string => {
  return `${count} node${count !== 1 ? 's' : ''}`;
};

/**
 * Check if user can edit mind map
 */
export const canEditMindMap = (mindMap: MindMap, currentUserId?: string): boolean => {
  if (!currentUserId) return false;
  return mindMap.user_id === currentUserId;
};

/**
 * Get mind map title preview
 */
export const getMindMapTitlePreview = (title: string, maxLength: number = 50): string => {
  if (title.length <= maxLength) return title;
  return `${title.substring(0, maxLength)}...`;
};

export default {
  generateMindMap,
  getMindMaps,
  getMindMap,
  getMindMapStructure,
  updateMindMap,
  deleteMindMap,
  regenerateLayout,
  updateTheme,
  enhanceMindMap,
  exportMindMap,
  shareMindMap,
  getCollaborators,
  getMindMapAnalytics,
  getLayoutTypeLabel,
  getThemeLabel,
  getThemeColors,
  getComplexityInfo,
  getSourceTypeIcon,
  formatDate,
  calculateMaxDepth,
  getNodesByLevel,
  formatNodeCount,
  canEditMindMap,
  getMindMapTitlePreview,
};
