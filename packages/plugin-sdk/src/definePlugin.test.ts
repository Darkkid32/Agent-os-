import { describe, it, expect, vi } from 'vitest';
import { definePlugin } from './definePlugin.js';
import type { PluginContext } from '@agent-os/plugins';

describe('definePlugin', () => {
  const createMockContext = (): PluginContext => ({
    hermes: {
      start: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      stop: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      status: vi.fn().mockReturnValue('running'),
      health: vi.fn().mockResolvedValue({ status: 'healthy' }),
      registerModule: vi.fn().mockReturnValue({ ok: true, value: undefined }),
      unregisterModule: vi.fn().mockReturnValue({ ok: true, value: undefined }),
    },
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
    metrics: {
      counter: vi.fn().mockReturnValue({
        inc: vi.fn(),
        labels: vi.fn().mockReturnThis(),
        getValue: vi.fn().mockReturnValue(0),
      }),
      gauge: vi.fn().mockReturnValue({
        set: vi.fn(),
        getValue: vi.fn().mockReturnValue(0),
        labels: vi.fn().mockReturnThis(),
      }),
      histogram: vi.fn().mockReturnValue({
        observe: vi.fn(),
        labels: vi.fn().mockReturnThis(),
      }),
      getMetrics: vi.fn().mockReturnValue([]),
    } as unknown as PluginContext['metrics'],
    tracer: {
      startSpan: vi
        .fn()
        .mockReturnValue({ end: vi.fn(), setStatus: vi.fn(), setAttribute: vi.fn() }),
      startActiveSpan: vi.fn().mockImplementation((_name: string, fn: (span: unknown) => void) => {
        const span = { end: vi.fn(), setStatus: vi.fn(), setAttribute: vi.fn() };
        fn(span);
        return span;
      }),
    } as unknown as PluginContext['tracer'],
    eventBus: {
      publish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockReturnValue('sub-1'),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    } as unknown as PluginContext['eventBus'],
    config: {
      get: vi.fn(),
      require: vi.fn(),
      has: vi.fn().mockReturnValue(false),
      all: vi.fn().mockReturnValue({}),
      schema: vi.fn().mockReturnValue(undefined),
    },
  });

  it('creates a plugin with manifest', () => {
    const plugin = definePlugin({
      manifest: {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        author: 'Test',
        description: 'Test plugin',
        capabilities: [],
        dependencies: [],
        minimumAgentOSVersion: '0.1.0',
      },
      initialize: vi.fn().mockResolvedValue(undefined),
    });

    expect(plugin.manifest.id).toBe('test');
    expect(plugin.manifest.name).toBe('Test');
  });

  it('calls initialize and returns ok', async () => {
    const initFn = vi.fn().mockResolvedValue(undefined);
    const plugin = definePlugin({
      manifest: {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        author: 'Test',
        description: 'Test plugin',
        capabilities: [],
        dependencies: [],
        minimumAgentOSVersion: '0.1.0',
      },
      initialize: initFn,
    });

    const context = createMockContext();
    const result = await plugin.initialize(context);

    expect(result.ok).toBe(true);
    expect(initFn).toHaveBeenCalledWith(context);
  });

  it('returns error when initialize throws', async () => {
    const plugin = definePlugin({
      manifest: {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        author: 'Test',
        description: 'Test plugin',
        capabilities: [],
        dependencies: [],
        minimumAgentOSVersion: '0.1.0',
      },
      initialize: vi.fn().mockRejectedValue(new Error('init failed')),
    });

    const context = createMockContext();
    const result = await plugin.initialize(context);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('init failed');
    }
  });

  it('calls start and returns ok', async () => {
    const startFn = vi.fn().mockResolvedValue(undefined);
    const plugin = definePlugin({
      manifest: {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        author: 'Test',
        description: 'Test plugin',
        capabilities: [],
        dependencies: [],
        minimumAgentOSVersion: '0.1.0',
      },
      initialize: vi.fn().mockResolvedValue(undefined),
      start: startFn,
    });

    const result = await plugin.start();
    expect(result.ok).toBe(true);
    expect(startFn).toHaveBeenCalled();
  });

  it('calls stop and returns ok', async () => {
    const stopFn = vi.fn().mockResolvedValue(undefined);
    const plugin = definePlugin({
      manifest: {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        author: 'Test',
        description: 'Test plugin',
        capabilities: [],
        dependencies: [],
        minimumAgentOSVersion: '0.1.0',
      },
      initialize: vi.fn().mockResolvedValue(undefined),
      stop: stopFn,
    });

    const result = await plugin.stop();
    expect(result.ok).toBe(true);
    expect(stopFn).toHaveBeenCalled();
  });

  it('calls dispose and returns ok', async () => {
    const disposeFn = vi.fn().mockResolvedValue(undefined);
    const plugin = definePlugin({
      manifest: {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        author: 'Test',
        description: 'Test plugin',
        capabilities: [],
        dependencies: [],
        minimumAgentOSVersion: '0.1.0',
      },
      initialize: vi.fn().mockResolvedValue(undefined),
      dispose: disposeFn,
    });

    const result = await plugin.dispose();
    expect(result.ok).toBe(true);
    expect(disposeFn).toHaveBeenCalled();
  });

  it('returns ok for optional lifecycle methods', async () => {
    const plugin = definePlugin({
      manifest: {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        author: 'Test',
        description: 'Test plugin',
        capabilities: [],
        dependencies: [],
        minimumAgentOSVersion: '0.1.0',
      },
      initialize: vi.fn().mockResolvedValue(undefined),
    });

    const startResult = await plugin.start();
    const stopResult = await plugin.stop();
    const disposeResult = await plugin.dispose();

    expect(startResult.ok).toBe(true);
    expect(stopResult.ok).toBe(true);
    expect(disposeResult.ok).toBe(true);
  });
});
