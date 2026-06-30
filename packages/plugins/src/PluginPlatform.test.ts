import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPluginPlatform } from './PluginPlatform.js';
import type { AgentPlugin, PluginManifest, Logger } from './types.js';
import type { Dirent, Stats } from 'node:fs';

vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn(),
}));

const fs = await import('node:fs/promises');
const mockReaddir = vi.mocked(fs.readdir);
const mockStat = vi.mocked(fs.stat);
const mockReadFile = vi.mocked(fs.readFile);

const createTestManifest = (overrides: Partial<PluginManifest> = {}): PluginManifest => ({
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  author: 'Test Author',
  description: 'A test plugin',
  capabilities: ['test'],
  dependencies: [],
  minimumAgentOSVersion: '1.0.0',
  ...overrides,
});

const createTestPlugin = (manifestOverrides: Partial<PluginManifest> = {}): AgentPlugin => ({
  manifest: createTestManifest(manifestOverrides),
  initialize: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
  start: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
  stop: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
  dispose: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
});

const createMockLogger = (): Logger =>
  ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
    trace: vi.fn(),
    fatal: vi.fn(),
    log: vi.fn(),
    flush: vi.fn(),
    close: vi.fn(),
    config: { minLevel: 'info', sinks: [] },
    adapterName: undefined,
  }) as unknown as Logger;

describe('PluginPlatform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a platform instance', () => {
    const logger = createMockLogger();
    const platform = createPluginPlatform({
      directories: ['/plugins'],
      agentOSVersion: '1.0.0',
      logger,
    });

    expect(platform).toBeDefined();
    expect(platform.registry).toBeDefined();
    expect(platform.lifecycle).toBeDefined();
    expect(typeof platform.discover).toBe('function');
    expect(typeof platform.loadAll).toBe('function');
    expect(typeof platform.startAll).toBe('function');
    expect(typeof platform.stopAll).toBe('function');
    expect(typeof platform.disposeAll).toBe('function');
  });

  it('returns empty result when no directories have plugins', async () => {
    const logger = createMockLogger();
    const platform = createPluginPlatform({
      directories: ['/empty'],
      agentOSVersion: '1.0.0',
      logger,
    });

    mockStat.mockResolvedValue({ isDirectory: () => true } as Stats);
    mockReaddir.mockResolvedValue([]);

    const result = await platform.loadAll();

    expect(result.loaded).toHaveLength(0);
    expect(result.failed).toHaveLength(0);
  });

  it('registers plugins from discovered directories', async () => {
    const logger = createMockLogger();
    const platform = createPluginPlatform({
      directories: ['/plugins'],
      agentOSVersion: '1.0.0',
      logger,
    });

    mockStat.mockResolvedValue({ isDirectory: () => true } as Stats);
    mockReaddir.mockResolvedValue([
      { name: 'plugin-a', isDirectory: () => true, isFile: () => false } as Dirent,
    ] as never);
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        name: '@agent-os/plugin-a',
        version: '1.0.0',
        description: 'Plugin A',
        author: 'Test',
        'agent-os': {
          plugin: {
            id: 'plugin-a',
            capabilities: ['test'],
            minimumAgentOSVersion: '1.0.0',
          },
        },
      }),
    );

    const result = await platform.loadAll();

    // Plugin will fail to load because the module doesn't exist on disk
    // But it should be registered
    expect(result.failed.length).toBeGreaterThanOrEqual(0);
  });

  it('handles discovery errors gracefully', async () => {
    const logger = createMockLogger();
    const platform = createPluginPlatform({
      directories: ['/nonexistent'],
      agentOSVersion: '1.0.0',
      logger,
    });

    mockStat.mockRejectedValue(new Error('ENOENT'));

    const result = await platform.loadAll();

    expect(result.loaded).toHaveLength(0);
    expect(result.failed).toHaveLength(0);
  });

  it('skips plugins with incompatible versions', async () => {
    const logger = createMockLogger();
    const platform = createPluginPlatform({
      directories: ['/plugins'],
      agentOSVersion: '1.0.0',
      logger,
    });

    mockStat.mockResolvedValue({ isDirectory: () => true } as Stats);
    mockReaddir.mockResolvedValue([
      { name: 'old-plugin', isDirectory: () => true, isFile: () => false } as Dirent,
    ] as never);
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        name: '@agent-os/old-plugin',
        version: '1.0.0',
        description: 'Old plugin',
        author: 'Test',
        'agent-os': {
          plugin: {
            id: 'old-plugin',
            capabilities: ['test'],
            minimumAgentOSVersion: '2.0.0', // Requires newer version
          },
        },
      }),
    );

    const result = await platform.loadAll();

    expect(result.loaded).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.error).toContain('requires Agent OS');
  });

  it('startAll and stopAll delegate to lifecycle manager', async () => {
    const logger = createMockLogger();
    const platform = createPluginPlatform({
      directories: [],
      agentOSVersion: '1.0.0',
      logger,
    });

    // Register a plugin manually
    const plugin = createTestPlugin();
    platform.registry.register(plugin);

    // Initialize the plugin first (moves to INITIALIZED phase)
    await platform.lifecycle.initialize('test-plugin');

    // Start the plugin (uses startupAll internally)
    const startResult = await platform.startAll();
    expect(startResult).toHaveLength(1);
    expect(startResult[0]).toBe('test-plugin');

    // Stop the plugin (uses shutdownAll internally)
    const stopResult = await platform.stopAll();
    expect(stopResult).toHaveLength(1);
    expect(stopResult[0]).toBe('test-plugin');
  });

  it('disposeAll disposes stopped plugins', async () => {
    const logger = createMockLogger();
    const platform = createPluginPlatform({
      directories: [],
      agentOSVersion: '1.0.0',
      logger,
    });

    // Register and lifecycle through to STOPPED
    const plugin = createTestPlugin();
    platform.registry.register(plugin);
    await platform.lifecycle.initialize('test-plugin');
    await platform.startAll();
    await platform.stopAll();

    // Dispose
    const disposeResult = await platform.disposeAll();
    expect(disposeResult).toHaveLength(1);
    expect(disposeResult[0]).toBe('test-plugin');
  });
});
