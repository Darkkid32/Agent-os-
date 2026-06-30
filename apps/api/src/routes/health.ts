/**
 * /health/* routes — liveness + readiness.
 * Phase 8.1: /health for liveness, /ready for readiness (Docker healthchecks).
 */

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  app.get('/', async (): Promise<{ status: 'ok'; uptimeSeconds: number }> => {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  });

  app.get('/ready', async (): Promise<{ status: 'ok'; uptimeSeconds: number }> => {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  });
};
