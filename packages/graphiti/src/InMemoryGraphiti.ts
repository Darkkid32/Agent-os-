/**
 * In-memory Graphiti provider.
 *
 * Simple in-memory implementation for development and testing.
 * Production deployments should use a persistent graph database.
 *
 * Layer: 2 (Platform)
 */

import type {
  GraphEdge,
  GraphEdgeId,
  GraphEdgeType,
  GraphEventHandler,
  GraphNodeId,
  GraphNodeType,
  GraphNode,
  GraphPath,
  GraphQuery,
  GraphSearchQuery,
  GraphStats,
} from './GraphTypes.js';
import type { GraphChange, GraphitiProvider } from './GraphitiProvider.js';

// ---------------------------------------------------------------------------
// In-memory implementation
// ---------------------------------------------------------------------------

export class InMemoryGraphiti implements GraphitiProvider {
  private readonly nodes = new Map<GraphNodeId, GraphNode>();
  private readonly edges = new Map<GraphEdgeId, GraphEdge>();
  private readonly outgoingEdges = new Map<GraphNodeId, GraphEdgeId[]>();
  private readonly incomingEdges = new Map<GraphNodeId, GraphEdgeId[]>();
  private readonly handlers: GraphEventHandler[] = [];
  private readonly changes: GraphChange[] = [];
  private nodeCounter = 0;
  private edgeCounter = 0;

  // -------------------------------------------------------------------------
  // Node operations
  // -------------------------------------------------------------------------

  public addNode(node: Omit<GraphNode, 'createdAt' | 'updatedAt'>): GraphNode {
    const now = new Date().toISOString();
    const full: GraphNode = {
      ...node,
      createdAt: now,
      updatedAt: now,
    };
    this.nodes.set(full.id, full);
    this.changes.push({ type: 'node_added', timestamp: now, nodeId: full.id });
    this.emit({ type: 'node_added', timestamp: now, nodeId: full.id });
    this.nodeCounter++;
    return full;
  }

  public getNode(id: GraphNodeId): GraphNode | undefined {
    return this.nodes.get(id);
  }

  public updateNode(id: GraphNodeId, properties: Record<string, unknown>): GraphNode | undefined {
    const existing = this.nodes.get(id);
    if (!existing) return undefined;
    const now = new Date().toISOString();
    const updated: GraphNode = {
      ...existing,
      properties: { ...existing.properties, ...properties },
      updatedAt: now,
    };
    this.nodes.set(id, updated);
    this.changes.push({ type: 'node_updated', timestamp: now, nodeId: id });
    this.emit({ type: 'node_updated', timestamp: now, nodeId: id });
    return updated;
  }

  public removeNode(id: GraphNodeId): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Remove connected edges
    const outgoing = this.outgoingEdges.get(id) ?? [];
    const incoming = this.incomingEdges.get(id) ?? [];
    for (const edgeId of [...outgoing, ...incoming]) {
      this.removeEdge(edgeId);
    }

