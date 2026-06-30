import { describe, it, expect, vi } from 'vitest';
import { createMetricsLoggerPlugin } from './metrics-logger.js';
import type { PluginContext } from '@agent-os/plugins';

describe('metrics-logger example', () => {
  const createMockContext = (): PluginContext => ({
    hermes: {} as never,
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      log: vi.fn(),
      child: vi.fn().mockReturnThis(),
      flush: vi.fn(),
      close: vi.fn(),
      formatEntry: vi.fn(),
    } as unknown as PluginContext['logger'],
    metrics: {} as never,
    tracer: {} as never,
    eventBus: {} as never,
    config: {
      get: vi.fn(),
      require: vi.fn(),
      has: vi.fn().mockReturnValue(false),
      all: vi.fn().mockReturnValue({}),
      schema: vi.fn().mockReturnValue(undefined),
    },
  });

  it('creates a plugin with correct manifest', () => {
    const plugin = createMetricsLoggerPlugin();
    expect(plugin.manifest.id).toBe('metrics-logger');
    expect(plugin.manifest.name).toBe('Metrics Logger Plugin');
    expect(plugin.manifest.version).toBe('1.0.0');
    expect(plugin.manifest.capabilities).toEqual(['metrics', 'monitoring']);
  });

  it('initializes with default options', async () => {
    const plugin = createMetricsLoggerPlugin();
    const context = createMockContext();

    const result = await plugin.initialize(context);
    expect(result.ok).toBe(true);
    expect(context.logger.info).toHaveBeenCalledWith('Metrics Logger plugin initialized', {
      intervalMs: 10000,
      prefix: 'agent_os',
    });
  });

  it('initializes with custom options', async () => {
    const plugin = createMetricsLoggerPlugin({ intervalMs: 5000, prefix: 'custom' });
    const context = createMockContext();

    const result = await plugin.initialize(context);
    expect(result.ok).toBe(true);
    expect(context.logger.info).toHaveBeenCalledWith('Metrics Logger plugin initialized', {
      intervalMs: 5000,
      prefix: 'custom',
    });
  });

  it('starts and logs message', async () => {
    const plugin = createMetricsLoggerPlugin({ intervalMs: 1000 });
    const context = createMockContext();

    await plugin.initialize(context);
    const result = await plugin.start();
    expect(result.ok).toBe(true);
    expect(context.logger.info).toHaveBeenCalledWith('Metrics Logger started', {
      intervalMs: 1000,
    });
  });

  it('stops and clears interval', async () => {
    const plugin = createMetricsLoggerPlugin();
    const context = createMockContext();

    await plugin.initialize(context);
    await plugin.start();
    const result = await plugin.stop();
    expect(result.ok).toBe(true);
    expect(context.logger.info).toHaveBeenCalledWith('Metrics Logger stopped');
  });

  it('dispose clears interval', async () => {
    const plugin = createMetricsLoggerPlugin();
    const context = createMockContext();

    await plugin.initialize(context);
    await plugin.start();
    const result = await plugin.dispose();
    expect(result.ok).toBe(true);
  });
});
