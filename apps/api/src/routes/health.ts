/**
 * /health/* routes — liveness + readiness.
 * Phase 1.1: returns a static "ok" payload; later phases will probe dependencies.
 */

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  app.get('/', async (): Promise<{ status: 'ok'; uptimeSeconds: number }> => {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  });
};
