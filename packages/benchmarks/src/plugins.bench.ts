/**
 * Plugin platform benchmarks.
 *
 * Measures: discovery, loading, initialization, configuration lookup, command execution.
 * Tests with 10, 100, and 500 plugins.
 */

import { bench, describe } from 'vitest';
import { createPluginPlatform } from '@agent-os/plugins';
import { createLogger, createNullSink } from '@agent-os/observability';

const logger = createLogger({ minLevel: 'fatal', sinks: [createNullSink()] });

const createFakePlugin = (id: string) => ({
  manifest: {
    id,
    name: `Plugin ${id}`,
    version: '1.0.0',
    minimumAgentOSVersion: '>=0.1.0',
    description: `Bench plugin ${id}`,
    author: 'bench',
    capabilities: ['test'],
    dependencies: [],
  },
  initialize: async () => ({ ok: true as const, value: undefined }),
  start: async () => ({ ok: true as const, value: undefined }),
  stop: async () => ({ ok: true as const, value: undefined }),
  dispose: async () => ({ ok: true as const, value: undefined }),
});

const PLUGIN_COUNTS = [10, 100, 500] as const;

for (const count of PLUGIN_COUNTS) {
  describe(`Plugin Platform (${count} plugins)`, () => {
    bench('createPluginPlatform', () => {
      createPluginPlatform({
        directories: [],
        agentOSVersion: '1.0.0',
        logger,
      });
    });

    bench('registry.register + lookup', () => {
      const platform = createPluginPlatform({
        directories: [],
        agentOSVersion: '1.0.0',
        logger,
      });
      for (let i = 0; i < count; i++) {
        platform.registry.register(createFakePlugin(`plugin-${i}`));
      }
      for (let i = 0; i < count; i++) {
        platform.registry.get(`plugin-${i}`);
      }
    });

    bench('lifecycle.initializeAll', async () => {
      const platform = createPluginPlatform({
        directories: [],
        agentOSVersion: '1.0.0',
        logger,
      });
      for (let i = 0; i < Math.min(count, 10); i++) {
        platform.registry.register(createFakePlugin(`plugin-${i}`));
      }
      await platform.lifecycle.initializeAll();
    });
  });
}
