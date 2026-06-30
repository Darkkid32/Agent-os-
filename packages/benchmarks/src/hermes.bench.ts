/**
 * Hermes lifecycle benchmarks.
 *
 * Measures: createHermes, start, stop, status, health, registerModule.
 */

import { bench, describe } from 'vitest';
import { createHermes, type HermesModuleSpec } from '@agent-os/hermes';
import { createBenchLogger } from './utils.js';

const logger = createBenchLogger();

const defaultConfig = {
  nodeEnv: 'test' as const,
  logLevel: 'fatal',
  openrouterApiKey: 'bench-key',
  databaseUrl: 'postgresql://localhost:5432/bench',
  redisUrl: 'redis://localhost:6379',
  otelEnabled: false,
  otelExporterEndpoint: undefined,
  hermesModulesDir: '.',
  hermesShutdownTimeoutMs: 5000,
};

const createTestModule = (name: string, deps: string[] = []): HermesModuleSpec => ({
  name,
  version: '1.0.0',
  dependencies: deps,
  required: false,
  healthCheck: async () => 'healthy' as const,
  shutdown: async () => {},
});

describe('Hermes', () => {
  bench('createHermes', () => {
    createHermes(defaultConfig, { logger });
  });

  bench('status (idle)', () => {
    const hermes = createHermes(defaultConfig, { logger });
    hermes.status();
  });

  bench('registerModule (1 module)', () => {
    const hermes = createHermes(defaultConfig, { logger });
    hermes.registerModule(createTestModule('bench-mod-1'));
  });

  bench('registerModule (10 modules)', () => {
    const hermes = createHermes(defaultConfig, { logger });
    for (let i = 0; i < 10; i++) {
      hermes.registerModule(
        createTestModule(`bench-mod-${i}`, i > 0 ? [`bench-mod-${i - 1}`] : []),
      );
    }
  });

  bench('start + stop cycle', async () => {
    const hermes = createHermes(defaultConfig, { logger });
    hermes.registerModule(createTestModule('bench-mod'));
    await hermes.start();
    await hermes.stop();
  });

  bench('health (idle)', async () => {
    const hermes = createHermes(defaultConfig, { logger });
    await hermes.health();
  });

  bench('status (after start)', async () => {
    const hermes = createHermes(defaultConfig, { logger });
    hermes.registerModule(createTestModule('bench-mod'));
    await hermes.start();
    hermes.status();
    await hermes.stop();
  });
});