    this.nodes.delete(id);
    this.outgoingEdges.delete(id);
    this.incomingEdges.delete(id);
    const now = new Date().toISOString();
    this.changes.push({ type: 'node_removed', timestamp: now, nodeId: id });
    this.emit({ type: 'node_removed', timestamp: now, nodeId: id });
    return true;
  }

  // -------------------------------------------------------------------------
  // Edge operations
  // -------------------------------------------------------------------------

  public addEdge(edge: Omit<GraphEdge, 'createdAt'>): GraphEdge {
    const now = new Date().toISOString();
    const full: GraphEdge = { ...edge, createdAt: now };
    this.edges.set(full.id, full);

    const outgoing = this.outgoingEdges.get(full.sourceId) ?? [];
    outgoing.push(full.id);
    this.outgoingEdges.set(full.sourceId, outgoing);

    const incoming = this.incomingEdges.get(full.targetId) ?? [];
    incoming.push(full.id);
    this.incomingEdges.set(full.targetId, incoming);

    this.changes.push({ type: 'edge_added', timestamp: now, edgeId: full.id });
    this.emit({ type: 'edge_added', timestamp: now, edgeId: full.id });
    this.edgeCounter++;
    return full;
  }

  public getEdge(id: GraphEdgeId): GraphEdge | undefined {
    return this.edges.get(id);
  }

  public removeEdge(id: GraphEdgeId): boolean {
    const edge = this.edges.get(id);
    if (!edge) return false;

    this.edges.delete(id);

    const outgoing = this.outgoingEdges.get(edge.sourceId);
    if (outgoing) {
      const idx = outgoing.indexOf(id);
      if (idx >= 0) outgoing.splice(idx, 1);
    }

    const incoming = this.incomingEdges.get(edge.targetId);
    if (incoming) {
      const idx = incoming.indexOf(id);
      if (idx >= 0) incoming.splice(idx, 1);
    }

    const now = new Date().toISOString();
    this.changes.push({ type: 'edge_removed', timestamp: now, edgeId: id });
    this.emit({ type: 'edge_removed', timestamp: now, edgeId: id });
    return true;
  }

  public getEdges(
    nodeId: GraphNodeId,
    direction: 'outgoing' | 'incoming' | 'both' = 'both',
  ): readonly GraphEdge[] {
    const result: GraphEdge[] = [];
    if (direction === 'outgoing' || direction === 'both') {
      const ids = this.outgoingEdges.get(nodeId) ?? [];
      for (const id of ids) {
        const edge = this.edges.get(id);
        if (edge) result.push(edge);
      }
    }
    if (direction === 'incoming' || direction === 'both') {
      const ids = this.incomingEdges.get(nodeId) ?? [];
      for (const id of ids) {
        const edge = this.edges.get(id);
        if (edge) result.push(edge);
      }
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // Query operations
  // -------------------------------------------------------------------------

  public queryNodes(query: GraphQuery): readonly GraphNode[] {
    let results = Array.from(this.nodes.values());

    if (query.nodeTypes?.length) {
      const types = new Set<GraphNodeType>(query.nodeTypes);
      results = results.filter((n) => types.has(n.type));
    }

    if (query.labels?.length) {
      const labels = new Set(query.labels);
      results = results.filter((n) => labels.has(n.label));
    }

    if (query.properties) {
      const entries = Object.entries(query.properties);
      results = results.filter((n) => entries.every(([k, v]) => n.properties[k] === v));
    }

    const offset = query.offset ?? 0;
    const limit = query.limit ?? results.length;
    return results.slice(offset, offset + limit);
  }

  public searchNodes(query: GraphSearchQuery): readonly GraphNode[] {
    const text = query.text.toLowerCase();
    let results = Array.from(this.nodes.values()).filter(
      (n) =>
        n.label.toLowerCase().includes(text) ||
        JSON.stringify(n.properties).toLowerCase().includes(text),
    );

    if (query.nodeTypes?.length) {
      const types = new Set<GraphNodeType>(query.nodeTypes);
      results = results.filter((n) => types.has(n.type));
    }

    const limit = query.limit ?? results.length;
    return results.slice(0, limit);
  }

  public findPath(
    sourceId: GraphNodeId,
    targetId: GraphNodeId,
    maxDepth: number = 10,
  ): GraphPath | undefined {
    if (sourceId === targetId) {
      return { nodes: [sourceId], edges: [], length: 0 };
    }

    const visited = new Set<GraphNodeId>();
    const queue: Array<{ nodeId: GraphNodeId; path: GraphPath }> = [
      { nodeId: sourceId, path: { nodes: [sourceId], edges: [], length: 0 } },
    ];

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const { nodeId, path } = item;
      if (nodeId === targetId) return path;
      if (path.length >= maxDepth) continue;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const edges = this.getEdges(nodeId, 'outgoing');
      for (const edge of edges) {
        if (!visited.has(edge.targetId)) {
          queue.push({
            nodeId: edge.targetId,
            path: {
              nodes: [...path.nodes, edge.targetId],
              edges: [...path.edges, edge.id],
              length: path.length + 1,
            },
          });
        }
      }
    }

    return undefined;
  }

  // -------------------------------------------------------------------------
  // Stats and history
  // -------------------------------------------------------------------------

  public getStats(): GraphStats {
    const nodesByType: Record<string, number> = {};
    const edgesByType: Record<string, number> = {};

    for (const node of this.nodes.values()) {
      nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1;
    }
    for (const edge of this.edges.values()) {
      edgesByType[edge.type] = (edgesByType[edge.type] ?? 0) + 1;
    }

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      nodesByType: nodesByType as Record<GraphNodeType, number>,
      edgesByType: edgesByType as Record<GraphEdgeType, number>,
    };
  }

  public getChanges(limit: number = 50): readonly GraphChange[] {
    return this.changes.slice(-limit);
  }

  // -------------------------------------------------------------------------
  // Event handling
  // -------------------------------------------------------------------------

  public onChange(handler: GraphEventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const idx = this.handlers.indexOf(handler);
      if (idx >= 0) this.handlers.splice(idx, 1);
    };
  }

  private emit(change: GraphChange): void {
    for (const handler of this.handlers) {
      try {
        handler(change);
      } catch {
        // Swallow handler errors
      }
    }
  }

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------

  public clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.outgoingEdges.clear();
    this.incomingEdges.clear();
    this.changes.length = 0;
    this.nodeCounter = 0;
    this.edgeCounter = 0;
  }

  public getNodeCount(): number {
    return this.nodes.size;
  }

  public getEdgeCount(): number {
    return this.edges.size;
  }
}
