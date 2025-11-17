import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export interface GenerationRequest {
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

class AIMindMapService {
  /**
   * Generate a mind map from lesson content using AI
   */
  async generateMindMap(
    userId: string,
    request: GenerationRequest
  ): Promise<{
    id: string;
    title: string;
    structure: MindMapStructure;
    layoutType: string;
    theme: string;
  }> {
    try {
      const mindMapId = uuidv4();

      // Build AI prompt for mind map generation
      const prompt = this.buildPrompt(request);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert knowledge mapper specializing in creating structured mind maps from educational content. Always return valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const response = completion.choices[0].message.content;

      if (!response) {
        throw new Error('No response from AI');
      }

      const mindMapData = JSON.parse(response);

      // Process and validate the structure
      const structure = this.processMindMapData(mindMapData);

      // Calculate node positions based on layout type
      const positionedStructure = this.calculateNodePositions(
        structure,
        request.layoutType || 'mind_map'
      );

      // Assign unique IDs to nodes
      const structureWithIds = this.assignNodeIds(positionedStructure);

      // Prepare mind map for database
      const mindMap = {
        id: mindMapId,
        userId,
        title: request.title,
        sourceContent: request.content,
        sourceType: request.sourceType,
        sourceId: request.sourceId || null,
        structure: structureWithIds,
        layoutType: request.layoutType || 'mind_map',
        theme: request.theme || 'default',
        aiGenerated: true,
        generationPrompt: prompt,
        generationMetadata: {
          model: 'gpt-4',
          maxDepth: request.maxDepth || 3,
          maxNodes: request.maxNodes || 20,
          includeDetails: request.includeDetails || false,
          timestamp: Date.now(),
        },
      };

      return mindMap;
    } catch (error: any) {
      console.error('Error generating mind map:', error);
      throw new Error('Failed to generate mind map');
    }
  }

  /**
   * Build AI prompt for mind map generation
   */
  private buildPrompt(request: GenerationRequest): string {
    const maxDepth = request.maxDepth || 3;
    const maxNodes = request.maxNodes || 20;

    return `
Generate a mind map from the following educational content.

Title: ${request.title}
Source Type: ${request.sourceType}
Max Depth: ${maxDepth}
Max Nodes: ${maxNodes}

Content:
${request.content}

${request.generationPrompt ? `Additional Instructions:\n${request.generationPrompt}\n` : ''}

Create a hierarchical mind map with the following structure:

Return ONLY a JSON object with this exact structure:
{
  "nodes": [
    {
      "id": "unique_node_id",
      "label": "Node Label",
      "content": "Detailed description (optional)",
      "type": "topic|subtopic|detail|note|reference",
      "level": 0,
      "parent": "parent_node_id_or_null",
      "style": {
        "shape": "rectangle|circle|diamond|rounded|cloud",
        "color": "#color",
        "backgroundColor": "#color",
        "textColor": "#color",
        "fontSize": 14,
        "fontWeight": "normal|bold|light"
      }
    }
  ],
  "connections": [
    {
      "source": "source_node_id",
      "target": "target_node_id",
      "label": "connection_label (optional)",
      "type": "default|arrow|dashed|thick|bidirectional"
    }
  ],
  "metadata": {
    "totalNodes": 0,
    "maxLevel": 0,
    "mainTopics": ["topic1", "topic2"],
    "summary": "Brief summary of the mind map"
  }
}

Guidelines:
1. Start with a central topic (level 0)
2. Create 3-7 main branches (level 1)
3. Add 2-5 sub-branches per main branch (level 2)
4. Optionally add details (level 3+)
5. Use meaningful labels and descriptions
6. Create logical connections between related topics
7. Keep it comprehensive but not overwhelming
8. Ensure all node IDs are unique
9. Each node should have a parent except the central topic
10. Use different node types appropriately
`;

  }

  /**
   * Process AI response into structured mind map data
   */
  private processMindMapData(data: any): MindMapStructure {
    // Validate and process nodes
    const nodes: MindMapNode[] = Array.isArray(data.nodes)
      ? data.nodes.map((node: any, index: number) => ({
          id: node.id || `node-${index}`,
          label: node.label || 'Untitled',
          content: node.content,
          type: this.validateNodeType(node.type),
          level: Math.max(0, node.level || 0),
          parent: node.parent,
          style: {
            shape: this.validateShape(node.style?.shape),
            color: node.style?.color,
            backgroundColor: node.style?.backgroundColor,
            textColor: node.style?.textColor,
            fontSize: node.style?.fontSize || 14,
            fontWeight: this.validateFontWeight(node.style?.fontWeight),
          },
        }))
      : [];

    // Process connections
    const connections: MindMapConnection[] = Array.isArray(data.connections)
      ? data.connections
          .filter((conn: any) => conn.source && conn.target)
          .map((conn: any) => ({
            source: conn.source,
            target: conn.target,
            label: conn.label,
            type: this.validateConnectionType(conn.type),
          }))
      : [];

    return { nodes, connections };
  }

  /**
   * Calculate node positions based on layout type
   */
  private calculateNodePositions(
    structure: MindMapStructure,
    layoutType: string
  ): MindMapStructure {
    const nodes = [...structure.nodes];

    if (layoutType === 'radial' || layoutType === 'mind_map') {
      // Radial layout - central node with branches around it
      const centerX = 400;
      const centerY = 300;
      const radius = 150;

      const level1Nodes = nodes.filter((n) => n.level === 1);
      const level2Nodes = nodes.filter((n) => n.level === 2);

      // Position level 0 (center)
      const centerNode = nodes.find((n) => n.level === 0);
      if (centerNode) {
        centerNode.position = { x: centerX, y: centerY };
      }

      // Position level 1 nodes in a circle
      level1Nodes.forEach((node, index) => {
        const angle = (2 * Math.PI * index) / level1Nodes.length;
        node.position = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        };
      });

      // Position level 2 nodes around their parents
      level2Nodes.forEach((node) => {
        const parent = nodes.find((n) => n.id === node.parent);
        if (parent && parent.position) {
          const angle = Math.atan2(
            parent.position.y - centerY,
            parent.position.x - centerX
          );
          const childRadius = 80;
          node.position = {
            x: parent.position.x + childRadius * Math.cos(angle),
            y: parent.position.y + childRadius * Math.sin(angle),
          };
        }
      });
    } else if (layoutType === 'hierarchical' || layoutType === 'tree') {
      // Hierarchical layout - vertical tree structure
      const nodeMap: { [level: number]: MindMapNode[] } = {};
      nodes.forEach((node) => {
        if (!nodeMap[node.level]) {
          nodeMap[node.level] = [];
        }
        nodeMap[node.level].push(node);
      });

      const levelHeight = 120;
      const nodeWidth = 180;
      const startX = 50;
      const startY = 50;

      Object.keys(nodeMap).forEach((levelStr) => {
        const level = parseInt(levelStr);
        const levelNodes = nodeMap[level];
        const totalWidth = levelNodes.length * nodeWidth;

        levelNodes.forEach((node, index) => {
          node.position = {
            x: startX + index * nodeWidth,
            y: startY + level * levelHeight,
          };
        });
      });
    } else if (layoutType === 'flowchart') {
      // Flowchart layout - left to right flow
      const nodeMap: { [level: number]: MindMapNode[] } = {};
      nodes.forEach((node) => {
        if (!nodeMap[node.level]) {
          nodeMap[node.level] = [];
        }
        nodeMap[node.level].push(node);
      });

      const levelWidth = 200;
      const nodeHeight = 80;
      const startX = 50;
      const startY = 50;

      Object.keys(nodeMap).forEach((levelStr) => {
        const level = parseInt(levelStr);
        const levelNodes = nodeMap[level];
        const totalHeight = levelNodes.length * nodeHeight;

        levelNodes.forEach((node, index) => {
          node.position = {
            x: startX + level * levelWidth,
            y: startY + index * nodeHeight,
          };
        });
      });
    }

    return { nodes, connections: structure.connections };
  }

  /**
   * Assign unique IDs to all nodes
   */
  private assignNodeIds(structure: MindMapStructure): MindMapStructure {
    const nodes = structure.nodes.map((node, index) => ({
      ...node,
      id: node.id || `node-${index}`,
    }));

    return { nodes, connections: structure.connections };
  }

  /**
   * Validate node type
   */
  private validateNodeType(type: string): MindMapNode['type'] {
    const validTypes: MindMapNode['type'][] = [
      'topic',
      'subtopic',
      'detail',
      'note',
      'reference',
    ];
    return validTypes.includes(type as MindMapNode['type'])
      ? (type as MindMapNode['type'])
      : 'topic';
  }

  /**
   * Validate node shape
   */
  private validateShape(shape: string): MindMapNode['style']['shape'] {
    const validShapes: MindMapNode['style']['shape'][] = [
      'rectangle',
      'circle',
      'diamond',
      'rounded',
      'cloud',
    ];
    return validShapes.includes(shape as MindMapNode['style']['shape'])
      ? (shape as MindMapNode['style']['shape'])
      : 'rectangle';
  }

  /**
   * Validate font weight
   */
  private validateFontWeight(
    weight: string
  ): MindMapNode['style']['fontWeight'] {
    const validWeights: MindMapNode['style']['fontWeight'][] = [
      'normal',
      'bold',
      'light',
    ];
    return validWeights.includes(weight as MindMapNode['style']['fontWeight'])
      ? (weight as MindMapNode['style']['fontWeight'])
      : 'normal';
  }

  /**
   * Validate connection type
   */
  private validateConnectionType(
    type: string
  ): MindMapConnection['type'] {
    const validTypes: MindMapConnection['type'][] = [
      'default',
      'arrow',
      'dashed',
      'thick',
      'bidirectional',
    ];
    return validTypes.includes(type as MindMapConnection['type'])
      ? (type as MindMapConnection['type'])
      : 'default';
  }

  /**
   * Regenerate mind map with different layout
   */
  async regenerateLayout(
    mindMapId: string,
    structure: MindMapStructure,
    layoutType: string
  ): Promise<MindMapStructure> {
    return this.calculateNodePositions(structure, layoutType);
  }

  /**
   * Extract topics from content for mind map generation
   */
  async extractTopics(content: string): Promise<string[]> {
    try {
      const prompt = `
Extract the main topics and concepts from the following content.
Return a JSON array of topic strings.

Content:
${content}

Return format: ["topic1", "topic2", "topic3"]
`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Extract main topics from educational content.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
      });

      const response = completion.choices[0].message.content;
      if (!response) return [];

      const topics = JSON.parse(response);
      return Array.isArray(topics) ? topics : [];
    } catch (error) {
      console.error('Error extracting topics:', error);
      return [];
    }
  }

  /**
   * Enhance existing mind map with AI
   */
  async enhanceMindMap(
    structure: MindMapStructure,
    additionalContent?: string
  ): Promise<MindMapStructure> {
    try {
      const prompt = `
Enhance this mind map structure by adding relevant details and connections.

Current Structure:
${JSON.stringify(structure, null, 2)}

${additionalContent ? `Additional Content:\n${additionalContent}\n` : ''}

Return an enhanced mind map with the same structure, adding:
1. More detailed information to existing nodes
2. Additional subtopics where appropriate
3. Cross-connections between related concepts
4. Additional notes and references

Return ONLY the enhanced structure in the same JSON format.
`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at enhancing mind maps with educational content.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const response = completion.choices[0].message.content;
      if (!response) throw new Error('No response from AI');

      const enhancedData = JSON.parse(response);
      return this.processMindMapData(enhancedData);
    } catch (error: any) {
      console.error('Error enhancing mind map:', error);
      return structure; // Return original if enhancement fails
    }
  }

  /**
   * Get color scheme for theme
   */
  getColorScheme(theme: string): { [key: string]: string } {
    const schemes: { [key: string]: { [key: string]: string } } = {
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

    return schemes[theme] || schemes.default;
  }

  /**
   * Convert mind map to different export formats
   */
  exportToJSON(structure: MindMapStructure): string {
    return JSON.stringify(structure, null, 2);
  }

  exportToMarkdown(title: string, structure: MindMapStructure): string {
    let markdown = `# ${title}\n\n`;

    // Group nodes by level
    const nodesByLevel: { [level: number]: MindMapNode[] } = {};
    structure.nodes.forEach((node) => {
      if (!nodesByLevel[node.level]) {
        nodesByLevel[node.level] = [];
      }
      nodesByLevel[node.level].push(node);
    });

    // Generate markdown hierarchy
    const generateMarkdown = (nodes: MindMapNode[], level: number) => {
      nodes.forEach((node) => {
        const indent = '  '.repeat(level);
        markdown += `${indent}- **${node.label}**`;
        if (node.content) {
          markdown += `: ${node.content}`;
        }
        markdown += '\n';

        // Add children
        const children = structure.nodes.filter((n) => n.parent === node.id);
        if (children.length > 0) {
          generateMarkdown(children, level + 1);
        }
      });
    };

    const rootNodes = nodesByLevel[0] || [];
    generateMarkdown(rootNodes, 0);

    return markdown;
  }

  /**
   * Analyze mind map for insights
   */
  analyzeMindMap(structure: MindMapStructure): {
    nodeCount: number;
    connectionCount: number;
    maxLevel: number;
    density: number;
    mainTopics: string[];
    complexity: 'low' | 'medium' | 'high';
  } {
    const nodeCount = structure.nodes.length;
    const connectionCount = structure.connections.length;
    const maxLevel = Math.max(...structure.nodes.map((n) => n.level), 0);
    const density =
      nodeCount > 0 ? (connectionCount / (nodeCount * (nodeCount - 1))) * 2 : 0;
    const mainTopics = structure.nodes
      .filter((n) => n.level === 1)
      .map((n) => n.label);

    let complexity: 'low' | 'medium' | 'high';
    if (nodeCount < 15 || maxLevel < 2) {
      complexity = 'low';
    } else if (nodeCount < 40 || maxLevel < 4) {
      complexity = 'medium';
    } else {
      complexity = 'high';
    }

    return {
      nodeCount,
      connectionCount,
      maxLevel,
      density: Math.round(density * 100) / 100,
      mainTopics,
      complexity,
    };
  }
}

export default new AIMindMapService();
