import { describe, it, expect, vi } from 'vitest';
import { createMinimalPlugin } from './minimal.js';

describe('minimal template', () => {
  it('creates a plugin with manifest', () => {
    const plugin = createMinimalPlugin({
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      author: 'Test',
      description: 'Test plugin',
    });

    expect(plugin.manifest.id).toBe('test');
    expect(plugin.manifest.name).toBe('Test');
    expect(plugin.manifest.version).toBe('1.0.0');
    expect(plugin.manifest.author).toBe('Test');
    expect(plugin.manifest.description).toBe('Test plugin');
    expect(plugin.manifest.capabilities).toEqual([]);
    expect(plugin.manifest.dependencies).toEqual([]);
    expect(plugin.manifest.minimumAgentOSVersion).toBe('0.1.0');
  });

  it('calls onInitialize when initialize is called', async () => {
    const onInitialize = vi.fn().mockResolvedValue(undefined);
    const plugin = createMinimalPlugin({
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      author: 'Test',
      description: 'Test plugin',
      onInitialize,
    });

    const context = {
      hermes: {},
      logger: { info: vi.fn() },
      metrics: {},
      tracer: {},
      eventBus: {},
      config: { get: vi.fn() },
    } as never;

    const result = await plugin.initialize(context);
    expect(result.ok).toBe(true);
    expect(onInitialize).toHaveBeenCalledWith(context);
  });

  it('calls onStart when start is called', async () => {
    const onStart = vi.fn().mockResolvedValue(undefined);
    const plugin = createMinimalPlugin({
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      author: 'Test',
      description: 'Test plugin',
      onStart,
    });

    const result = await plugin.start();
    expect(result.ok).toBe(true);
    expect(onStart).toHaveBeenCalled();
  });

  it('calls onStop when stop is called', async () => {
    const onStop = vi.fn().mockResolvedValue(undefined);
    const plugin = createMinimalPlugin({
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      author: 'Test',
      description: 'Test plugin',
      onStop,
    });

    const result = await plugin.stop();
    expect(result.ok).toBe(true);
    expect(onStop).toHaveBeenCalled();
  });

  it('calls onDispose when dispose is called', async () => {
    const onDispose = vi.fn().mockResolvedValue(undefined);
    const plugin = createMinimalPlugin({
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      author: 'Test',
      description: 'Test plugin',
      onDispose,
    });

    const result = await plugin.dispose();
    expect(result.ok).toBe(true);
    expect(onDispose).toHaveBeenCalled();
  });

  it('returns error when callback throws', async () => {
    const plugin = createMinimalPlugin({
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      author: 'Test',
      description: 'Test plugin',
      onInitialize: vi.fn().mockRejectedValue(new Error('init failed')),
    });

    const context = {
      hermes: {},
      logger: { info: vi.fn() },
      metrics: {},
      tracer: {},
      eventBus: {},
      config: { get: vi.fn() },
    } as never;

    const result = await plugin.initialize(context);
    expect(result.ok).toBe(false);
  });
});
