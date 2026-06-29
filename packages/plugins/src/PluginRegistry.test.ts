import { describe, it, expect, vi } from 'vitest';
import { createPluginRegistry } from './PluginRegistry.js';
import type { AgentPlugin, PluginManifest } from './types.js';

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

describe('PluginRegistry', () => {
  it('registers a plugin', () => {
    const registry = createPluginRegistry();
    const plugin = createTestPlugin();

    const result = registry.register(plugin);

    expect(result.ok).toBe(true);
    expect(registry.has('test-plugin')).toBe(true);
    expect(registry.count()).toBe(1);
  });

  it('rejects duplicate plugin IDs', () => {
    const registry = createPluginRegistry();
    const plugin1 = createTestPlugin({ id: 'same-id' });
    const plugin2 = createTestPlugin({ id: 'same-id' });

    registry.register(plugin1);
    const result = registry.register(plugin2);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('already registered');
    }
  });

  it('unregisters a plugin', () => {
    const registry = createPluginRegistry();
    const plugin = createTestPlugin();

    registry.register(plugin);
    const result = registry.unregister('test-plugin');

    expect(result.ok).toBe(true);
    expect(registry.has('test-plugin')).toBe(false);
    expect(registry.count()).toBe(0);
  });

  it('returns error when unregistering non-existent plugin', () => {
    const registry = createPluginRegistry();
    const result = registry.unregister('non-existent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('not registered');
    }
  });

  it('lists registered plugins', () => {
    const registry = createPluginRegistry();
    const plugin1 = createTestPlugin({ id: 'plugin-1', name: 'Plugin 1' });
    const plugin2 = createTestPlugin({ id: 'plugin-2', name: 'Plugin 2' });

    registry.register(plugin1);
    registry.register(plugin2);

    const list = registry.list();
    expect(list).toHaveLength(2);
    expect(list.map((r) => r.plugin.manifest.id)).toEqual(['plugin-1', 'plugin-2']);
  });

  it('gets a plugin record by ID', () => {
    const registry = createPluginRegistry();
    const plugin = createTestPlugin();

    registry.register(plugin);
    const record = registry.get('test-plugin');

    expect(record).toBeDefined();
    expect(record?.plugin.manifest.id).toBe('test-plugin');
    expect(record?.phase).toBe('REGISTERED');
  });

  it('returns undefined for non-existent plugin', () => {
    const registry = createPluginRegistry();
    expect(registry.get('non-existent')).toBeUndefined();
  });

  it('updates plugin phase', () => {
    const registry = createPluginRegistry();
    const plugin = createTestPlugin();

    registry.register(plugin);
    const result = registry.updatePhase('test-plugin', 'INITIALIZING');

    expect(result.ok).toBe(true);
    expect(registry.get('test-plugin')?.phase).toBe('INITIALIZING');
  });

  it('sets startedAt when phase transitions to RUNNING', () => {
    const registry = createPluginRegistry();
    const plugin = createTestPlugin();

    registry.register(plugin);
    registry.updatePhase('test-plugin', 'RUNNING');

    const record = registry.get('test-plugin');
    expect(record?.startedAt).toBeDefined();
    expect(typeof record?.startedAt).toBe('number');
  });

  it('sets stoppedAt when phase transitions to STOPPED', () => {
    const registry = createPluginRegistry();
    const plugin = createTestPlugin();

    registry.register(plugin);
    registry.updatePhase('test-plugin', 'STOPPED');

    const record = registry.get('test-plugin');
    expect(record?.stoppedAt).toBeDefined();
  });

  it('updates plugin error', () => {
    const registry = createPluginRegistry();
    const plugin = createTestPlugin();

    registry.register(plugin);
    const result = registry.updateError('test-plugin', 'something broke');

    expect(result.ok).toBe(true);
    const record = registry.get('test-plugin');
    expect(record?.phase).toBe('FAILED');
    expect(record?.error).toBe('something broke');
  });

  it('fires onRegistered handler', () => {
    const registry = createPluginRegistry();
    const handler = vi.fn();

    registry.onRegistered(handler);
    const plugin = createTestPlugin();
    registry.register(plugin);

    expect(handler).toHaveBeenCalledWith(plugin);
  });

  it('fires onUnregistered handler', () => {
    const registry = createPluginRegistry();
    const handler = vi.fn();

    registry.onUnregistered(handler);
    const plugin = createTestPlugin();
    registry.register(plugin);
    registry.unregister('test-plugin');

    expect(handler).toHaveBeenCalledWith('test-plugin');
  });

  it('unsubscribes handlers', () => {
    const registry = createPluginRegistry();
    const handler = vi.fn();

    const unsub = registry.onRegistered(handler);
    unsub();

    const plugin = createTestPlugin();
    registry.register(plugin);

    expect(handler).not.toHaveBeenCalled();
  });
});
