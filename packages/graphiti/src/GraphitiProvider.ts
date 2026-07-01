/**
 * Graphiti provider interface — knowledge graph operations.
 *
 * Defines the contract for graph storage backends.
 * Hermes writes to the graph; Graphify reads from it.
 *
 * Layer: 2 (Platform)
 */

import type {
  GraphChangeType,
  GraphEdge,
  GraphEdgeId,
  GraphEventHandler,
  GraphNodeId,
  GraphNode,
  GraphPath,
  GraphQuery,
  GraphSearchQuery,
  GraphStats,
} from './GraphTypes.js';

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface GraphitiProvider {
  /** Add a node to the graph */
  addNode(node: Omit<GraphNode, 'createdAt' | 'updatedAt'>): GraphNode;

  /** Get a node by ID */
  getNode(id: GraphNodeId): GraphNode | undefined;

  /** Update a node's properties */
  updateNode(id: GraphNodeId, properties: Record<string, unknown>): GraphNode | undefined;

  /** Remove a node and its connected edges */
  removeNode(id: GraphNodeId): boolean;

  /** Add an edge to the graph */
  addEdge(edge: Omit<GraphEdge, 'createdAt'>): GraphEdge;

  /** Get an edge by ID */
  getEdge(id: GraphEdgeId): GraphEdge | undefined;

  /** Remove an edge */
  removeEdge(id: GraphEdgeId): boolean;

  /** Get all edges for a node */
  getEdges(nodeId: GraphNodeId, direction?: 'outgoing' | 'incoming' | 'both'): readonly GraphEdge[];

  /** Query nodes by type, label, or properties */
  queryNodes(query: GraphQuery): readonly GraphNode[];

  /** Search nodes by text */
  searchNodes(query: GraphSearchQuery): readonly GraphNode[];

  /** Find shortest path between two nodes */
  findPath(sourceId: GraphNodeId, targetId: GraphNodeId, maxDepth?: number): GraphPath | undefined;

  /** Get graph statistics */
  getStats(): GraphStats;

  /** Get recent changes */
  getChanges(limit?: number): readonly GraphChange[];

  /** Subscribe to graph changes */
  onChange(handler: GraphEventHandler): () => void;
}

// ---------------------------------------------------------------------------
// Graph change (for history)
// ---------------------------------------------------------------------------

export interface GraphChange {
  readonly type: GraphChangeType;
  readonly timestamp: string;
  readonly nodeId?: GraphNodeId;
  readonly edgeId?: GraphEdgeId;
  readonly details?: Record<string, unknown>;
}
