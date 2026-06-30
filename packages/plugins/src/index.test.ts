import { describe, it, expect } from 'vitest';
import {
  PACKAGE_NAME,
  PACKAGE_VERSION,
  PLUGIN_TERMINAL_PHASES,
  PLUGIN_VALID_TRANSITIONS,
  createPluginRegistry,
  createPluginLifecycleManager,
  validatePluginDependencies,
  detectDuplicateIds,
  validateAllDependencies,
  validatePluginManifest,
  validateAgentOSCompatibility,
  createPluginDiscovery,
  createPluginLoader,
  createPluginPlatform,
  createPluginConfig,
  validateConfig,
  createDefaultSources,
  validatePluginConfig,
  applyDefaults,
} from './index.js';

describe('index exports', () => {
  it('exports PACKAGE_NAME and PACKAGE_VERSION', () => {
    expect(PACKAGE_NAME).toBe('@agent-os/plugins');
    expect(PACKAGE_VERSION).toBe('1.0.0');
  });

  it('exports PLUGIN_TERMINAL_PHASES', () => {
    expect(PLUGIN_TERMINAL_PHASES).toContain('FAILED');
    expect(PLUGIN_TERMINAL_PHASES).toContain('STOPPED');
    expect(PLUGIN_TERMINAL_PHASES).toContain('DISPOSED');
  });

  it('exports PLUGIN_VALID_TRANSITIONS', () => {
    expect(PLUGIN_VALID_TRANSITIONS.REGISTERED).toBeDefined();
    expect(PLUGIN_VALID_TRANSITIONS.RUNNING).toBeDefined();
  });

  it('exports createPluginRegistry', () => {
    expect(typeof createPluginRegistry).toBe('function');
    const registry = createPluginRegistry();
    expect(typeof registry.register).toBe('function');
    expect(typeof registry.unregister).toBe('function');
    expect(typeof registry.list).toBe('function');
    expect(typeof registry.get).toBe('function');
  });

  it('exports createPluginLifecycleManager', () => {
    expect(typeof createPluginLifecycleManager).toBe('function');
  });

  it('exports validation functions', () => {
    expect(typeof validatePluginDependencies).toBe('function');
    expect(typeof detectDuplicateIds).toBe('function');
    expect(typeof validateAllDependencies).toBe('function');
    expect(typeof validatePluginManifest).toBe('function');
    expect(typeof validateAgentOSCompatibility).toBe('function');
  });

  it('exports createPluginDiscovery', () => {
    expect(typeof createPluginDiscovery).toBe('function');
    const discovery = createPluginDiscovery();
    expect(typeof discovery.discover).toBe('function');
  });

  it('exports createPluginLoader', () => {
    expect(typeof createPluginLoader).toBe('function');
    const loader = createPluginLoader();
    expect(typeof loader.load).toBe('function');
  });

  it('exports createPluginPlatform', () => {
    expect(typeof createPluginPlatform).toBe('function');
  });

  it('exports createPluginConfig', () => {
    expect(typeof createPluginConfig).toBe('function');
  });

  it('exports validateConfig', () => {
    expect(typeof validateConfig).toBe('function');
  });

  it('exports createDefaultSources', () => {
    expect(typeof createDefaultSources).toBe('function');
  });

  it('exports validatePluginConfig', () => {
    expect(typeof validatePluginConfig).toBe('function');
  });

  it('exports applyDefaults', () => {
    expect(typeof applyDefaults).toBe('function');
  });
});
