import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Video,
  FileText,
  Brain,
  CheckCircle,
  Circle,
  Clock,
  TrendingUp,
  Target,
  ArrowRight,
  Play,
  Pause,
} from 'lucide-react';

interface PathNode {
  id: string;
  title: string;
  description: string;
  content_type: 'lesson' | 'quiz' | 'video' | 'reading' | 'practice';
  node_order: number;
  difficulty_level: number;
  estimated_duration: number;
  status: 'locked' | 'available' | 'in_progress' | 'completed' | 'skipped';
  prerequisites: string[];
  resources: any;
  metadata: any;
  is_optional: boolean;
  completed_at?: string;
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  difficulty_level: number;
  status: 'active' | 'completed' | 'paused';
  progress_percentage: number;
  total_nodes: number;
  completed_nodes: number;
  target_completion_date?: string;
  created_at: string;
  path_nodes: PathNode[];
  subject: {
    id: string;
    name: string;
  };
}

interface LearningPathViewProps {
  path: LearningPath;
  onNodeClick?: (node: PathNode) => void;
  onStartPath?: () => void;
  onUpdateProgress?: (nodeId: string, status: 'in_progress' | 'completed') => void;
}

const iconMap = {
  lesson: BookOpen,
  quiz: Brain,
  video: Video,
  reading: FileText,
  practice: Target,
};

const difficultyColors: Record<number, string> = {
  1: 'bg-green-100 text-green-800 border-green-300',
  2: 'bg-blue-100 text-blue-800 border-blue-300',
  3: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  4: 'bg-orange-100 text-orange-800 border-orange-300',
  5: 'bg-red-100 text-red-800 border-red-300',
};

const difficultyLabels: Record<number, string> = {
  1: 'Beginner',
  2: 'Easy',
  3: 'Medium',
  4: 'Hard',
  5: 'Expert',
};

