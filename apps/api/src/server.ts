/**
 * Agent OS API server entry-point.
 * Phase 1.1 boots Fastify, exposes health/version, and shuts down on SIGTERM.
 */

import { buildApp } from './app.js';
import { PACKAGE_VERSION } from './version.js';

const HOST = process.env['HOST'] ?? '0.0.0.0';
const PORT = Number.parseInt(process.env['PORT'] ?? '4000', 10);

async function main(): Promise<void> {
  const app = await buildApp();
  await app.listen({ host: HOST, port: PORT });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      app.log.info({ signal }, 'shutting down api');
      void app.close().then(() => {
        process.exit(0);
      });
    });
  }
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('api failed to start', err);
  process.exit(1);
});

export { PACKAGE_VERSION };
