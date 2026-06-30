import { describe, it, expect, vi } from 'vitest';
import { createHelloWorldPlugin } from './hello-world.js';
import type { PluginContext } from '@agent-os/plugins';

describe('hello-world example', () => {
  const createMockContext = (configValues: Record<string, unknown> = {}): PluginContext => ({
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
      get: vi.fn().mockImplementation((key: string) => configValues[key]),
      require: vi.fn(),
      has: vi.fn().mockImplementation((key: string) => key in configValues),
      all: vi.fn().mockReturnValue(configValues),
      schema: vi.fn().mockReturnValue(undefined),
    },
  });

  it('creates a plugin with correct manifest', () => {
    const plugin = createHelloWorldPlugin();
    expect(plugin.manifest.id).toBe('hello-world');
    expect(plugin.manifest.name).toBe('Hello World Plugin');
    expect(plugin.manifest.version).toBe('1.0.0');
    expect(plugin.manifest.capabilities).toEqual(['greeting']);
  });

  it('initializes with default greeting', async () => {
    const plugin = createHelloWorldPlugin();
    const context = createMockContext();

    const result = await plugin.initialize(context);
    expect(result.ok).toBe(true);
    expect(context.logger.info).toHaveBeenCalledWith('Hello World plugin initialized', {
      greeting: 'Hello',
    });
  });

  it('initializes with custom greeting from config', async () => {
    const plugin = createHelloWorldPlugin();
    const context = createMockContext({ greeting: 'Hola' });

    const result = await plugin.initialize(context);
    expect(result.ok).toBe(true);
    expect(context.logger.info).toHaveBeenCalledWith('Hello World plugin initialized', {
      greeting: 'Hola',
    });
  });

  it('starts and logs greeting', async () => {
    const plugin = createHelloWorldPlugin({ greeting: 'Bonjour' });
    const context = createMockContext();

    await plugin.initialize(context);
    const result = await plugin.start();
    expect(result.ok).toBe(true);
    expect(context.logger.info).toHaveBeenCalledWith('Bonjour, World!');
  });

  it('stops and logs message', async () => {
    const plugin = createHelloWorldPlugin();
    const context = createMockContext();

    await plugin.initialize(context);
    const result = await plugin.stop();
    expect(result.ok).toBe(true);
    expect(context.logger.info).toHaveBeenCalledWith('Hello World plugin stopped');
  });
});
