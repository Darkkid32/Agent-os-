/**
 * /v1/agents, /v1/missions, /v1/memory, /v1/plans, /v1/plugins,
 * /v1/tools, /v1/skills, /v1/models, /v1/logs, /v1/metrics/* REST routes.
 *
 * Mission Control API — read-only endpoints that Hermes owns.
 * These routes expose Hermes subsystem data for the dashboard.
 *
 * Phase 9.6: Mission Control integration.
 */
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { HermesPort } from '@agent-os/hermes';
import type { GraphitiProvider } from '@agent-os/graphiti';

export interface MissionControlRoutesOpts {
  readonly hermes: HermesPort;
  readonly graph: GraphitiProvider;
}

export const missionControlRoutes: FastifyPluginAsync<MissionControlRoutesOpts> = async (
  app: FastifyInstance,
  opts: MissionControlRoutesOpts,
): Promise<void> => {
  const { hermes, graph } = opts;

  // -------------------------------------------------------------------------
  // /v1/agents — registered modules as agents
  // -------------------------------------------------------------------------
  app.get('/agents', async () => {
    const status = hermes.status();
    const health = await hermes.health();
    const agents = health.modules.map((m) => ({
      id: m.name,
      name: m.name,
      status: m.status,
      type: 'module' as const,
      detail: m.detail,
      registeredAt: new Date().toISOString(),
    }));
    return {
      ok: true,
      value: {
        count: status.modules,
        items: agents,
      },
    };
  });

  // -------------------------------------------------------------------------
  // /v1/missions — active executions from graph
  // -------------------------------------------------------------------------
  app.get('/missions', async () => {
    const executions = graph.queryNodes({ nodeTypes: ['execution'], limit: 100 });
    const missions = executions.map((e) => ({
      id: e.id,
      name: e.label,
      status: (e.properties['status'] as string) ?? 'unknown',
      goal: (e.properties['goal'] as string) ?? '',
      startedAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));
    return {
      ok: true,
      value: {
        count: missions.length,
        items: missions,
      },
    };
  });

  // -------------------------------------------------------------------------
  // /v1/memory — memory entries from graph
  // -------------------------------------------------------------------------
  app.get('/memory', async (req: FastifyRequest) => {
    const query = req.query as Record<string, string | undefined>;
    const limit = query['limit'] ? parseInt(query['limit'], 10) : 50;
    const memories = graph.queryNodes({ nodeTypes: ['memory'], limit });
    const items = memories.map((m) => ({
      id: m.id,
      content: m.label,
      scope: (m.properties['scope'] as string) ?? 'unknown',
      source: (m.properties['source'] as string) ?? 'unknown',
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));
    return {
      ok: true,
      value: {
        count: items.length,
        items,
      },
    };
  });

  // -------------------------------------------------------------------------
  // /v1/plans — plans from graph
  // -------------------------------------------------------------------------
  app.get('/plans', async () => {
    const plans = graph.queryNodes({ nodeTypes: ['plan'], limit: 100 });
    const items = plans.map((p) => ({
      id: p.id,
      name: p.label,
      status: (p.properties['status'] as string) ?? 'unknown',
      goal: (p.properties['goal'] as string) ?? '',
      stepCount: (p.properties['stepCount'] as number) ?? 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
    return {
      ok: true,
      value: {
        count: items.length,
        items,
      },
    };
  });

  // -------------------------------------------------------------------------
  // /v1/tools — tools from graph
  // -------------------------------------------------------------------------
  app.get('/tools', async () => {
    const tools = graph.queryNodes({ nodeTypes: ['tool'], limit: 200 });
    const items = tools.map((t) => ({
      id: t.id,
      name: t.label,
      type: (t.properties['toolType'] as string) ?? 'unknown',
      description: (t.properties['description'] as string) ?? '',
      status: (t.properties['status'] as string) ?? 'available',
    }));
    return {
      ok: true,
      value: {
        count: items.length,
        items,
      },
    };
  });

  // -------------------------------------------------------------------------
  // /v1/skills — skills from graph
  // -------------------------------------------------------------------------
  app.get('/skills', async () => {
    const skills = graph.queryNodes({ nodeTypes: ['skill'], limit: 200 });
    const items = skills.map((s) => ({
      id: s.id,
      name: s.label,
      description: (s.properties['description'] as string) ?? '',
      status: (s.properties['status'] as string) ?? 'available',
    }));
    return {
      ok: true,
      value: {
        count: items.length,
        items,
      },
    };
  });

  // -------------------------------------------------------------------------
  // /v1/models — model info from Hermes config
  // -------------------------------------------------------------------------
  app.get('/models', async () => {
    const config = hermes.config;
    const models = [
      {
        id: 'primary',
        name: 'Primary Model',
        provider: config.openrouterApiKey ? 'openrouter' : 'unknown',
        status: config.openrouterApiKey ? 'configured' : 'not_configured',
      },
    ];
    return {
      ok: true,
      value: {
        count: models.length,
        items: models,
      },
    };
  });

  // -------------------------------------------------------------------------
  // /v1/logs — recent execution events from graph
  // -------------------------------------------------------------------------
  app.get('/logs', async (req: FastifyRequest) => {
    const query = req.query as Record<string, string | undefined>;
    const limit = query['limit'] ? parseInt(query['limit'], 10) : 50;
    const logs = graph.queryNodes({ nodeTypes: ['log'], limit });
    const items = logs.map((l) => ({
      id: l.id,
      level: (l.properties['level'] as string) ?? 'info',
      message: l.label,
      source: (l.properties['source'] as string) ?? 'unknown',
      timestamp: l.createdAt,
    }));
    return {
      ok: true,
      value: {
        count: items.length,
        items,
      },
    };
  });

  // -------------------------------------------------------------------------
  // /v1/metrics/summary — aggregated metrics
  // -------------------------------------------------------------------------
  app.get('/metrics/summary', async () => {
    const stats = graph.getStats();
    const status = hermes.status();
    return {
      ok: true,
      value: {
        hermes: {
          phase: status.phase,
          uptime: status.uptime,
          modules: status.modules,
        },
        graph: {
          nodeCount: stats.nodeCount,
          edgeCount: stats.edgeCount,
          nodesByType: stats.nodesByType,
          edgesByType: stats.edgesByType,
        },
      },
    };
  });
};
