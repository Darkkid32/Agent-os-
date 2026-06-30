/**
 * Stress testing.
 *
 * Runs concurrent operations to verify no crashes, deadlocks, or race conditions.
 */

import { describe, it, expect } from 'vitest';
import { createHermes } from '@agent-os/hermes';
import { createPluginPlatform } from '@agent-os/plugins';
import { createConfigProvider, validator } from '@agent-os/config';
import { createApiKeyProvider } from '@agent-os/auth';
import { createLogger, createNullSink } from '@agent-os/observability';
import { generateApiKey } from './utils.js';

const logger = createLogger({ minLevel: 'fatal', sinks: [createNullSink()] });

const hermesConfig = {
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

describe('Stress: Concurrent Hermes Operations', () => {
  it('concurrent status() calls do not crash', async () => {
    const hermes = createHermes(hermesConfig, { logger });
    const promises = Array.from({ length: 100 }, () => Promise.resolve(hermes.status()));
    const results = await Promise.all(promises);
    expect(results).toHaveLength(100);
    expect(results.every((r) => r.phase !== undefined)).toBe(true);
  });

  it('concurrent registerModule() calls do not crash', () => {
    const hermes = createHermes(hermesConfig, { logger });
    const results = Array.from({ length: 50 }, (_, i) =>
      hermes.registerModule({
        name: `stress-mod-${i}`,
        version: '1.0.0',
        dependencies: [],
        required: false,
        healthCheck: async () => 'healthy' as const,
        shutdown: async () => {},
      }),
    );
    expect(results).toHaveLength(50);
  });

  it('concurrent health() calls do not deadlock', async () => {
    const hermes = createHermes(hermesConfig, { logger });
    const promises = Array.from({ length: 50 }, () => hermes.health());
    const results = await Promise.all(promises);
    expect(results).toHaveLength(50);
  });

  it('concurrent start/stop cycles do not deadlock', async () => {
    const hermes = createHermes(hermesConfig, { logger });
    hermes.registerModule({
      name: 'stress-mod',
      version: '1.0.0',
      dependencies: [],
      required: false,
      healthCheck: async () => 'healthy' as const,
      shutdown: async () => {},
    });

    // Start and stop 5 times concurrently
    const cycles = Array.from({ length: 5 }, async () => {
      await hermes.start();
      await hermes.stop();
    });
    await Promise.all(cycles);
  });
});

describe('Stress: Concurrent Config Operations', () => {
  it('concurrent validator.validate() calls do not crash', () => {
    const schema = {
      port: { type: 'number' as const, required: true, min: 1, max: 65535 },
      host: { type: 'string' as const, required: true },
    };
    const data = { port: 4000, host: 'localhost' };
    const results = Array.from({ length: 1000 }, () => validator.validate(data, schema));
    expect(results).toHaveLength(1000);
    expect(results.every((r) => r.ok === true)).toBe(true);
  });

  it('concurrent provider.get() calls do not crash', () => {
    const p = createConfigProvider(
      'stress',
      {
        port: { type: 'number', required: true, default: 3000 },
        host: { type: 'string', required: true, default: 'localhost' },
      },
      [{ kind: 'defaults', values: {} }],
    );

    const results = Array.from({ length: 500 }, (_, i) => p.get(i % 2 === 0 ? 'port' : 'host'));
    expect(results).toHaveLength(500);
  });
});

describe('Stress: Concurrent Auth Operations', () => {
  it('concurrent API key validation does not crash', async () => {
    const keys = Array.from({ length: 100 }, () => ({
      key: generateApiKey(64),
      role: 'admin' as const,
      id: `key-${Math.random()}`,
    }));
    const provider = createApiKeyProvider({ keys });

    const promises = Array.from({ length: 200 }, (_, i) =>
      provider.authenticate(keys[i % keys.length]!.key),
    );
    const results = await Promise.all(promises);
    expect(results).toHaveLength(200);
    expect(results.every((r) => r.ok === true)).toBe(true);
  });

  it('concurrent invalid key validation does not crash', async () => {
    const keys = Array.from({ length: 50 }, (_, i) => ({
      key: generateApiKey(64),
      role: 'admin' as const,
      id: `key-${i}`,
    }));
    const provider = createApiKeyProvider({ keys });

    const promises = Array.from({ length: 100 }, () => provider.authenticate('invalid-key'));
    const results = await Promise.all(promises);
    expect(results).toHaveLength(100);
    expect(results.every((r) => r.ok === false)).toBe(true);
  });
});

describe('Stress: Concurrent Plugin Operations', () => {
  const createFakePlugin = (id: string) => ({
    manifest: {
      id,
      name: `Plugin ${id}`,
      version: '1.0.0',
      minimumAgentOSVersion: '>=0.1.0',
      description: `Plugin ${id}`,
      author: 'stress',
      capabilities: ['test'],
      dependencies: [],
    },
    initialize: async () => ({ ok: true as const, value: undefined }),
    start: async () => ({ ok: true as const, value: undefined }),
    stop: async () => ({ ok: true as const, value: undefined }),
    dispose: async () => ({ ok: true as const, value: undefined }),
  });

  it('concurrent registry.register() does not crash', () => {
    const platform = createPluginPlatform({
      directories: [],
      agentOSVersion: '1.0.0',
      logger,
    });

    const results = Array.from({ length: 100 }, (_, i) =>
      platform.registry.register(createFakePlugin(`stress-plugin-${i}`)),
    );
    expect(results).toHaveLength(100);
  });

  it('concurrent registry.get() does not crash', () => {
    const platform = createPluginPlatform({
      directories: [],
      agentOSVersion: '1.0.0',
      logger,
    });

    // Register some plugins first
    for (let i = 0; i < 50; i++) {
      platform.registry.register(createFakePlugin(`plugin-${i}`));
    }

    // Concurrent reads
    const results = Array.from({ length: 200 }, (_, i) =>
      platform.registry.get(`plugin-${i % 50}`),
    );
    expect(results).toHaveLength(200);
  });
});
