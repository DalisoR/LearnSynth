export type VisualType = 'diagram' | 'chart' | 'infographic' | 'illustration' | 'flowchart' | 'mindmap' | 'comparison';

export type VisualComplexity = 'simple' | 'moderate' | 'complex';

export interface VisualPrompt {
  id?: string;
  type: VisualType;
  description: string;
  data?: any;
  complexity: VisualComplexity;
  purpose: string;
  keywords: string[];
  style?: VisualStyle;
}

export interface VisualStyle {
  theme: 'modern' | 'classic' | 'minimal' | 'academic' | 'colorful';
  colors?: string[];
  fontSize?: 'small' | 'medium' | 'large';
  orientation?: 'portrait' | 'landscape' | 'square';
}

export interface GeneratedVisual {
  id: string;
  promptId: string;
  type: VisualType;
  url: string;
  altText: string;
  caption: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
  qualityScore?: number;
  createdAt: Date;
}

export interface DiagramData {
  nodes?: DiagramNode[];
  edges?: DiagramEdge[];
  labels?: { [key: string]: string };
  layout?: 'hierarchical' | 'force-directed' | 'circular' | 'tree';
}

export interface DiagramNode {
  id: string;
  label: string;
  type?: 'start' | 'end' | 'process' | 'decision' | 'data';
  color?: string;
  position?: { x: number; y: number };
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  type?: 'arrow' | 'line' | 'dashed';
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'histogram';
  title: string;
  data: {
    labels: string[];
    datasets: {
      label: string;
      values: number[];
      color?: string;
    }[];
  };
}

export interface MindMapData {
  centralTopic: string;
  branches: {
    topic: string;
    subtopics: string[];
    color?: string;
  }[];
}
