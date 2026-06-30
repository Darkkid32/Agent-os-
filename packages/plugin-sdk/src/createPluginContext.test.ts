import { describe, it, expect, vi } from 'vitest';
import { createPluginContext } from './createPluginContext.js';
import type { PluginContext } from '@agent-os/plugins';

describe('createPluginContext', () => {
  const createMockHermes = () => ({
    start: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    stop: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    status: vi.fn().mockReturnValue('running'),
    health: vi.fn().mockResolvedValue({ status: 'healthy' }),
    registerModule: vi.fn().mockReturnValue({ ok: true, value: undefined }),
    unregisterModule: vi.fn().mockReturnValue({ ok: true, value: undefined }),
  });

  const createMockLogger = (): PluginContext['logger'] =>
    ({
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
    }) as unknown as PluginContext['logger'];

  const createMockMetrics = (): PluginContext['metrics'] =>
    ({
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
    }) as unknown as PluginContext['metrics'];

  const createMockTracer = (): PluginContext['tracer'] =>
    ({
      startSpan: vi.fn().mockReturnValue({
        end: vi.fn(),
        setStatus: vi.fn(),
        setAttribute: vi.fn(),
      }),
      startActiveSpan: vi.fn().mockImplementation((_name: string, fn: (span: unknown) => void) => {
        const span = { end: vi.fn(), setStatus: vi.fn(), setAttribute: vi.fn() };
        fn(span);
        return span;
      }),
    }) as unknown as PluginContext['tracer'];

  const createMockEventBus = (): PluginContext['eventBus'] =>
    ({
      publish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockReturnValue('sub-1'),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    }) as unknown as PluginContext['eventBus'];

  it('creates a context with all services', () => {
    const context = createPluginContext({
      hermes: createMockHermes(),
      logger: createMockLogger(),
      metrics: createMockMetrics(),
      tracer: createMockTracer(),
      eventBus: createMockEventBus(),
      pluginId: 'test-plugin',
    });

    expect(context.hermes).toBeDefined();
    expect(context.logger).toBeDefined();
    expect(context.metrics).toBeDefined();
    expect(context.tracer).toBeDefined();
    expect(context.eventBus).toBeDefined();
    expect(context.config).toBeDefined();
  });

  it('creates a context with config values', () => {
    const context = createPluginContext({
      hermes: createMockHermes(),
      logger: createMockLogger(),
      metrics: createMockMetrics(),
      tracer: createMockTracer(),
      eventBus: createMockEventBus(),
      pluginId: 'test-plugin',
      configValues: { host: 'localhost', port: 3000 },
    });

    expect(context.config.get('host')).toBe('localhost');
    expect(context.config.get('port')).toBe(3000);
  });

  it('creates a context with config schema', () => {
    const context = createPluginContext({
      hermes: createMockHermes(),
      logger: createMockLogger(),
      metrics: createMockMetrics(),
      tracer: createMockTracer(),
      eventBus: createMockEventBus(),
      pluginId: 'test-plugin',
      configSchema: {
        host: { type: 'string', default: 'localhost' },
        port: { type: 'number', default: 3000 },
      },
    });

    expect(context.config.schema()).toEqual({
      host: { type: 'string', default: 'localhost' },
      port: { type: 'number', default: 3000 },
    });
  });

  it('creates a context with empty config when no values provided', () => {
    const context = createPluginContext({
      hermes: createMockHermes(),
      logger: createMockLogger(),
      metrics: createMockMetrics(),
      tracer: createMockTracer(),
      eventBus: createMockEventBus(),
      pluginId: 'test-plugin',
    });

    expect(context.config.has('anything')).toBe(false);
    expect(context.config.all()).toEqual({});
  });
});
