/**
 * Fastify application factory used by `server.ts` and any future tests.
 * The factory is the single place to assemble plugins, hooks, and routes.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import { healthRoutes } from './routes/health.js';
import { versionRoutes } from './routes/version.js';

export interface AppConfig {
  readonly logger: boolean | { readonly level: string };
  readonly corsOrigins: readonly string[];
}

export const defaultConfig: AppConfig = {
  logger: { level: process.env['LOG_LEVEL'] ?? 'info' },
  corsOrigins: ['http://localhost:3000'],
};

export async function buildApp(config: Partial<AppConfig> = {}): Promise<FastifyInstance> {
  const merged: AppConfig = { ...defaultConfig, ...config };
  const app = Fastify({ logger: merged.logger });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: [...merged.corsOrigins] });
  await app.register(sensible);

  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(versionRoutes, { prefix: '/version' });

  return app;
}
