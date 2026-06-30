import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPluginDiscovery } from './PluginDiscovery.js';
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

describe('PluginDiscovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('discovers valid plugin manifests from directories', async () => {
    const discovery = createPluginDiscovery();

    mockStat.mockResolvedValue({ isDirectory: () => true } as Stats);
    mockReaddir.mockResolvedValue([
      { name: 'plugin-a', isDirectory: () => true, isFile: () => false } as Dirent,
    ] as never);
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        name: '@agent-os/plugin-a',
        version: '1.0.0',
        description: 'Test plugin A',
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

    const result = await discovery.discover({ directories: ['/plugins'] });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.manifest.id).toBe('plugin-a');
    expect(result.entries[0]?.source).toContain('plugin-a');
    expect(result.errors).toHaveLength(0);
  });

  it('skips directories without agent-os plugin config', async () => {
    const discovery = createPluginDiscovery();

    mockStat.mockResolvedValue({ isDirectory: () => true } as Stats);
    mockReaddir.mockResolvedValue([
      { name: 'not-a-plugin', isDirectory: () => true, isFile: () => false } as Dirent,
    ] as never);
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        name: 'regular-package',
        version: '1.0.0',
      }),
    );

    const result = await discovery.discover({ directories: ['/plugins'] });

    expect(result.entries).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('reports errors for non-existent directories', async () => {
    const discovery = createPluginDiscovery();

    mockStat.mockRejectedValue(new Error('ENOENT'));

    const result = await discovery.discover({ directories: ['/nonexistent'] });

    expect(result.entries).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.error).toContain('Directory not found');
  });

  it('reports errors for non-directory paths', async () => {
    const discovery = createPluginDiscovery();

    mockStat.mockResolvedValue({ isDirectory: () => false } as Stats);

    const result = await discovery.discover({ directories: ['/file.txt'] });

    expect(result.entries).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.error).toContain('Not a directory');
  });

  it('handles empty directories', async () => {
    const discovery = createPluginDiscovery();

    mockStat.mockResolvedValue({ isDirectory: () => true } as Stats);
    mockReaddir.mockResolvedValue([]);

    const result = await discovery.discover({ directories: ['/empty'] });

    expect(result.entries).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('handles multiple directories', async () => {
    const discovery = createPluginDiscovery();

    mockStat.mockResolvedValue({ isDirectory: () => true } as Stats);
    mockReaddir
      .mockResolvedValueOnce([
        { name: 'plugin-1', isDirectory: () => true, isFile: () => false } as Dirent,
      ] as never)
      .mockResolvedValueOnce([
        { name: 'plugin-2', isDirectory: () => true, isFile: () => false } as Dirent,
      ] as never);
    mockReadFile
      .mockResolvedValueOnce(
        JSON.stringify({
          name: '@agent-os/plugin-1',
          version: '1.0.0',
          description: 'Plugin 1',
          author: 'Test',
          'agent-os': {
            plugin: {
              id: 'plugin-1',
              capabilities: ['test'],
              minimumAgentOSVersion: '1.0.0',
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          name: '@agent-os/plugin-2',
          version: '2.0.0',
          description: 'Plugin 2',
          author: 'Test',
          'agent-os': {
            plugin: {
              id: 'plugin-2',
              capabilities: ['test'],
              minimumAgentOSVersion: '1.0.0',
            },
          },
        }),
      );

    const result = await discovery.discover({ directories: ['/dir1', '/dir2'] });

    expect(result.entries).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('continues after one directory fails', async () => {
    const discovery = createPluginDiscovery();

    mockStat
      .mockRejectedValueOnce(new Error('ENOENT'))
      .mockResolvedValueOnce({ isDirectory: () => true } as Stats);
    mockReaddir.mockResolvedValue([
      { name: 'plugin-ok', isDirectory: () => true, isFile: () => false } as Dirent,
    ] as never);
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        name: '@agent-os/plugin-ok',
        version: '1.0.0',
        description: 'OK plugin',
        author: 'Test',
        'agent-os': {
          plugin: {
            id: 'plugin-ok',
            capabilities: ['test'],
            minimumAgentOSVersion: '1.0.0',
          },
        },
      }),
    );

    const result = await discovery.discover({ directories: ['/bad', '/good'] });

    expect(result.entries).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.source).toBe('/bad');
  });

  it('skips plugins with invalid manifests', async () => {
    const discovery = createPluginDiscovery();

    mockStat.mockResolvedValue({ isDirectory: () => true } as Stats);
    mockReaddir.mockResolvedValue([
      { name: 'plugin-1', isDirectory: () => true, isFile: () => false } as Dirent,
    ] as never);
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        name: '@agent-os/bad-plugin',
        version: '1.0.0',
        'agent-os': {
          plugin: {
            // Missing required fields: id, name, author, description
            version: '1.0.0',
          },
        },
      }),
    );

    const result = await discovery.discover({ directories: ['/plugins'] });

    expect(result.entries).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });
});
