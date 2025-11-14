import { DiagramData, DiagramNode, DiagramEdge, MindMapData, ChartData } from './types';
import { generateId } from './utils';

export class EducationalDiagramEngine {
  generateSVG(diagramData: DiagramData, options?: {
    width?: number;
    height?: number;
    theme?: string;
  }): string {
    const width = options?.width || 800;
    const height = options?.height || 600;
    const theme = options?.theme || 'default';

    // Simple layout algorithm for nodes
    const positionedNodes = this.calculateNodePositions(diagramData, width, height);

    // Generate SVG
    let svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .node-label { font-family: Arial, sans-serif; font-size: 14px; fill: #333; }
            .node { fill: #3b82f6; stroke: #1e40af; stroke-width: 2; }
            .edge { stroke: #64748b; stroke-width: 2; fill: none; }
            .edge-label { font-family: Arial, sans-serif; font-size: 12px; fill: #64748b; }
          </style>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
        </defs>
    `;

    // Draw edges
    if (diagramData.edges) {
      diagramData.edges.forEach(edge => {
        const fromNode = positionedNodes.find(n => n.id === edge.from);
        const toNode = positionedNodes.find(n => n.id === edge.to);

        if (fromNode && toNode) {
          svg += `
            <path d="M ${fromNode.position?.x} ${fromNode.position?.y}
                     L ${toNode.position?.x} ${toNode.position?.y}"
                  class="edge"
                  marker-end="url(#arrowhead)" />
          `;

          if (edge.label) {
            const midX = (fromNode.position!.x + toNode.position!.x) / 2;
            const midY = (fromNode.position!.y + toNode.position!.y) / 2;
            svg += `
              <text x="${midX}" y="${midY}" class="edge-label" text-anchor="middle">
                ${edge.label}
              </text>
            `;
          }
        }
      });
    }

    // Draw nodes
    positionedNodes.forEach(node => {
      const radius = 30;
      svg += `
        <circle cx="${node.position?.x}" cy="${node.position?.y}" r="${radius}" class="node" />
        <text x="${node.position?.x}" y="${node.position?.y + 5}"
              class="node-label" text-anchor="middle">
          ${node.label}
        </text>
      `;
    });

    svg += '</svg>';
    return svg;
  }

  generateFlowchartSVG(flowData: {
    steps: { id: string; label: string; type?: 'start' | 'end' | 'process' | 'decision' }[];
    connections: { from: string; to: string; label?: string }[];
  }, options?: { width?: number; height?: number }): string {
    const width = options?.width || 800;
    const height = options?.height || 600;
    const stepHeight = 80;
    const stepWidth = 150;

    let svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .step-label { font-family: Arial, sans-serif; font-size: 14px; fill: #fff; text-anchor: middle; }
            .connection { stroke: #3b82f6; stroke-width: 2; fill: none; marker-end: url(#arrow); }
          </style>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
          </marker>
        </defs>
    `;

    const positions = new Map<string, { x: number; y: number }>();

    // Position steps vertically
    flowData.steps.forEach((step, index) => {
      const x = width / 2;
      const y = 50 + index * (stepHeight + 40);
      positions.set(step.id, { x, y });
    });

    // Draw connections
    flowData.connections.forEach(conn => {
      const from = positions.get(conn.from);
      const to = positions.get(conn.to);

      if (from && to) {
        svg += `
          <path d="M ${from.x} ${from.y + stepHeight / 2}
                   L ${to.x} ${to.y - stepHeight / 2}"
                class="connection" />
        `;
      }
    });

    // Draw steps
    flowData.steps.forEach(step => {
      const pos = positions.get(step.id)!;
      const shape = this.getStepShape(step.type || 'process');
      svg += `
        ${shape}
        <text x="${pos.x}" y="${pos.y + stepHeight / 2 + 5}" class="step-label">
          ${step.label}
        </text>
      `;
    });

    svg += '</svg>';
    return svg;
  }

  generateMindMapSVG(mindMap: MindMapData, options?: {
    width?: number;
    height?: number;
  }): string {
    const width = options?.width || 1000;
    const height = options?.height || 700;
    const centerX = width / 2;
    const centerY = height / 2;

    let svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .central-node { fill: #3b82f6; stroke: #1e40af; stroke-width: 3; }
            .central-label { font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; fill: #fff; text-anchor: middle; }
            .branch-node { fill: #8b5cf6; stroke: #6d28d9; stroke-width: 2; }
            .branch-label { font-family: Arial, sans-serif; font-size: 13px; fill: #333; text-anchor: middle; }
            .connection { stroke: #94a3b8; stroke-width: 2; }
          </style>
        </defs>
    `;

    const branchRadius = 200;
    const nodeRadius = 50;

    // Draw central node
    svg += `
      <circle cx="${centerX}" cy="${centerY}" r="${nodeRadius + 20}" class="central-node" />
      <text x="${centerX}" y="${centerY + 5}" class="central-label">
        ${mindMap.centralTopic}
      </text>
    `;

    // Position branches in circle
    const angleStep = (2 * Math.PI) / mindMap.branches.length;

    mindMap.branches.forEach((branch, index) => {
      const angle = index * angleStep;
      const x = centerX + branchRadius * Math.cos(angle);
      const y = centerY + branchRadius * Math.sin(angle);

      // Draw connection
      svg += `
        <line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" class="connection" />
      `;

      // Draw branch node
      svg += `
        <circle cx="${x}" cy="${y}" r="${nodeRadius}" class="branch-node" />
        <text x="${x}" y="${y + 4}" class="branch-label">
          ${branch.topic}
        </text>
      `;
    });

    svg += '</svg>';
    return svg;
  }

  generateComparisonChartSVG(comparisonData: {
    items: { label: string; value1: number; value2: number; label1: string; label2: string }[];
  }): string {
    const width = 800;
    const height = 500;
    const barHeight = 30;
    const barSpacing = 40;
    const maxValue = Math.max(...comparisonData.items.map(i => Math.max(i.value1, i.value2)));

    let svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .label { font-family: Arial, sans-serif; font-size: 12px; fill: #333; }
            .bar-label { font-family: Arial, sans-serif; font-size: 11px; fill: #fff; }
          </style>
        </defs>
    `;

    comparisonData.items.forEach((item, index) => {
      const y = 50 + index * barSpacing;
      const scale = (width - 300) / maxValue;

      const value1Width = item.value1 * scale;
      const value2Width = item.value2 * scale;

      // Label
      svg += `<text x="10" y="${y + 15}" class="label">${item.label}</text>`;

      // Bar 1
      svg += `
        <rect x="200" y="${y}" width="${value1Width}" height="${barHeight}" fill="#3b82f6" />
        <text x="200 + ${value1Width / 2}" y="${y + 18}" class="bar-label" text-anchor="middle">
          ${item.value1}
        </text>
      `;

      // Bar 2
      svg += `
        <rect x="200" y="${y + barHeight + 5}" width="${value2Width}" height="${barHeight}" fill="#8b5cf6" />
        <text x="200 + ${value2Width / 2}" y="${y + barHeight + 5 + 18}" class="bar-label" text-anchor="middle">
          ${item.value2}
        </text>
      `;
    });

    svg += '</svg>';
    return svg;
  }

  private calculateNodePositions(
    diagramData: DiagramData,
    width: number,
    height: number
  ): DiagramNode[] {
    if (!diagramData.nodes) return [];

    const nodes = [...diagramData.nodes];

    // Simple grid layout if no positions specified
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const cellWidth = width / cols;
    const cellHeight = height / Math.ceil(nodes.length / cols);

    nodes.forEach((node, index) => {
      if (!node.position) {
        const col = index % cols;
        const row = Math.floor(index / cols);
        node.position = {
          x: cellWidth * (col + 0.5),
          y: cellHeight * (row + 0.5)
        };
      }
    });

    return nodes;
  }

  private getStepShape(type: string): string {
    switch (type) {
      case 'start':
      case 'end':
        return `<ellipse cx="0" cy="0" rx="75" ry="35" fill="#10b981" stroke="#059669" stroke-width="2" />`;
      case 'decision':
        return `<polygon points="0,-40 40,0 0,40 -40,0" fill="#f59e0b" stroke="#d97706" stroke-width="2" />`;
      default:
        return `<rect x="-75" y="-35" width="150" height="70" fill="#3b82f6" stroke="#1e40af" stroke-width="2" rx="5" />`;
    }
  }

  generateInteractiveDiagram(data: any): string {
    // Return HTML with JavaScript for interactive features
    return `
      <div class="interactive-diagram">
        <p>Interactive diagram would be rendered here</p>
        <script>
          // Interactive features: zoom, pan, click for details
        </script>
      </div>
    `;
  }
}

export const diagramEngine = new EducationalDiagramEngine();
