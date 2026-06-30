/**
 * Agent OS API server entry-point.
 * Phase 8.1 boots Fastify, exposes health/version, and shuts down on SIGTERM/SIGINT
 * with a configurable timeout to prevent hanging.
 */

import { createLogger } from '@agent-os/observability';
import { buildApp } from './app.js';
import { PACKAGE_VERSION } from './version.js';

const logger = createLogger({ defaultAdapter: 'api' });

const HOST = process.env['HOST'] ?? '0.0.0.0';
const PORT = Number.parseInt(process.env['PORT'] ?? '4000', 10);
const SHUTDOWN_TIMEOUT_MS = Number.parseInt(process.env['SHUTDOWN_TIMEOUT_MS'] ?? '30000', 10);

let isShuttingDown = false;

async function main(): Promise<void> {
  const app = await buildApp();
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

      void app.close().then(() => {
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
