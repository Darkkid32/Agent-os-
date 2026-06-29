/**
 * Agent OS API server entry-point.
 * Phase 1.1 boots Fastify, exposes health/version, and shuts down on SIGTERM.
 */

import { createLogger } from '@agent-os/observability';
import { buildApp } from './app.js';
import { PACKAGE_VERSION } from './version.js';

const logger = createLogger({ defaultAdapter: 'api' });

const HOST = process.env['HOST'] ?? '0.0.0.0';
const PORT = Number.parseInt(process.env['PORT'] ?? '4000', 10);

async function main(): Promise<void> {
  const app = await buildApp();
  await app.listen({ host: HOST, port: PORT });
  logger.info('api started', { host: HOST, port: PORT });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      logger.info('shutting down api', { signal });
      void app.close().then(() => {
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
