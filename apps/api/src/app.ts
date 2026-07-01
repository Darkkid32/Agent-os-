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
 *
 * Phase 8.2: optional authentication via `auth` config. When supplied,
 * the auth plugin validates credentials on every non-public route.
 */
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import { InMemoryGraphiti } from '@agent-os/graphiti';
import type { HermesPort } from '@agent-os/hermes';
import {
  createLogger,
  createContext,
  runWithContext,
  createMetricRegistry,
  createAdapterMetrics,
  type MetricRegistry,
} from '@agent-os/observability';
import { addAuth, type AuthConfig } from '@agent-os/auth';
import type { HealthManager, RuntimeDiagnostics } from '@agent-os/runtime';
import { healthRoutes } from './routes/health.js';
import { versionRoutes } from './routes/version.js';
import { hermesRoutes } from './routes/hermes.js';
import { graphRoutes } from './routes/graph.js';
import { missionControlRoutes } from './routes/mission-control.js';

export interface AppConfig {
  readonly logger: boolean | { readonly level: string };
  readonly corsOrigins: readonly string[];
  readonly hermes?: HermesPort;
  readonly metricRegistry?: MetricRegistry;
  readonly auth?: AuthConfig;
  readonly healthManager?: HealthManager;
  readonly diagnostics?: RuntimeDiagnostics;
  readonly graph?: InMemoryGraphiti;
}

export const defaultConfig: AppConfig = {
  logger: { level: process.env['LOG_LEVEL'] ?? 'info' },
  corsOrigins: ['http://localhost:3000'],
};

export async function buildApp(config: Partial<AppConfig> = {}): Promise<FastifyInstance> {
  const merged: AppConfig = { ...defaultConfig, ...config };
  const app = Fastify({ logger: merged.logger });
  const requestLogger = createLogger({ defaultAdapter: 'api' });
  const metricRegistry = merged.metricRegistry ?? createMetricRegistry();
  const metrics = createAdapterMetrics(metricRegistry, 'api');
  const graph = merged.graph ?? new InMemoryGraphiti();

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: [...merged.corsOrigins] });
  await app.register(sensible);

  // Authentication: validate credentials on non-public routes when configured.
  if (merged.auth) {
    addAuth(app, merged.auth);
  }

  // Observability context: every request gets a requestId + correlationId.
  app.addHook('onRequest', async (req: FastifyRequest) => {
    const correlationId = (req.headers['x-correlation-id'] as string | undefined) ?? undefined;
    const ctx = createContext(correlationId);
    // Store context on the request for downstream use.
    (req as unknown as { _obsCtx: typeof ctx })._obsCtx = ctx;
    metrics.requestsTotal.inc();
    metrics.activeRequests.set(metrics.activeRequests.getValue() + 1);
    (req as unknown as { _startMs: number })._startMs = performance.now();
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
    const startMs = (req as unknown as { _startMs?: number })._startMs;
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
    metrics.activeRequests.set(Math.max(0, metrics.activeRequests.getValue() - 1));
    if (startMs) metrics.requestDurationMs.observe(performance.now() - startMs);
    if (reply.statusCode >= 400) metrics.errorsTotal.inc();
  });

  await app.register(healthRoutes, {
    prefix: '/health',
    healthManager: merged.healthManager,
    diagnostics: merged.diagnostics,
  });
  await app.register(versionRoutes, { prefix: '/version' });

  if (merged.hermes) {
    await app.register(hermesRoutes, {
      prefix: '/v1',
      hermes: merged.hermes,
      metricRegistry,
    });

    await app.register(graphRoutes, {
      prefix: '/v1/graph',
      graph,
    });

    await app.register(missionControlRoutes, {
      prefix: '/v1',
      hermes: merged.hermes,
      graph,
    });
  }

  return app;
}
