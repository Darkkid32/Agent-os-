/**
 * Memory profiling tests.
 *
 * Measures startup memory, idle memory, shutdown cleanup, and plugin loading impact.
 * Detects leaks during repeated startup/shutdown cycles.
 */

import { describe, it, expect } from 'vitest';
import { createHermes } from '@agent-os/hermes';
import { createPluginPlatform } from '@agent-os/plugins';
import { createLogger, createNullSink } from '@agent-os/observability';
import { measureHeapMb } from './utils.js';

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

describe('Memory Profiling', () => {
  it('baseline memory measurement', () => {
    const heapBefore = measureHeapMb();
    expect(heapBefore).toBeGreaterThan(0);
    expect(heapBefore).toBeLessThan(500); // sanity check
  });

  it('Hermes startup does not leak excessive memory', () => {
    const heapBefore = measureHeapMb();
    const hermes = createHermes(hermesConfig, { logger });
    hermes.registerModule({
      name: 'bench-mod',
      version: '1.0.0',
      dependencies: [],
      required: false,
      healthCheck: async () => 'healthy' as const,
      shutdown: async () => {},
    });
    const heapAfter = measureHeapMb();
    const delta = heapAfter - heapBefore;
    expect(delta).toBeLessThan(10); // should not allocate more than 10MB
  });

  it('repeated startup/shutdown does not leak memory', async () => {
    global.gc?.();
    const heapBaseline = measureHeapMb();
    const iterations = 10;

    for (let i = 0; i < iterations; i++) {
      const hermes = createHermes(hermesConfig, { logger });
      hermes.registerModule({
        name: `bench-mod-${i}`,
        version: '1.0.0',
        dependencies: [],
        required: false,
        healthCheck: async () => 'healthy' as const,
        shutdown: async () => {},
      });
      await hermes.start();
      await hermes.stop();
    }

    global.gc?.();
    const heapAfter = measureHeapMb();
    const delta = heapAfter - heapBaseline;
    // After 10 cycles, memory should not grow by more than 20MB
    expect(delta).toBeLessThan(20);
  });

  it('Plugin platform does not leak memory on creation', () => {
    const heapBefore = measureHeapMb();
    createPluginPlatform({
      directories: [],
      agentOSVersion: '1.0.0',
      logger,
    });
    const heapAfter = measureHeapMb();
    const delta = heapAfter - heapBefore;
    expect(delta).toBeLessThan(5);
  });

  it('multiple plugin platforms do not leak', () => {
    const heapBefore = measureHeapMb();
    const platforms = Array.from({ length: 10 }, () =>
      createPluginPlatform({
        directories: [],
        agentOSVersion: '1.0.0',
        logger,
      }),
    );
    expect(platforms).toHaveLength(10);
    const heapAfter = measureHeapMb();
    const delta = heapAfter - heapBefore;
    expect(delta).toBeLessThan(10);
  });

  it('memory stabilizes after warmup', async () => {
    global.gc?.();
    const readings: number[] = [];

    for (let i = 0; i < 5; i++) {
      const hermes = createHermes(hermesConfig, { logger });
      await hermes.start();
      await hermes.stop();
      global.gc?.();
      readings.push(measureHeapMb());
    }

    // After warmup, readings should stabilize (last 3 within 5MB of each other)
    const lastThree = readings.slice(-3);
    const max = Math.max(...lastThree);
    const min = Math.min(...lastThree);
    expect(max - min).toBeLessThan(5);
  });
});
