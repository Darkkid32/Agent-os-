/**
 * /v1/graph/* REST routes — Knowledge graph API.
 *
 * Exposes the Graphiti knowledge graph for Graphify consumption.
 * Hermes writes to the graph; these routes provide read access.
 *
 * Phase 9.6: stable graph API for Phase 9.7 Graphify visualization.
 */
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { GraphitiProvider, GraphNode, GraphEdge } from '@agent-os/graphiti';

export interface GraphRoutesOpts {
  readonly graph: GraphitiProvider;
}

interface GraphNodeDTO {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface GraphEdgeDTO {
  readonly id: string;
  readonly type: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly weight: number;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

const nodeToJson = (node: GraphNode): GraphNodeDTO => ({
  id: node.id,
  type: node.type,
  label: node.label,
  properties: node.properties,
  createdAt: node.createdAt,
  updatedAt: node.updatedAt,
});

const edgeToJson = (edge: GraphEdge): GraphEdgeDTO => ({
  id: edge.id,
  type: edge.type,
  sourceId: edge.sourceId,
  targetId: edge.targetId,
  weight: edge.weight,
  properties: edge.properties,
  createdAt: edge.createdAt,
});

export const graphRoutes: FastifyPluginAsync<GraphRoutesOpts> = async (
  app: FastifyInstance,
  opts: GraphRoutesOpts,
): Promise<void> => {
  const { graph } = opts;

  // GET /v1/graph — full graph snapshot
  app.get('/', async () => {
    const nodes = graph.queryNodes({ limit: 1000 });
    const stats = graph.getStats();
    const allEdges: GraphEdgeDTO[] = [];
    for (const node of nodes) {
      const edges = graph.getEdges(node.id, 'outgoing');
      for (const edge of edges) {
        allEdges.push(edgeToJson(edge));
      }
    }
    return {
      ok: true,
      value: {
        nodes: nodes.map(nodeToJson),
        edges: allEdges,
        stats,
      },
    };
  });

  // GET /v1/graph/nodes — query nodes
  app.get('/nodes', async (req: FastifyRequest) => {
    const query = req.query as Record<string, string | undefined>;
    const nodeTypes = query['type']?.split(',') as
      Parameters<typeof graph.queryNodes>[0]['nodeTypes'] | undefined;
    const limit = query['limit'] ? parseInt(query['limit'], 10) : undefined;
    const offset = query['offset'] ? parseInt(query['offset'], 10) : undefined;
    const nodes = graph.queryNodes({
      ...(nodeTypes !== undefined ? { nodeTypes } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
    });
    return {
      ok: true,
      value: {
        count: nodes.length,
        items: nodes.map(nodeToJson),
      },
    };
  });

  // GET /v1/graph/nodes/:id — get a single node
  app.get('/nodes/:id', async (req: FastifyRequest, reply) => {
    const { id } = req.params as { id: string };
    const node = graph.getNode(id);
    if (!node) {
      return reply
        .code(404)
        .send({ ok: false, error: { code: 'NOT_FOUND', message: `Node ${id} not found` } });
    }
    return { ok: true, value: nodeToJson(node) };
  });

  // GET /v1/graph/edges — query edges for a node
  app.get('/edges', async (req: FastifyRequest) => {
    const query = req.query as Record<string, string | undefined>;
    const nodeId = query['nodeId'];
    const direction = (query['direction'] as 'outgoing' | 'incoming' | 'both') ?? 'both';
    if (!nodeId) {
      return { ok: true, value: { count: 0, items: [] } };
    }
    const edges = graph.getEdges(nodeId, direction);
    return {
      ok: true,
      value: {
        count: edges.length,
        items: edges.map(edgeToJson),
      },
    };
  });

  // GET /v1/graph/search — search nodes by text
  app.get('/search', async (req: FastifyRequest) => {
    const query = req.query as Record<string, string | undefined>;
    const text = query['q'] ?? '';
    const nodeTypes = query['type']?.split(',') as
      Parameters<typeof graph.searchNodes>[0]['nodeTypes'] | undefined;
    const limit = query['limit'] ? parseInt(query['limit'], 10) : undefined;
    const results = graph.searchNodes({
      text,
      ...(nodeTypes !== undefined ? { nodeTypes } : {}),
      ...(limit !== undefined ? { limit } : {}),
    });
    return {
      ok: true,
      value: {
        count: results.length,
        items: results.map(nodeToJson),
      },
    };
  });

  // GET /v1/graph/path — find path between two nodes
  app.get('/path', async (req: FastifyRequest, reply) => {
    const query = req.query as Record<string, string | undefined>;
    const source = query['source'];
    const target = query['target'];
    if (!source || !target) {
      return reply
        .code(400)
        .send({ ok: false, error: { code: 'BAD_REQUEST', message: 'source and target required' } });
    }
    const maxDepth = query['maxDepth'] ? parseInt(query['maxDepth'], 10) : undefined;
    const path = graph.findPath(source, target, maxDepth);
    if (!path) {
      return reply
        .code(404)
        .send({ ok: false, error: { code: 'NOT_FOUND', message: 'No path found' } });
    }
    return { ok: true, value: path };
  });

  // GET /v1/graph/stats — graph statistics
  app.get('/stats', async () => ({
    ok: true,
    value: graph.getStats(),
  }));

  // GET /v1/graph/history — recent graph changes
  app.get('/history', async (req: FastifyRequest) => {
    const query = req.query as Record<string, string | undefined>;
    const limit = query['limit'] ? parseInt(query['limit'], 10) : 50;
    return {
      ok: true,
      value: {
        count: graph.getChanges(limit).length,
        items: graph.getChanges(limit),
      },
    };
  });
};
