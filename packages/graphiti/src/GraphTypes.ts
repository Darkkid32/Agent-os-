/**
 * Graphiti — Knowledge graph types for Agent OS.
 *
 * Defines the core types for nodes, edges, queries, and events
 * used by the knowledge graph backend.
 *
 * Layer: 2 (Platform)
 */

// ---------------------------------------------------------------------------
// IDs
// ---------------------------------------------------------------------------

export type GraphNodeId = string;
export type GraphEdgeId = string;
export type GraphLabel = string;

// ---------------------------------------------------------------------------
// Node types
// ---------------------------------------------------------------------------

export type GraphNodeType =
  | 'agent'
  | 'goal'
  | 'plan'
  | 'step'
  | 'tool'
  | 'skill'
  | 'memory'
  | 'execution'
  | 'mission'
  | 'plugin'
  | 'model'
  | 'log'
  | 'entity';

// ---------------------------------------------------------------------------
// Edge types
// ---------------------------------------------------------------------------

export type GraphEdgeType =
  | 'executes'
  | 'uses'
  | 'achieves'
  | 'depends_on'
  | 'contains'
  | 'produces'
  | 'consumes'
  | 'triggers'
  | 'references'
  | 'extends'
  | 'related_to';

// ---------------------------------------------------------------------------
// Graph node
// ---------------------------------------------------------------------------

export interface GraphNode {
  readonly id: GraphNodeId;
  readonly type: GraphNodeType;
  readonly label: string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ---------------------------------------------------------------------------
// Graph edge
// ---------------------------------------------------------------------------

export interface GraphEdge {
  readonly id: GraphEdgeId;
  readonly type: GraphEdgeType;
  readonly sourceId: GraphNodeId;
  readonly targetId: GraphNodeId;
  readonly weight: number;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

// ---------------------------------------------------------------------------
// Graph path
// ---------------------------------------------------------------------------

export interface GraphPath {
  readonly nodes: readonly GraphNodeId[];
  readonly edges: readonly GraphEdgeId[];
  readonly length: number;
}

// ---------------------------------------------------------------------------
// Graph query
// ---------------------------------------------------------------------------

export interface GraphQuery {
  readonly nodeTypes?: readonly GraphNodeType[];
  readonly edgeTypes?: readonly GraphEdgeType[];
  readonly labels?: readonly string[];
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly limit?: number;
  readonly offset?: number;
}

// ---------------------------------------------------------------------------
// Graph search query
// ---------------------------------------------------------------------------

export interface GraphSearchQuery {
  readonly text: string;
  readonly nodeTypes?: readonly GraphNodeType[];
  readonly limit?: number;
}

// ---------------------------------------------------------------------------
// Graph stats
// ---------------------------------------------------------------------------

export interface GraphStats {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly nodesByType: Readonly<Record<GraphNodeType, number>>;
  readonly edgesByType: Readonly<Record<GraphEdgeType, number>>;
}

// ---------------------------------------------------------------------------
// Graph change types
// ---------------------------------------------------------------------------

export type GraphChangeType =
  'node_added' | 'node_updated' | 'node_removed' | 'edge_added' | 'edge_removed';

export interface GraphChangeSet {
  readonly type: GraphChangeType;
  readonly timestamp: string;
  readonly nodeId?: GraphNodeId;
  readonly edgeId?: GraphEdgeId;
}

// ---------------------------------------------------------------------------
// Graph event handler
// ---------------------------------------------------------------------------

export type GraphEventHandler = (change: GraphChangeSet) => void;
