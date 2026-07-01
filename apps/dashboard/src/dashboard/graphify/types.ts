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
  | 'entity'
  | 'hermes'
  | 'configuration'
  | 'file'
  | 'project'
  | 'user'
  | 'session';

export type GraphEdgeType =
  | 'owns'
  | 'executes'
  | 'uses'
  | 'loads'
  | 'calls'
  | 'contains'
  | 'depends_on'
  | 'creates'
  | 'updates'
  | 'references'
  | 'communicates_with'
  | 'achieves'
  | 'produces'
  | 'consumes'
  | 'triggers'
  | 'extends'
  | 'related_to';

export type GraphLayoutType = 'force' | 'hierarchical' | 'radial' | 'tree' | 'dag';

export interface GraphifyNode {
  readonly id: string;
  readonly type: GraphNodeType;
  readonly label: string;
  readonly properties: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphifyEdge {
  readonly id: string;
  readonly type: GraphEdgeType;
  readonly sourceId: string;
  readonly targetId: string;
  readonly weight: number;
  readonly properties: Record<string, unknown>;
  readonly createdAt: string;
}

export interface GraphifySnapshot {
  readonly nodes: readonly GraphifyNode[];
  readonly edges: readonly GraphifyEdge[];
  readonly stats: {
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly nodesByType: Record<string, number>;
    readonly edgesByType: Record<string, number>;
  };
}

export interface GraphifyFilter {
  nodeTypes: ReadonlySet<GraphNodeType>;
  edgeTypes: ReadonlySet<GraphEdgeType>;
  missionId?: string;
  agentId?: string;
  pluginId?: string;
  timeRange?: { readonly from: string; readonly to: string };
  executionState?: string;
}

export interface GraphifySelection {
  readonly selectedNodeId: string | null;
  readonly selectedEdgeId: string | null;
  readonly highlightedNodeIds: ReadonlySet<string>;
  readonly highlightedEdgeIds: ReadonlySet<string>;
}

export interface GraphifyTimelineEntry {
  readonly timestamp: string;
  readonly snapshot: GraphifySnapshot;
}

export interface GraphifySearchResult {
  readonly nodeId: string;
  readonly label: string;
  readonly type: GraphNodeType;
  readonly matchScore: number;
}

export interface GraphifyState {
  readonly snapshot: GraphifySnapshot;
  readonly layout: GraphLayoutType;
  readonly filter: GraphifyFilter;
  readonly selection: GraphifySelection;
  readonly searchQuery: string;
  readonly searchResults: readonly GraphifySearchResult[];
  readonly timeline: readonly GraphifyTimelineEntry[];
  readonly timelineIndex: number;
  readonly isPlaying: boolean;
  readonly zoom: number;
  readonly cameraX: number;
  readonly cameraY: number;
}
