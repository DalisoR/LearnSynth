import { supabase } from '@/lib/supabase';
import knowledgeGapAnalysisService from './knowledgeGapAnalysisService';
import logger from '@/utils/logger';
import config from '@/config/config';
import { createLLMService } from './llm/factory';

interface LearningPath {
  id?: string;
  user_id: string;
  subject_id: string;
  title: string;
  description: string;
  difficulty_level: number;
  target_completion_date?: string;
}

interface PathNode {
  id?: string;
  path_id: string;
  title: string;
  description: string;
  content_type: 'lesson' | 'quiz' | 'video' | 'reading' | 'practice';
  node_order: number;
  difficulty_level: number;
  estimated_duration: number;
  prerequisites: string[];
  resources: any;
  metadata: any;
  is_optional: boolean;
}

class LearningPathRecommendationService {
  private llmService: any;

  constructor() {
    this.llmService = createLLMService();
  }

  /**
   * Generate a personalized learning path based on user's knowledge gaps and performance
   */
  async generateLearningPath(
    userId: string,
    subjectId: string,
    options: {
      title?: string;
      description?: string;
      target_completion_date?: string;
      preferred_difficulty?: number;
    } = {}
  ): Promise<LearningPath> {
    try {
      logger.info('Generating learning path', { userId, subjectId });

      // Fetch user's knowledge gaps for this subject
      const gaps = await knowledgeGapAnalysisService.getKnowledgeGaps(userId, subjectId);

      // Fetch user's learning patterns
      const patterns = await knowledgeGapAnalysisService.analyzeLearningPatterns(userId, subjectId);

      // Fetch user's learning analytics
      const { data: analytics } = await supabase
        .from('user_learning_analytics')
        .select('*')
        .eq('user_id', userId)
        .eq('subject_id', subjectId)
        .order('date', { ascending: false })
        .limit(30);

      // Fetch subject details
      const { data: subject } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .single();

      if (!subject) {
        throw new Error('Subject not found');
      }

      // Generate path using AI
      const path = await this.generatePathWithAI(
        userId,
        subject,
        gaps,
        patterns,
        analytics || [],
        options
      );

      // Store path in database
      const { data: createdPath, error } = await supabase
        .from('learning_paths')
        .insert({
          user_id: userId,
          subject_id: subjectId,
          title: path.title,
          description: path.description,
          difficulty_level: path.difficulty_level,
          target_completion_date: path.target_completion_date,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      // Generate nodes for the path
      const nodes = await this.generatePathNodes(
        createdPath.id,
        userId,
        subject,
        gaps,
        patterns,
        analytics || []
      );

      // Store nodes
      const { data: createdNodes, error: nodesError } = await supabase
        .from('path_nodes')
        .insert(nodes)
        .select();

      if (nodesError) throw nodesError;

      // Update path with node count
      await supabase
        .from('learning_paths')
        .update({
          total_nodes: createdNodes.length,
          current_node_id: createdNodes[0]?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', createdPath.id);

      logger.info('Learning path generated successfully', {
        pathId: createdPath.id,
        nodeCount: createdNodes.length,
      });

      return createdPath;
    } catch (error) {
      logger.error('Error generating learning path', { error, userId, subjectId });
      throw error;
    }
  }

  /**
   * Generate learning path using AI (LLM)
   */
  private async generatePathWithAI(
    userId: string,
    subject: any,
    gaps: any[],
    patterns: any[],
    analytics: any[],
    options: any
  ): Promise<any> {
    try {
      // Prepare context for AI
      const context = this.buildPathGenerationContext(subject, gaps, patterns, analytics, options);

      // Generate path structure using LLM
      const response = await this.llmService.generate(
        `You are an expert educational strategist. Create a personalized learning path.

CONTEXT:
${context}

TASK:
Generate a comprehensive learning path with the following JSON structure:
{
  "title": "Descriptive title for the path",
  "description": "2-3 sentence overview of what the learner will achieve",
  "difficulty_level": number between 1-5 (1=beginner, 5=advanced),
  "target_completion_date": "YYYY-MM-DD" (optional, based on user's goal),
  "estimated_hours": total estimated hours,
  "key_objectives": [
    "3-5 main learning objectives"
  ],
  "node_structure": [
    {
      "order": number (1, 2, 3...),
      "title": "Node title",
      "description": "What will be covered",
      "content_type": "lesson|quiz|video|reading|practice",
      "difficulty": number 1-5,
      "duration_minutes": estimated minutes,
      "dependencies": ["titles of prerequisite nodes"],
      "is_optional": false
    }
  ],
  "recommendation_reasoning": "Why this path is optimal for this learner"
}

Make the path progressive: start with fundamentals, address critical knowledge gaps first, then build advanced skills.`,
        {
          temperature: 0.7,
          maxTokens: 2000,
        }
      );

      const parsed = this.parseLLMResponse(response);

      return {
        title: parsed.title,
        description: parsed.description,
        difficulty_level: parsed.difficulty_level,
        target_completion_date: parsed.target_completion_date,
      };
    } catch (error) {
      logger.error('Error generating path with AI', { error });
      // Fallback to rule-based generation
      return this.generateRuleBasedPath(subject, gaps, patterns, analytics, options);
    }
  }

  /**
   * Generate path nodes for a learning path
   */
  private async generatePathNodes(
    pathId: string,
    userId: string,
    subject: any,
    gaps: any[],
    patterns: any[],
    analytics: any[]
  ): Promise<PathNode[]> {
    try {
      // Generate nodes using AI
      const context = this.buildNodesGenerationContext(subject, gaps, patterns, analytics);

      const response = await this.llmService.generate(
        `Generate detailed learning path nodes based on this context:

${context}

Create nodes in this JSON format:
{
  "nodes": [
    {
      "order": 1,
      "title": "Node title",
      "description": "Detailed description of content",
      "content_type": "lesson|quiz|video|reading|practice",
      "difficulty": 1-5,
      "duration_minutes": estimated time,
      "dependencies": ["prerequisite node titles"],
      "resources": {
        "documents": ["document names/IDs if available"],
        "videos": ["video titles if available"],
        "links": ["external resource URLs"]
      },
      "metadata": {
        "quiz_id": "if content_type is quiz",
        "document_id": "if content_type is lesson/reading",
        "tags": ["tag1", "tag2"]
      },
      "is_optional": false
    }
  ]
}

Ensure nodes are ordered sequentially with clear prerequisites.`,
        {
          temperature: 0.7,
          maxTokens: 2500,
        }
      );

      const parsed = this.parseLLMResponse(response);

      // Process and validate nodes
      const nodes: PathNode[] = parsed.nodes.map((nodeData: any, index: number) => ({
        path_id: pathId,
        subject_id: subject.id,
        title: nodeData.title,
        description: nodeData.description,
        content_type: nodeData.content_type,
        node_order: nodeData.order || index + 1,
        difficulty_level: nodeData.difficulty || 3,
        estimated_duration: nodeData.duration_minutes || 30,
        prerequisites: nodeData.dependencies || [],
        resources: nodeData.resources || {},
        metadata: nodeData.metadata || {},
        is_optional: nodeData.is_optional || false,
      }));

      return nodes;
    } catch (error) {
      logger.error('Error generating path nodes with AI', { error });
      // Fallback to rule-based nodes
      return this.generateRuleBasedNodes(pathId, subject, gaps);
    }
  }

  /**
   * Build context for path generation
   */
  private buildPathGenerationContext(
    subject: any,
    gaps: any[],
    patterns: any[],
    analytics: any[],
    options: any
  ): string {
    const context = `
SUBJECT: ${subject.name}
DESCRIPTION: ${subject.description || 'N/A'}

KNOWLEDGE GAPS (${gaps.length} identified):
${gaps.map(g => `- ${g.topic} (Severity: ${g.severity}, Score: ${g.gap_score})`).join('\n')}

LEARNING PATTERNS:
${patterns.map(p => `- ${p.topic}: ${p.performance_trend} (${p.accuracy_rate} accuracy)`).join('\n')}

LEARNING ANALYTICS (Last 30 days):
- Total study time: ${analytics.reduce((sum, a) => sum + (a.total_study_time || 0), 0)} minutes
- Quiz accuracy: ${analytics.reduce((sum, a) => sum + (a.quiz_accuracy || 0), 0) / (analytics.length || 1)}%
- Average daily score: ${analytics.reduce((sum, a) => sum + (a.daily_score || 0), 0) / (analytics.length || 1)}

USER OPTIONS:
- Preferred difficulty: ${options.preferred_difficulty || 'Not specified'}
- Target completion: ${options.target_completion_date || 'Flexible'}
`;

    return context;
  }

  /**
   * Build context for node generation
   */
  private buildNodesGenerationContext(
    subject: any,
    gaps: any[],
    patterns: any[],
    analytics: any[]
  ): string {
    const criticalGaps = gaps.filter(g => g.severity === 'critical' || g.severity === 'high');

    return `
Generate nodes for subject: ${subject.name}

CRITICAL GAPS TO ADDRESS FIRST:
${criticalGaps.map(g => `- ${g.topic}: ${g.severity} priority`).join('\n')}

Available content for this subject:
- Chapters: [Fetch from chapters table if available]
- Documents: [Fetch from documents table]
- Existing quizzes: [Fetch from quizzes table]

Structure the path as:
1. Foundation review (address critical gaps)
2. Core concept learning
3. Practice and reinforcement
4. Advanced applications
5. Assessment and review
`;
  }

  /**
   * Fallback: Generate rule-based path
   */
  private generateRuleBasedPath(subject: any, gaps: any[], patterns: any[], analytics: any[], options: any): any {
    const criticalGaps = gaps.filter(g => g.severity === 'critical').length;
    const avgAccuracy = analytics.length > 0
      ? analytics.reduce((sum, a) => sum + (a.quiz_accuracy || 0), 0) / analytics.length / 100
      : 0.7;

    let difficulty = 3; // Default medium
    if (avgAccuracy < 0.6) difficulty = 2;
    else if (avgAccuracy > 0.85) difficulty = 4;

    return {
      title: `Personalized ${subject.name} Learning Path`,
      description: `This path addresses your knowledge gaps and builds on your strengths in ${subject.name}. Estimated completion: 2-4 weeks.`,
      difficulty_level: difficulty,
      target_completion_date: options.target_completion_date,
    };
  }

  /**
   * Fallback: Generate rule-based nodes
   */
  private generateRuleBasedNodes(pathId: string, subject: any, gaps: any[]): PathNode[] {
    const nodes: PathNode[] = [];
    let order = 1;

    // Add nodes for critical gaps first
    gaps.filter(g => g.severity === 'critical').forEach(gap => {
      nodes.push({
        path_id: pathId,
        title: `Review: ${gap.topic}`,
        description: `Address knowledge gap in ${gap.topic}`,
        content_type: 'lesson',
        node_order: order++,
        difficulty_level: 2,
        estimated_duration: 45,
        prerequisites: [],
        resources: {},
        metadata: { topic: gap.topic },
        is_optional: false,
      });
    });

    // Add general nodes
    nodes.push(
      {
        path_id: pathId,
        title: 'Core Concepts',
        description: 'Learn fundamental concepts and principles',
        content_type: 'lesson',
        node_order: order++,
        difficulty_level: 3,
        estimated_duration: 60,
        prerequisites: [],
        resources: {},
        metadata: {},
        is_optional: false,
      },
      {
        path_id: pathId,
        title: 'Practice Quiz',
        description: 'Test your understanding',
        content_type: 'quiz',
        node_order: order++,
        difficulty_level: 3,
        estimated_duration: 30,
        prerequisites: [],
        resources: {},
        metadata: {},
        is_optional: false,
      }
    );

    return nodes;
  }

  /**
   * Parse LLM response to JSON
   */
  private parseLLMResponse(response: string): any {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      logger.error('Error parsing LLM response', { response, error });
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Get learning path for a user
   */
  async getLearningPaths(userId: string, subjectId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('learning_paths')
        .select(`
          *,
          path_nodes (*),
          subject:subjects (id, name, description)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching learning paths', { error, userId, subjectId });
      throw error;
    }
  }

  /**
   * Update learning path progress
   */
  async updatePathProgress(pathId: string, nodeId: string, status: 'in_progress' | 'completed'): Promise<void> {
    try {
      // Update node status
      const { error: nodeError } = await supabase
        .from('path_nodes')
        .update({
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', nodeId);

      if (nodeError) throw nodeError;

      // Get current path
      const { data: path } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('id', pathId)
        .single();

      if (!path) throw new Error('Path not found');

      // Get all nodes
      const { data: nodes } = await supabase
        .from('path_nodes')
        .select('*')
        .eq('path_id', pathId);

      const completedNodes = nodes?.filter(n => n.status === 'completed').length || 0;
      const totalNodes = nodes?.length || 0;
      const progress = totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0;

      // Update path progress
      const { error: pathError } = await supabase
        .from('learning_paths')
        .update({
          progress_percentage: progress,
          completed_nodes: completedNodes,
          current_node_id: status === 'completed'
            ? nodes?.[nodes.findIndex(n => n.id === nodeId) + 1]?.id
            : nodeId,
          status: completedNodes === totalNodes ? 'completed' : 'active',
          completed_at: completedNodes === totalNodes ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pathId);

      if (pathError) throw pathError;

      logger.info('Path progress updated', { pathId, nodeId, status, progress });
    } catch (error) {
      logger.error('Error updating path progress', { error, pathId, nodeId, status });
      throw error;
    }
  }

  /**
   * Get next recommended node for a path
   */
  async getNextRecommendedNode(pathId: string): Promise<any> {
    try {
      // Get path
      const { data: path } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('id', pathId)
        .single();

      if (!path) throw new Error('Path not found');

      // Get all nodes ordered by sequence
      const { data: nodes } = await supabase
        .from('path_nodes')
        .select('*')
        .eq('path_id', pathId)
        .order('node_order', { ascending: true });

      // Find first available node
      const nextNode = nodes?.find(node => {
        // Check if prerequisites are completed
        if (node.prerequisites && node.prerequisites.length > 0) {
          const completedPrereqs = nodes.filter(n =>
            node.prerequisites.includes(n.title) && n.status === 'completed'
          );
          return completedPrereqs.length === node.prerequisites.length && node.status !== 'completed';
        }
        return node.status !== 'completed';
      });

      return nextNode || null;
    } catch (error) {
      logger.error('Error getting next recommended node', { error, pathId });
      throw error;
    }
  }

  /**
   * Delete a learning path
   */
  async deleteLearningPath(pathId: string): Promise<void> {
    try {
      // Delete nodes first (cascade will handle this, but explicitly ensuring)
      await supabase
        .from('path_nodes')
        .delete()
        .eq('path_id', pathId);

      // Delete path
      const { error } = await supabase
        .from('learning_paths')
        .delete()
        .eq('id', pathId);

      if (error) throw error;

      logger.info('Learning path deleted', { pathId });
    } catch (error) {
      logger.error('Error deleting learning path', { error, pathId });
      throw error;
    }
  }
}

export default new LearningPathRecommendationService();
