/**
 * Fastify application factory used by `server.ts` and any future tests.
 * The factory is the single place to assemble plugins, hooks, and routes.
 *
 * Phase 4.3: when `hermes` is supplied via `AppConfig`, the seven REST
 * verbs are registered under `/v1`. Production callers (`server.ts`)
 * do NOT supply `hermes` — production routes remain `/health` and
 * `/version` only. Tests inject a real `HermesPort` to exercise
 * Hermes ↔ REST integration end-to-end.
 *
 * Phase 6.2: every incoming request is wrapped in an observability
 * context (requestId + correlationId) via `runWithContext()`.
 */
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import type { HermesPort } from '@agent-os/hermes';
import { createLogger, createContext, runWithContext } from '@agent-os/observability';
import { healthRoutes } from './routes/health.js';
import { versionRoutes } from './routes/version.js';
import { hermesRoutes } from './routes/hermes.js';

export interface AppConfig {
  readonly logger: boolean | { readonly level: string };
  readonly corsOrigins: readonly string[];
  readonly hermes?: HermesPort;
}

export const defaultConfig: AppConfig = {
  logger: { level: process.env['LOG_LEVEL'] ?? 'info' },
  corsOrigins: ['http://localhost:3000'],
};

export async function buildApp(config: Partial<AppConfig> = {}): Promise<FastifyInstance> {
  const merged: AppConfig = { ...defaultConfig, ...config };
  const app = Fastify({ logger: merged.logger });
  const requestLogger = createLogger({ defaultAdapter: 'api' });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: [...merged.corsOrigins] });
  await app.register(sensible);

  // Observability context: every request gets a requestId + correlationId.
  app.addHook('onRequest', async (req: FastifyRequest) => {
    const correlationId = (req.headers['x-correlation-id'] as string | undefined) ?? undefined;
    const ctx = createContext(correlationId);
    // Store context on the request for downstream use.
    (req as unknown as { _obsCtx: typeof ctx })._obsCtx = ctx;
    runWithContext(ctx, () => {
      requestLogger.info('request start', {
        method: req.method,
        url: req.url,
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
      });
    });
  });

  app.addHook('onResponse', async (req: FastifyRequest, reply: { statusCode: number }) => {
    const ctx = (req as unknown as { _obsCtx?: ReturnType<typeof createContext> })._obsCtx;
    if (ctx) {
      runWithContext(ctx, () => {
        requestLogger.info('request end', {
          method: req.method,
          url: req.url,
          statusCode: reply.statusCode,
          requestId: ctx.requestId,
          correlationId: ctx.correlationId,
        });
      });
    }
  });

  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(versionRoutes, { prefix: '/version' });

  if (merged.hermes) {
    await app.register(hermesRoutes, { prefix: '/v1', hermes: merged.hermes });
  }

  return app;
}
