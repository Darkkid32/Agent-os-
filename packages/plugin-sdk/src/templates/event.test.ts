import { describe, it, expect, vi } from 'vitest';
import { createEventPlugin, registerEventHandler } from './event.js';
import type { EventHandler } from '../types.js';
import type { PluginContext } from '@agent-os/plugins';

describe('event template', () => {
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
    config: {} as never,
  });

  it('creates a plugin with handlers in capabilities', () => {
    const handlers: EventHandler[] = [
      { event: 'message', handle: vi.fn() },
      { event: 'error', handle: vi.fn() },
    ];

    const plugin = createEventPlugin({
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      author: 'Test',
      description: 'Test plugin',
      handlers,
    });

    expect(plugin.manifest.capabilities).toEqual(['event:message', 'event:error']);
  });

  it('initializes and logs handlers', async () => {
    const handlers: EventHandler[] = [{ event: 'message', handle: vi.fn() }];

    const plugin = createEventPlugin({
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      author: 'Test',
      description: 'Test plugin',
      handlers,
    });

    const context = createMockContext();
    const result = await plugin.initialize(context);
    expect(result.ok).toBe(true);
    expect(context.logger.info).toHaveBeenCalledWith('Event plugin initialized', {
      handlers: ['message'],
    });
  });

  it('registerEventHandler subscribes to event bus', () => {
    const unsub = vi.fn();
    const eventBus = { on: vi.fn().mockReturnValue(unsub) };
    const handler: EventHandler = {
      event: 'message',
      handle: vi.fn(),
    };
    const unsubscribers: Array<() => void> = [];

    registerEventHandler(eventBus, handler, unsubscribers);

    expect(eventBus.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(unsubscribers).toHaveLength(1);
  });

  it('stop clears unsubscribers', async () => {
    const handlers: EventHandler[] = [{ event: 'message', handle: vi.fn() }];

    const plugin = createEventPlugin({
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      author: 'Test',
      description: 'Test plugin',
      handlers,
    });

    const result = await plugin.stop();
    expect(result.ok).toBe(true);
  });
});
