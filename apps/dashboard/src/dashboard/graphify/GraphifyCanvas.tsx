'use client';

import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import type {
  GraphifyNode,
  GraphifyEdge,
  GraphLayoutType,
  GraphifySelection,
  GraphNodeType,
  GraphEdgeType,
} from './types';
import { getNodeColor, getEdgeColor, getNodeRadius } from './colors';

interface GraphifyCanvasProps {
  readonly nodes: readonly GraphifyNode[];
  readonly edges: readonly GraphifyEdge[];
  readonly layout: GraphLayoutType;
  readonly selection: GraphifySelection;
  readonly filterNodeTypes: ReadonlySet<GraphNodeType>;
  readonly filterEdgeTypes: ReadonlySet<GraphEdgeType>;
  readonly onNodeClick: (nodeId: string) => void;
  readonly onEdgeClick: (edgeId: string) => void;
  readonly onNodeHover: (nodeId: string | null) => void;
  readonly onBackgroundClick: () => void;
}

interface CanvasNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: GraphNodeType;
  label: string;
  radius: number;
}

interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  weight: number;
}

export function GraphifyCanvas({
  nodes,
  edges,
  layout,
  selection,
  filterNodeTypes,
  filterEdgeTypes,
  onNodeClick,
  onEdgeClick: _onEdgeClick,
  onNodeHover,
  onBackgroundClick,
}: GraphifyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const animFrameRef = useRef<number>(0);
  const nodesRef = useRef<CanvasNode[]>([]);
  const edgesRef = useRef<CanvasEdge[]>([]);
  const layoutPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width: Math.floor(width), height: Math.floor(height) });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const filteredNodes = useMemo(() => {
    if (filterNodeTypes.size === 0) return nodes;
    return nodes.filter((n) => filterNodeTypes.has(n.type));
  }, [nodes, filterNodeTypes]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    if (filterEdgeTypes.size === 0) {
      return edges.filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId));
    }
    return edges.filter(
      (e) => filterEdgeTypes.has(e.type) && nodeIds.has(e.sourceId) && nodeIds.has(e.targetId),
    );
  }, [edges, filteredNodes, filterEdgeTypes]);

  useEffect(() => {
    const positionMap = new Map<string, { x: number; y: number }>();
    for (const node of filteredNodes) {
      if (node.x !== undefined && node.y !== undefined) {
        positionMap.set(node.id, { x: node.x, y: node.y });
      }
    }
    layoutPositionsRef.current = positionMap;
  }, [filteredNodes, layout]);

  useEffect(() => {
    const canvasNodes: CanvasNode[] = filteredNodes.map((n) => ({
      id: n.id,
      x: layoutPositionsRef.current.get(n.id)?.x ?? 0,
      y: layoutPositionsRef.current.get(n.id)?.y ?? 0,
      vx: 0,
      vy: 0,
      type: n.type,
      label: n.label,
      radius: getNodeRadius(n.type),
    }));
    nodesRef.current = canvasNodes;
  }, [filteredNodes]);

  useEffect(() => {
    edgesRef.current = filteredEdges.map((e) => ({
      id: e.id,
      source: e.sourceId,
      target: e.targetId,
      type: e.type,
      weight: e.weight,
    }));
  }, [filteredEdges]);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (screenX - rect.left - panX - dimensions.width / 2) / zoom,
        y: (screenY - rect.top - panY - dimensions.height / 2) / zoom,
      };
    },
    [zoom, panX, panY, dimensions],
  );

  const findNodeAt = useCallback((worldX: number, worldY: number): CanvasNode | null => {
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const node: CanvasNode | undefined = nodesRef.current[i];
      if (!node) continue;
      const dx = node.x - worldX;
      const dy = node.y - worldY;
      if (dx * dx + dy * dy < node.radius * node.radius) {
        return node;
      }
    }
    return null;
  }, []);

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    ctx.save();
    ctx.translate(panX + dimensions.width / 2, panY + dimensions.height / 2);
    ctx.scale(zoom, zoom);

    const selectedNodeId = selection.selectedNodeId;
    const selectedEdgeId = selection.selectedEdgeId;
    const highlightedNodeIds = selection.highlightedNodeIds;
    const highlightedEdgeIds = selection.highlightedEdgeIds;
    const hasHighlights = highlightedNodeIds.size > 0 || highlightedEdgeIds.size > 0;

    const nodePosMap = new Map<string, CanvasNode>();
    for (const node of nodesRef.current) {
      nodePosMap.set(node.id, node);
    }

    for (const edge of edgesRef.current) {
      const source = nodePosMap.get(edge.source);
      const target = nodePosMap.get(edge.target);
      if (!source || !target) continue;

      const isSelected = edge.id === selectedEdgeId;
      const isHighlighted = highlightedEdgeIds.has(edge.id);
      const isConnected =
        selectedNodeId !== null &&
        (edge.source === selectedNodeId || edge.target === selectedNodeId);

      let alpha = 1;
      if (hasHighlights && !isHighlighted && !isConnected) {
        alpha = 0.1;
      } else if (selectedNodeId !== null && !isSelected && !isConnected) {
        alpha = 0.3;
      }

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);

      const color = getEdgeColor(edge.type);
      if (isSelected || isHighlighted) {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, edge.weight * 1.5);
      } else {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, edge.weight * 0.8);
      }

      ctx.stroke();
      ctx.globalAlpha = 1;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const len = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const arrowLen = 6;
      const arrowX = target.x - (dx / len) * target.radius;
      const arrowY = target.y - (dy / len) * target.radius;

      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - (dx / len) * arrowLen + (dy / len) * arrowLen * 0.5,
        arrowY - (dy / len) * arrowLen - (dx / len) * arrowLen * 0.5,
      );
      ctx.lineTo(
        arrowX - (dx / len) * arrowLen - (dy / len) * arrowLen * 0.5,
        arrowY - (dy / len) * arrowLen + (dx / len) * arrowLen * 0.5,
      );
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    for (const node of nodesRef.current) {
      const isSelected = node.id === selectedNodeId;
      const isHighlighted = highlightedNodeIds.has(node.id);
      const isHovered = node.id === hoveredNode;
      const isConnected =
        selectedNodeId !== null &&
        edgesRef.current.some(
          (e) =>
            (e.source === selectedNodeId && e.target === node.id) ||
            (e.target === selectedNodeId && e.source === node.id),
        );

      let alpha = 1;
      if (hasHighlights && !isHighlighted && !isConnected && !isSelected) {
        alpha = 0.15;
      } else if (selectedNodeId !== null && !isSelected && !isConnected) {
        alpha = 0.4;
      }

      ctx.globalAlpha = alpha;

      const color = getNodeColor(node.type);
      const radius = isSelected || isHovered ? node.radius * 1.4 : node.radius;

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      if (isSelected || isHighlighted) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (zoom > 0.5) {
        ctx.fillStyle = isSelected || isHighlighted ? '#ffffff' : 'rgba(255,255,255,0.8)';
        ctx.font = `${Math.max(8, 10 / Math.max(zoom, 0.5))}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const displayLabel = node.label.length > 20 ? node.label.slice(0, 18) + '…' : node.label;
        ctx.fillText(displayLabel, node.x, node.y + radius + 3);
      }

      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }, [dimensions, zoom, panX, panY, selection, hoveredNode]);

  useEffect(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(drawGraph);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [drawGraph]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.min(5, Math.max(0.1, prev * delta)));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
        return;
      }

      if (e.button === 0) {
        const world = screenToWorld(e.clientX, e.clientY);
        const node = findNodeAt(world.x, world.y);
        if (node) {
          onNodeClick(node.id);
        } else {
          onBackgroundClick();
        }
      }
    },
    [panX, panY, screenToWorld, findNodeAt, onNodeClick, onBackgroundClick],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPanX(e.clientX - dragStart.x);
        setPanY(e.clientY - dragStart.y);
        return;
      }

      const world = screenToWorld(e.clientX, e.clientY);
      const node = findNodeAt(world.x, world.y);
      const newHovered = node?.id ?? null;
      if (newHovered !== hoveredNode) {
        setHoveredNode(newHovered);
        onNodeHover(newHovered);
      }
    },
    [isDragging, dragStart, screenToWorld, findNodeAt, hoveredNode, onNodeHover],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const world = screenToWorld(e.clientX, e.clientY);
      const node = findNodeAt(world.x, world.y);
      if (node) {
        setPanX(-node.x * zoom + dimensions.width / 2);
        setPanY(-node.y * zoom + dimensions.height / 2);
        setZoom(2);
      }
    },
    [screenToWorld, findNodeAt, zoom, dimensions],
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-background"
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        className="block w-full h-full"
      />
      <div className="absolute bottom-2 right-2 flex gap-1">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(5, z * 1.2))}
          className="px-2 py-1 text-xs bg-muted rounded hover:bg-muted/80"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.1, z * 0.8))}
          className="px-2 py-1 text-xs bg-muted rounded hover:bg-muted/80"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setPanX(0);
            setPanY(0);
          }}
          className="px-2 py-1 text-xs bg-muted rounded hover:bg-muted/80"
        >
          Reset
        </button>
      </div>
      <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
        {nodes.length} nodes · {edges.length} edges · {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
