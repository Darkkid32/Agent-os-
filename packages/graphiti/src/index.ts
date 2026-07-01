/**
 * @agent-os/graphiti — Knowledge graph backend
 *
 * Entities, relationships, and graph queries for Agent OS.
 * Hermes writes to the graph; Graphify reads from it.
 *
 * Layer: 2 (Platform)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  GraphNodeId,
  GraphEdgeId,
  GraphLabel,
  GraphNodeType,
  GraphEdgeType,
  GraphNode,
  GraphEdge,
  GraphPath,
  GraphQuery,
  GraphSearchQuery,
  GraphStats,
  GraphChangeType,
  GraphChangeSet,
  GraphEventHandler,
} from './GraphTypes.js';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type { GraphitiProvider, GraphChange } from './GraphitiProvider.js';

// ---------------------------------------------------------------------------
// In-memory implementation
// ---------------------------------------------------------------------------

export { InMemoryGraphiti } from './InMemoryGraphiti.js';
