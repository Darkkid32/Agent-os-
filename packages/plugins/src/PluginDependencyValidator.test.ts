import { describe, it, expect, vi } from 'vitest';
import {
  validatePluginDependencies,
  detectDuplicateIds,
  validateAllDependencies,
} from './PluginDependencyValidator.js';
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

describe('validatePluginDependencies', () => {
  it('returns valid for plugin with no dependencies', () => {
    const registry = createPluginRegistry();
    const plugin = createTestPlugin({ dependencies: [] });

    const result = validatePluginDependencies(plugin, registry);

    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.versionConflicts).toEqual([]);
  });

  it('detects missing dependencies', () => {
    const registry = createPluginRegistry();
    const plugin = createTestPlugin({
      dependencies: [{ id: 'dep-a', version: '1.0.0' }],
    });

    const result = validatePluginDependencies(plugin, registry);

    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['dep-a']);
  });

  it('passes when dependencies are registered', () => {
    const registry = createPluginRegistry();
    const dep = createTestPlugin({ id: 'dep-a', name: 'Dep A', version: '1.0.0' });
    registry.register(dep);

    const plugin = createTestPlugin({
      dependencies: [{ id: 'dep-a', version: '^1.0.0' }],
    });

    const result = validatePluginDependencies(plugin, registry);

    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('detects version conflicts', () => {
    const registry = createPluginRegistry();
    const dep = createTestPlugin({ id: 'dep-a', name: 'Dep A', version: '2.0.0' });
    registry.register(dep);

    const plugin = createTestPlugin({
      dependencies: [{ id: 'dep-a', version: '1.0.0' }],
    });

    const result = validatePluginDependencies(plugin, registry);

    expect(result.valid).toBe(false);
    expect(result.versionConflicts).toHaveLength(1);
    expect(result.versionConflicts[0]?.required).toBe('1.0.0');
    expect(result.versionConflicts[0]?.available).toBe('2.0.0');
  });

  it('accepts compatible caret versions', () => {
    const registry = createPluginRegistry();
    const dep = createTestPlugin({ id: 'dep-a', name: 'Dep A', version: '1.2.3' });
    registry.register(dep);

    const plugin = createTestPlugin({
      dependencies: [{ id: 'dep-a', version: '^1.0.0' }],
    });

    const result = validatePluginDependencies(plugin, registry);

    expect(result.valid).toBe(true);
  });

  it('rejects incompatible caret versions', () => {
    const registry = createPluginRegistry();
    const dep = createTestPlugin({ id: 'dep-a', name: 'Dep A', version: '2.0.0' });
    registry.register(dep);

    const plugin = createTestPlugin({
      dependencies: [{ id: 'dep-a', version: '^1.0.0' }],
    });

    const result = validatePluginDependencies(plugin, registry);

    expect(result.valid).toBe(false);
    expect(result.versionConflicts).toHaveLength(1);
  });
});

describe('detectDuplicateIds', () => {
  it('returns empty for unique IDs', () => {
    const plugins = [createTestPlugin({ id: 'a' }), createTestPlugin({ id: 'b' })];

    expect(detectDuplicateIds(plugins)).toEqual([]);
  });

  it('detects duplicate IDs', () => {
    const plugins = [
      createTestPlugin({ id: 'a' }),
      createTestPlugin({ id: 'a' }),
      createTestPlugin({ id: 'b' }),
    ];

    expect(detectDuplicateIds(plugins)).toEqual(['a']);
  });

  it('returns empty for empty list', () => {
    expect(detectDuplicateIds([])).toEqual([]);
  });
});

describe('validateAllDependencies', () => {
  it('returns valid for empty plugin list', () => {
    const registry = createPluginRegistry();
    const result = validateAllDependencies([], registry);

    expect(result.valid).toBe(true);
  });

  it('detects duplicates across multiple plugins', () => {
    const registry = createPluginRegistry();
    const plugins = [createTestPlugin({ id: 'same' }), createTestPlugin({ id: 'same' })];

    const result = validateAllDependencies(plugins, registry);

    expect(result.valid).toBe(false);
    expect(result.duplicates).toEqual(['same']);
  });

  it('detects missing dependencies across plugins', () => {
    const registry = createPluginRegistry();
    const plugins = [
      createTestPlugin({ id: 'a', dependencies: [{ id: 'missing', version: '1.0.0' }] }),
      createTestPlugin({ id: 'b', dependencies: [{ id: 'also-missing', version: '1.0.0' }] }),
    ];

    const result = validateAllDependencies(plugins, registry);

    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['missing', 'also-missing']);
  });
});
