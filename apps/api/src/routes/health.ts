/**
 * /health/* routes — liveness, readiness, diagnostics.
 * Phase 8.4: Real readiness checks via HealthManager, diagnostics endpoint.
 */

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { HealthManager, RuntimeDiagnostics } from '@agent-os/runtime';

export interface HealthRouteOptions {
  readonly healthManager?: HealthManager | undefined;
  readonly diagnostics?: RuntimeDiagnostics | undefined;
}

export const healthRoutes: FastifyPluginAsync<HealthRouteOptions> = async (
  app: FastifyInstance,
  opts,
): Promise<void> => {
  const hm = opts.healthManager;
  const diag = opts.diagnostics;

  // GET /health — liveness (always ok if process is alive)
  app.get('/', async () => {
    if (hm != null) {
      return hm.liveness();
    }
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      checks: [],
      timestamp: new Date().toISOString(),
    };
  });

  // GET /health/live — liveness alias
  app.get('/live', async () => {
    if (hm != null) {
      return hm.liveness();
    }
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      checks: [],
      timestamp: new Date().toISOString(),
    };
  });

  // GET /health/ready — readiness (checks all dependencies)
  app.get('/ready', async (_, reply) => {
    if (hm != null) {
      const report = await hm.readiness();
      if (!report.ready) {
        return reply.code(503).send(report);
      }
      return report;
    }
    return { ready: true, checks: [], timestamp: new Date().toISOString() };
  });

  // GET /health/diagnostics — runtime diagnostics
  app.get('/diagnostics', async () => {
    if (diag != null) {
      return diag.report();
    }
    return {
      version: '1.0.0',
      uptimeMs: Math.round(process.uptime() * 1000),
      buildInfo: {
        version: process.version,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      loadedPlugins: [],
      loadedAdapters: [],
      configurationSummary: {},
      memoryUsage: { heapUsedMb: 0, heapTotalMb: 0, rssMb: 0, externalMb: 0 },
      eventBusStatus: { subscribedTopics: 0, status: 'inactive' },
      startup: { phase: 'idle', startedSteps: [], failedStep: undefined, durationMs: undefined },
      shutdown: {
        phase: 'idle',
        startedAt: undefined,
        completedAt: undefined,
        durationMs: undefined,
        failedStep: undefined,
      },
    };
  });
};
