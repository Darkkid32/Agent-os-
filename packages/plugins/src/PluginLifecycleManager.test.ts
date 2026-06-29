import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPluginRegistry } from './PluginRegistry.js';
import { createPluginLifecycleManager } from './PluginLifecycleManager.js';
import type { AgentPlugin, PluginManifest, PluginRegistry, Logger } from './types.js';

const createTestManifest = (overrides: Partial<PluginManifest> = {}): PluginManifest => ({
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  author: 'Test Author',
  description: 'A test plugin',
  capabilities: ['test'],
  dependencies: [],
  minimumAgentOSVersion: '0.1.0',
  ...overrides,
});

const createTestPlugin = (manifestOverrides: Partial<PluginManifest> = {}): AgentPlugin => ({
  manifest: createTestManifest(manifestOverrides),
  initialize: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
  start: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
  stop: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
  dispose: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
});

const createMockLogger = (): Logger => {
  const noop = vi.fn();
  return {
    log: noop,
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    child: vi.fn().mockReturnThis(),
    flush: noop,
    close: noop,
  } as unknown as Logger;
};

describe('PluginLifecycleManager', () => {
  let registry: PluginRegistry;
  let logger: Logger;

  beforeEach(() => {
    registry = createPluginRegistry();
    logger = createMockLogger();
  });

  it('initializes a registered plugin', async () => {
    const plugin = createTestPlugin();
    registry.register(plugin);
    const manager = createPluginLifecycleManager({ registry, logger });

    const result = await manager.initialize('test-plugin');

    expect(result.ok).toBe(true);
    expect(registry.get('test-plugin')?.phase).toBe('INITIALIZED');
  });

  it('returns error for non-existent plugin', async () => {
    const manager = createPluginLifecycleManager({ registry, logger });
    const result = await manager.initialize('non-existent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('not registered');
    }
  });

  it('starts an initialized plugin', async () => {
    const plugin = createTestPlugin();
    registry.register(plugin);
    const manager = createPluginLifecycleManager({ registry, logger });

    await manager.initialize('test-plugin');
    const result = await manager.startup('test-plugin');

    expect(result.ok).toBe(true);
    expect(registry.get('test-plugin')?.phase).toBe('RUNNING');
    expect(plugin.start).toHaveBeenCalled();
  });

  it('rejects startup if not initialized', async () => {
    const plugin = createTestPlugin();
    registry.register(plugin);
    const manager = createPluginLifecycleManager({ registry, logger });

    const result = await manager.startup('test-plugin');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('expected INITIALIZED');
    }
  });

  it('shuts down a running plugin', async () => {
    const plugin = createTestPlugin();
    registry.register(plugin);
    const manager = createPluginLifecycleManager({ registry, logger });

    await manager.initialize('test-plugin');
    await manager.startup('test-plugin');
    const result = await manager.shutdown('test-plugin');

    expect(result.ok).toBe(true);
    expect(registry.get('test-plugin')?.phase).toBe('STOPPED');
    expect(plugin.stop).toHaveBeenCalled();
  });

  it('disposes a stopped plugin', async () => {
    const plugin = createTestPlugin();
    registry.register(plugin);
    const manager = createPluginLifecycleManager({ registry, logger });

    await manager.initialize('test-plugin');
    await manager.startup('test-plugin');
    await manager.shutdown('test-plugin');
    const result = await manager.dispose('test-plugin');

    expect(result.ok).toBe(true);
    expect(registry.get('test-plugin')?.phase).toBe('DISPOSED');
    expect(plugin.dispose).toHaveBeenCalled();
  });

  it('transitions to FAILED on error during startup', async () => {
    const plugin = createTestPlugin();
    plugin.start = vi.fn().mockRejectedValue(new Error('startup failed'));
    registry.register(plugin);
    const manager = createPluginLifecycleManager({ registry, logger });

    await manager.initialize('test-plugin');
    const result = await manager.startup('test-plugin');

    expect(result.ok).toBe(false);
    expect(registry.get('test-plugin')?.phase).toBe('FAILED');
    expect(registry.get('test-plugin')?.error).toBe('startup failed');
  });

  it('reports health for a registered plugin', async () => {
    const plugin = createTestPlugin();
    registry.register(plugin);
    const manager = createPluginLifecycleManager({ registry, logger });

    const health = await manager.health('test-plugin');

    expect(health.pluginId).toBe('test-plugin');
    expect(health.phase).toBe('REGISTERED');
    expect(health.healthy).toBe(true);
  });

  it('reports unhealthy for FAILED plugin', async () => {
    const plugin = createTestPlugin();
    registry.register(plugin);
    const manager = createPluginLifecycleManager({ registry, logger });

    registry.updateError('test-plugin', 'broken');
    const health = await manager.health('test-plugin');

    expect(health.healthy).toBe(false);
    expect(health.error).toBe('broken');
  });

  it('reports health for non-existent plugin', async () => {
    const manager = createPluginLifecycleManager({ registry, logger });
    const health = await manager.health('non-existent');

    expect(health.healthy).toBe(false);
    expect(health.error).toContain('not registered');
  });

  it('initializes all registered plugins', async () => {
    const plugin1 = createTestPlugin({ id: 'p1', name: 'P1' });
    const plugin2 = createTestPlugin({ id: 'p2', name: 'P2' });
    registry.register(plugin1);
    registry.register(plugin2);
    const manager = createPluginLifecycleManager({ registry, logger });

    const initialized = await manager.initializeAll();

    expect(initialized).toEqual(['p1', 'p2']);
    expect(registry.get('p1')?.phase).toBe('INITIALIZED');
    expect(registry.get('p2')?.phase).toBe('INITIALIZED');
  });

  it('starts all initialized plugins', async () => {
    const plugin1 = createTestPlugin({ id: 'p1', name: 'P1' });
    const plugin2 = createTestPlugin({ id: 'p2', name: 'P2' });
    registry.register(plugin1);
    registry.register(plugin2);
    const manager = createPluginLifecycleManager({ registry, logger });

    await manager.initializeAll();
    const started = await manager.startupAll();

    expect(started).toEqual(['p1', 'p2']);
    expect(registry.get('p1')?.phase).toBe('RUNNING');
    expect(registry.get('p2')?.phase).toBe('RUNNING');
  });

  it('shuts down all running plugins', async () => {
    const plugin1 = createTestPlugin({ id: 'p1', name: 'P1' });
    const plugin2 = createTestPlugin({ id: 'p2', name: 'P2' });
    registry.register(plugin1);
    registry.register(plugin2);
    const manager = createPluginLifecycleManager({ registry, logger });

    await manager.initializeAll();
    await manager.startupAll();
    const stopped = await manager.shutdownAll();

    expect(stopped).toEqual(['p1', 'p2']);
    expect(registry.get('p1')?.phase).toBe('STOPPED');
    expect(registry.get('p2')?.phase).toBe('STOPPED');
  });

  it('fires transition handlers', async () => {
    const plugin = createTestPlugin();
    registry.register(plugin);
    const manager = createPluginLifecycleManager({ registry, logger });
    const handler = vi.fn();

    manager.onTransition(handler);
    await manager.initialize('test-plugin');

    expect(handler).toHaveBeenCalledWith('test-plugin', 'REGISTERED', 'INITIALIZING');
    expect(handler).toHaveBeenCalledWith('test-plugin', 'INITIALIZING', 'INITIALIZED');
  });

  it('unsubscribes transition handlers', async () => {
    const plugin = createTestPlugin();
    registry.register(plugin);
    const manager = createPluginLifecycleManager({ registry, logger });
    const handler = vi.fn();

    const unsub = manager.onTransition(handler);
    unsub();
    await manager.initialize('test-plugin');

    expect(handler).not.toHaveBeenCalled();
  });
});