export default function LearningPathView({
  path,
  onNodeClick,
  onStartPath,
  onUpdateProgress,
}: LearningPathViewProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const handleNodeClick = (node: PathNode) => {
    if (node.status === 'locked') return;

    setSelectedNode(node.id);
    onNodeClick?.(node);
  };

  const getNodeIcon = (contentType: PathNode['content_type']) => {
    const Icon = iconMap[contentType];
    return <Icon className="w-5 h-5" />;
  };

  const getNodeStatusColor = (status: PathNode['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 border-green-600';
      case 'in_progress':
        return 'bg-blue-500 border-blue-600';
      case 'available':
        return 'bg-gray-200 border-gray-300 hover:bg-gray-300';
      case 'locked':
        return 'bg-gray-100 border-gray-200 opacity-50';
      case 'skipped':
        return 'bg-gray-300 border-gray-400';
      default:
        return 'bg-gray-200 border-gray-300';
    }
  };

  const getNodeStatusIcon = (status: PathNode['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-white" />;
      case 'in_progress':
        return <Play className="w-5 h-5 text-white" />;
      case 'available':
        return <Circle className="w-6 h-6 text-gray-600" />;
      case 'locked':
        return <Circle className="w-6 h-6 text-gray-400" />;
      default:
        return <Circle className="w-6 h-6 text-gray-500" />;
    }
  };

  const handleStartNode = (nodeId: string) => {
    onUpdateProgress?.(nodeId, 'in_progress');
  };

  const handleCompleteNode = (nodeId: string) => {
    onUpdateProgress?.(nodeId, 'completed');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{path.title}</CardTitle>
              <p className="text-gray-600">{path.description}</p>
              <div className="flex items-center gap-3 mt-3">
                <Badge variant="outline" className={difficultyColors[path.difficulty_level]}>
                  {difficultyLabels[path.difficulty_level]}
                </Badge>
                <Badge variant="secondary">
                  {path.subject.name}
                </Badge>
                {path.target_completion_date && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Target: {new Date(path.target_completion_date).toLocaleDateString()}
                  </Badge>
                )}
              </div>
            </div>
            {path.status === 'active' && path.progress_percentage === 0 && onStartPath && (
              <Button onClick={onStartPath} size="lg" className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Start Path
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="text-gray-600">
                {path.completed_nodes}/{path.total_nodes} nodes completed
              </span>
            </div>
            <Progress value={path.progress_percentage} className="h-2" />
            <div className="text-right text-sm text-gray-600">
              {Math.round(path.progress_percentage)}% complete
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Path Roadmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Learning Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Nodes */}
            <div className="space-y-8">
              {path.path_nodes.map((node, index) => {
                const isClickable = node.status !== 'locked';
                const isHovered = hoveredNode === node.id;
                const isSelected = selectedNode === node.id;

                return (
                  <div
                    key={node.id}
                    className="relative flex items-start gap-6"
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Timeline dot */}
                    <div className="relative z-10">
                      <div
                        className={`
                          w-12 h-12 rounded-full border-2 flex items-center justify-center
                          transition-all duration-200 cursor-pointer
                          ${getNodeStatusColor(node.status)}
                          ${isClickable ? 'hover:scale-110' : ''}
                          ${isSelected ? 'ring-4 ring-blue-300' : ''}
                        `}
                        onClick={() => handleNodeClick(node)}
                      >
                        {getNodeStatusIcon(node.status)}
                      </div>
                      {index < path.path_nodes.length - 1 && (
                        <div
                          className={`
                            absolute top-12 left-1/2 transform -translate-x-1/2 w-0.5 h-8
                            ${node.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'}
                          `}
                        />
                      )}
                    </div>

                    {/* Node content */}
                    <Card
                      className={`
                        flex-1 transition-all duration-200
                        ${isClickable ? 'cursor-pointer hover:shadow-md' : 'opacity-60'}
                        ${isSelected ? 'ring-2 ring-blue-500' : ''}
                        ${isHovered && isClickable ? 'translate-x-1' : ''}
                      `}
                      onClick={() => handleNodeClick(node)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              {getNodeIcon(node.content_type)}
                              <h3 className="font-semibold text-lg">{node.title}</h3>
                              {node.is_optional && (
                                <Badge variant="outline" className="text-xs">
                                  Optional
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm">{node.description}</p>

                            <div className="flex items-center gap-3 mt-3">
                              <Badge variant="outline" className={difficultyColors[node.difficulty_level]}>
                                {difficultyLabels[node.difficulty_level]}
                              </Badge>
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {node.estimated_duration} min
                              </Badge>
                            </div>

                            {node.prerequisites.length > 0 && (
                              <div className="mt-2 text-xs text-gray-500">
                                Prerequisites: {node.prerequisites.join(', ')}
                              </div>
                            )}
                          </div>

                          {/* Node actions */}
                          <div className="flex flex-col gap-2">
                            {node.status === 'available' && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartNode(node.id);
                                }}
                                className="flex items-center gap-1"
                              >
                                <Play className="w-3 h-3" />
                                Start
                              </Button>
                            )}
                            {node.status === 'in_progress' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCompleteNode(node.id);
                                }}
                                className="flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Node Details */}
      {selectedNode && (
        <Card>
          <CardHeader>
            <CardTitle>Node Details</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const node = path.path_nodes.find(n => n.id === selectedNode);
              if (!node) return null;

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {getNodeIcon(node.content_type)}
                    <h3 className="font-semibold text-xl">{node.title}</h3>
                  </div>

                  <p className="text-gray-600">{node.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                    <div>
                      <div className="text-sm text-gray-500">Content Type</div>
                      <div className="font-medium capitalize">{node.content_type}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Difficulty</div>
                      <div className="font-medium">{difficultyLabels[node.difficulty_level]}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Duration</div>
                      <div className="font-medium">{node.estimated_duration} minutes</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Status</div>
                      <div className="font-medium capitalize">{node.status.replace('_', ' ')}</div>
                    </div>
                  </div>

                  {node.resources && Object.keys(node.resources).length > 0 && (
                    <div>
                      <div className="text-sm text-gray-500 mb-2">Resources</div>
                      <div className="space-y-1">
                        {Object.entries(node.resources).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="font-medium capitalize">{key}:</span>{' '}
                            <span className="text-gray-600">
                              {Array.isArray(value) ? value.join(', ') : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Completed</div>
                <div className="text-2xl font-bold">{path.completed_nodes}</div>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Remaining</div>
                <div className="text-2xl font-bold">{path.total_nodes - path.completed_nodes}</div>
              </div>
              <Circle className="w-10 h-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Progress</div>
                <div className="text-2xl font-bold">{Math.round(path.progress_percentage)}%</div>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
