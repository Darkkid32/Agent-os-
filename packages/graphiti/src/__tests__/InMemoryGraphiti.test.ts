import { describe, it, expect, vi } from 'vitest';
import { InMemoryGraphiti } from '../InMemoryGraphiti.js';
import type { GraphNode, GraphEdge } from '../GraphTypes.js';

const makeNode = (
  overrides: Partial<GraphNode> = {},
): Omit<GraphNode, 'createdAt' | 'updatedAt'> => ({
  id: `node-${Math.random().toString(36).slice(2, 8)}`,
  type: 'entity',
  label: 'Test Node',
  properties: {},
  ...overrides,
});

const makeEdge = (overrides: Partial<GraphEdge> = {}): Omit<GraphEdge, 'createdAt'> => ({
  id: `edge-${Math.random().toString(36).slice(2, 8)}`,
  type: 'related_to',
  sourceId: 'src',
  targetId: 'tgt',
  weight: 1,
  properties: {},
  ...overrides,
});

describe('InMemoryGraphiti', () => {
  // -------------------------------------------------------------------------
  // Node operations
  // -------------------------------------------------------------------------

  describe('addNode', () => {
    it('should add a node with timestamps', () => {
      const g = new InMemoryGraphiti();
      const node = g.addNode(makeNode({ id: 'n1', label: 'Agent 1' }));
      expect(node.id).toBe('n1');
      expect(node.label).toBe('Agent 1');
      expect(node.createdAt).toBeDefined();
      expect(node.updatedAt).toBeDefined();
    });

    it('should increment node count', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1' }));
      g.addNode(makeNode({ id: 'n2' }));
      expect(g.getNodeCount()).toBe(2);
    });
  });

  describe('getNode', () => {
    it('should return an existing node', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1', label: 'Found' }));
      const node = g.getNode('n1');
      expect(node).toBeDefined();
      expect(node!.label).toBe('Found');
    });

    it('should return undefined for missing node', () => {
      const g = new InMemoryGraphiti();
      expect(g.getNode('missing')).toBeUndefined();
    });
  });

  describe('updateNode', () => {
    it('should update properties and updatedAt', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1', properties: { a: 1 } }));
      const updated = g.updateNode('n1', { b: 2 });
      expect(updated).toBeDefined();
      expect(updated!.properties).toEqual({ a: 1, b: 2 });
    });

    it('should return undefined for missing node', () => {
      const g = new InMemoryGraphiti();
      expect(g.updateNode('missing', { a: 1 })).toBeUndefined();
    });
  });

  describe('removeNode', () => {
    it('should remove a node', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1' }));
      expect(g.removeNode('n1')).toBe(true);
      expect(g.getNode('n1')).toBeUndefined();
      expect(g.getNodeCount()).toBe(0);
    });

    it('should remove connected edges', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1' }));
      g.addNode(makeNode({ id: 'n2' }));
      g.addEdge(makeEdge({ id: 'e1', sourceId: 'n1', targetId: 'n2' }));
      g.removeNode('n1');
      expect(g.getEdge('e1')).toBeUndefined();
      expect(g.getEdgeCount()).toBe(0);
    });

    it('should return false for missing node', () => {
      const g = new InMemoryGraphiti();
      expect(g.removeNode('missing')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Edge operations
  // -------------------------------------------------------------------------

  describe('addEdge', () => {
    it('should add an edge with timestamp', () => {
      const g = new InMemoryGraphiti();
      const edge = g.addEdge(makeEdge({ id: 'e1', sourceId: 'n1', targetId: 'n2' }));
      expect(edge.id).toBe('e1');
      expect(edge.sourceId).toBe('n1');
      expect(edge.targetId).toBe('n2');
      expect(edge.createdAt).toBeDefined();
    });

    it('should increment edge count', () => {
      const g = new InMemoryGraphiti();
      g.addEdge(makeEdge({ id: 'e1' }));
      g.addEdge(makeEdge({ id: 'e2' }));
      expect(g.getEdgeCount()).toBe(2);
    });
  });

  describe('getEdge', () => {
    it('should return an existing edge', () => {
      const g = new InMemoryGraphiti();
      g.addEdge(makeEdge({ id: 'e1' }));
      expect(g.getEdge('e1')).toBeDefined();
    });

    it('should return undefined for missing edge', () => {
      const g = new InMemoryGraphiti();
      expect(g.getEdge('missing')).toBeUndefined();
    });
  });

  describe('removeEdge', () => {
    it('should remove an edge', () => {
      const g = new InMemoryGraphiti();
      g.addEdge(makeEdge({ id: 'e1' }));
      expect(g.removeEdge('e1')).toBe(true);
      expect(g.getEdge('e1')).toBeUndefined();
    });

    it('should return false for missing edge', () => {
      const g = new InMemoryGraphiti();
      expect(g.removeEdge('missing')).toBe(false);
    });
  });

  describe('getEdges', () => {
    it('should return outgoing edges', () => {
      const g = new InMemoryGraphiti();
      g.addEdge(makeEdge({ id: 'e1', sourceId: 'n1', targetId: 'n2' }));
      g.addEdge(makeEdge({ id: 'e2', sourceId: 'n2', targetId: 'n3' }));
      const edges = g.getEdges('n1', 'outgoing');
      expect(edges).toHaveLength(1);
      expect(edges[0]!.id).toBe('e1');
    });

    it('should return incoming edges', () => {
      const g = new InMemoryGraphiti();
      g.addEdge(makeEdge({ id: 'e1', sourceId: 'n1', targetId: 'n2' }));
      const edges = g.getEdges('n2', 'incoming');
      expect(edges).toHaveLength(1);
      expect(edges[0]!.id).toBe('e1');
    });

    it('should return both directions', () => {
      const g = new InMemoryGraphiti();
      g.addEdge(makeEdge({ id: 'e1', sourceId: 'n1', targetId: 'n2' }));
      g.addEdge(makeEdge({ id: 'e2', sourceId: 'n2', targetId: 'n3' }));
      const edges = g.getEdges('n2', 'both');
      expect(edges).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // Query operations
  // -------------------------------------------------------------------------

  describe('queryNodes', () => {
    it('should filter by node type', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1', type: 'agent' }));
      g.addNode(makeNode({ id: 'n2', type: 'tool' }));
      g.addNode(makeNode({ id: 'n3', type: 'agent' }));
      const results = g.queryNodes({ nodeTypes: ['agent'] });
      expect(results).toHaveLength(2);
    });

    it('should filter by label', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1', label: 'Alpha' }));
      g.addNode(makeNode({ id: 'n2', label: 'Beta' }));
      const results = g.queryNodes({ labels: ['Alpha'] });
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe('n1');
    });

    it('should filter by properties', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1', properties: { status: 'active' } }));
      g.addNode(makeNode({ id: 'n2', properties: { status: 'inactive' } }));
      const results = g.queryNodes({ properties: { status: 'active' } });
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe('n1');
    });

    it('should respect limit and offset', () => {
      const g = new InMemoryGraphiti();
      for (let i = 0; i < 10; i++) {
        g.addNode(makeNode({ id: `n${i}`, label: `Node ${i}` }));
      }
      const results = g.queryNodes({ limit: 3, offset: 2 });
      expect(results).toHaveLength(3);
    });
  });

  describe('searchNodes', () => {
    it('should find nodes by text in label', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1', label: 'My Agent' }));
      g.addNode(makeNode({ id: 'n2', label: 'Other Tool' }));
      const results = g.searchNodes({ text: 'agent' });
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe('n1');
    });

    it('should find nodes by text in properties', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1', properties: { description: 'handles emails' } }));
      g.addNode(makeNode({ id: 'n2', properties: { description: 'manages files' } }));
      const results = g.searchNodes({ text: 'email' });
      expect(results).toHaveLength(1);
    });

    it('should respect node type filter', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1', type: 'agent', label: 'Email Agent' }));
      g.addNode(makeNode({ id: 'n2', type: 'tool', label: 'Email Tool' }));
      const results = g.searchNodes({ text: 'email', nodeTypes: ['agent'] });
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe('n1');
    });

    it('should respect limit', () => {
      const g = new InMemoryGraphiti();
      for (let i = 0; i < 5; i++) {
        g.addNode(makeNode({ id: `n${i}`, label: `Test Node ${i}` }));
      }
      const results = g.searchNodes({ text: 'test', limit: 2 });
      expect(results).toHaveLength(2);
    });
  });

  describe('findPath', () => {
    it('should find a direct path', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1' }));
      g.addNode(makeNode({ id: 'n2' }));
      g.addEdge(makeEdge({ id: 'e1', sourceId: 'n1', targetId: 'n2' }));
      const path = g.findPath('n1', 'n2');
      expect(path).toBeDefined();
      expect(path!.nodes).toEqual(['n1', 'n2']);
      expect(path!.length).toBe(1);
    });

    it('should find a multi-hop path', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1' }));
      g.addNode(makeNode({ id: 'n2' }));
      g.addNode(makeNode({ id: 'n3' }));
      g.addEdge(makeEdge({ id: 'e1', sourceId: 'n1', targetId: 'n2' }));
      g.addEdge(makeEdge({ id: 'e2', sourceId: 'n2', targetId: 'n3' }));
      const path = g.findPath('n1', 'n3');
      expect(path).toBeDefined();
      expect(path!.nodes).toEqual(['n1', 'n2', 'n3']);
      expect(path!.length).toBe(2);
    });

    it('should return undefined when no path exists', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1' }));
      g.addNode(makeNode({ id: 'n2' }));
      expect(g.findPath('n1', 'n2')).toBeUndefined();
    });

    it('should return empty path for same node', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1' }));
      const path = g.findPath('n1', 'n1');
      expect(path).toBeDefined();
      expect(path!.length).toBe(0);
    });

    it('should respect maxDepth', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1' }));
      g.addNode(makeNode({ id: 'n2' }));
      g.addNode(makeNode({ id: 'n3' }));
      g.addEdge(makeEdge({ id: 'e1', sourceId: 'n1', targetId: 'n2' }));
      g.addEdge(makeEdge({ id: 'e2', sourceId: 'n2', targetId: 'n3' }));
      const path = g.findPath('n1', 'n3', 1);
      expect(path).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------

  describe('getStats', () => {
    it('should return correct counts', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1', type: 'agent' }));
      g.addNode(makeNode({ id: 'n2', type: 'tool' }));
      g.addEdge(makeEdge({ id: 'e1', type: 'uses', sourceId: 'n1', targetId: 'n2' }));
      const stats = g.getStats();
      expect(stats.nodeCount).toBe(2);
      expect(stats.edgeCount).toBe(1);
      expect(stats.nodesByType.agent).toBe(1);
      expect(stats.nodesByType.tool).toBe(1);
      expect(stats.edgesByType.uses).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Changes
  // -------------------------------------------------------------------------

  describe('getChanges', () => {
    it('should track changes', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1' }));
      g.addEdge(makeEdge({ id: 'e1', sourceId: 'n1', targetId: 'n1' }));
      g.removeNode('n1');
      const changes = g.getChanges();
      // node_added, edge_added, edge_removed (from removeNode), node_removed
      expect(changes).toHaveLength(4);
      expect(changes[0]!.type).toBe('node_added');
      expect(changes[1]!.type).toBe('edge_added');
      expect(changes[2]!.type).toBe('edge_removed');
      expect(changes[3]!.type).toBe('node_removed');
    });

    it('should respect limit', () => {
      const g = new InMemoryGraphiti();
      for (let i = 0; i < 10; i++) {
        g.addNode(makeNode({ id: `n${i}` }));
      }
      const changes = g.getChanges(3);
      expect(changes).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  describe('onChange', () => {
    it('should notify handlers on changes', () => {
      const g = new InMemoryGraphiti();
      const handler = vi.fn();
      g.onChange(handler);
      g.addNode(makeNode({ id: 'n1' }));
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'node_added', nodeId: 'n1' }),
      );
    });

    it('should unsubscribe handlers', () => {
      const g = new InMemoryGraphiti();
      const handler = vi.fn();
      const unsub = g.onChange(handler);
      g.addNode(makeNode({ id: 'n1' }));
      expect(handler).toHaveBeenCalledTimes(1);
      unsub();
      g.addNode(makeNode({ id: 'n2' }));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not break on handler errors', () => {
      const g = new InMemoryGraphiti();
      g.onChange(() => {
        throw new Error('boom');
      });
      expect(() => g.addNode(makeNode({ id: 'n1' }))).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // clear
  // -------------------------------------------------------------------------

  describe('clear', () => {
    it('should reset all data', () => {
      const g = new InMemoryGraphiti();
      g.addNode(makeNode({ id: 'n1' }));
      g.addEdge(makeEdge({ id: 'e1' }));
      g.clear();
      expect(g.getNodeCount()).toBe(0);
      expect(g.getEdgeCount()).toBe(0);
      expect(g.getChanges()).toHaveLength(0);
    });
  });
});
