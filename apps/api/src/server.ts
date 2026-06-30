/**
 * Agent OS API server entry-point.
 * Phase 8.1 boots Fastify, exposes health/version, and shuts down on SIGTERM/SIGINT
 * with a configurable timeout to prevent hanging.
 */

import { createLogger, createMetricRegistry, type MetricRegistry } from '@agent-os/observability';
import {
  createHermes,
  validateConfig,
  type Hermes,
  type HermesConfigInput,
} from '@agent-os/hermes';
import { buildApp } from './app.js';
import { PACKAGE_VERSION } from './version.js';

const logger = createLogger({ defaultAdapter: 'api' });

const HOST = process.env['HOST'] ?? '0.0.0.0';
const PORT = Number.parseInt(process.env['PORT'] ?? '4000', 10);
const SHUTDOWN_TIMEOUT_MS = Number.parseInt(process.env['SHUTDOWN_TIMEOUT_MS'] ?? '30000', 10);

let isShuttingDown = false;

const nonEmptyEnv = (name: string, fallback: string): string => {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
};

const hermesConfigInput = (): HermesConfigInput => ({
  NODE_ENV: process.env['NODE_ENV'],
  LOG_LEVEL: process.env['LOG_LEVEL'],
  OPENROUTER_API_KEY: nonEmptyEnv('OPENROUTER_API_KEY', 'not-configured'),
  DATABASE_URL: nonEmptyEnv('DATABASE_URL', 'postgres://agent_os:agent_os@localhost:5432/agent_os'),
  REDIS_URL: nonEmptyEnv('REDIS_URL', 'redis://localhost:6379'),
  OTEL_ENABLED: process.env['OTEL_ENABLED'],
  OTEL_EXPORTER_ENDPOINT:
    process.env['OTEL_EXPORTER_ENDPOINT'] ?? process.env['OTEL_EXPORTER_OTLP_ENDPOINT'],
  HERMES_MODULES_DIR: process.env['HERMES_MODULES_DIR'],
  HERMES_SHUTDOWN_TIMEOUT_MS: process.env['HERMES_SHUTDOWN_TIMEOUT_MS'],
});

const createApiHermes = (metricRegistry: MetricRegistry): Hermes => {
  const config = validateConfig(hermesConfigInput());
  if (!config.ok) {
    throw new Error(`api Hermes config validation failed: ${config.error.message}`);
  }
  return createHermes(config.value, { metricRegistry });
};

const stopHermes = async (hermes: Hermes): Promise<void> => {
  const result = await hermes.stop();
  if (!result.ok) {
    logger.warn('hermes shutdown returned error', { error: result.error.message });
  }
};

async function main(): Promise<void> {
  const metricRegistry = createMetricRegistry();
  const hermes = createApiHermes(metricRegistry);
  const startResult = await hermes.start();
  if (!startResult.ok) {
    throw startResult.error;
  }

  const app = await buildApp({ hermes, metricRegistry });
  await app.listen({ host: HOST, port: PORT });
  logger.info('api started', { host: HOST, port: PORT });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.info('shutting down api', { signal, timeoutMs: SHUTDOWN_TIMEOUT_MS });

      const shutdownTimer = setTimeout(() => {
        logger.error('shutdown timed out, forcing exit');
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS);
      shutdownTimer.unref();

      void stopHermes(hermes)
        .then(() => app.close())
        .then(() => {
          clearTimeout(shutdownTimer);
          logger.info('api shutdown complete');
          process.exit(0);
        });
    });
  }
}

main().catch((err: unknown) => {
  logger.fatal('api failed to start', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});

export { PACKAGE_VERSION };
