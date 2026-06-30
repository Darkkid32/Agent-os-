/**
 * Plugin Platform.
 *
 * Orchestrates plugin discovery, loading, validation, and lifecycle
 * management. Integrates with PluginRegistry and PluginLifecycleManager
 * from Phase 7.1. A failed plugin does not stop the platform.
 *
 * Layer: 2 (Platform)
 * Dependencies: @agent-os/core (Result), @agent-os/observability (Logger),
 *   PluginDiscovery, PluginLoader, PluginRegistry, PluginLifecycleManager,
 *   PluginDependencyValidator, PluginMetadataValidator, PluginConfig, types
 */

import { createPluginDiscovery } from './PluginDiscovery.js';
import { createPluginLoader } from './PluginLoader.js';
import { createPluginRegistry } from './PluginRegistry.js';
import { createPluginLifecycleManager } from './PluginLifecycleManager.js';
import { validateAllDependencies } from './PluginDependencyValidator.js';
import { validateAgentOSCompatibility } from './PluginMetadataValidator.js';
import { createPluginConfig, createDefaultSources, validateConfig } from './PluginConfig.js';
import type {
  PluginPlatform,
  PluginPlatformOptions,
  PluginPlatformLoadResult,
  PluginDiscoveryResult,
  PluginDiscoveryEntry,
  PluginRegistry,
  PluginLifecycleManager,
  PluginConfigSource,
} from './types.js';

export interface PluginPlatformInternals {
  readonly discovery: ReturnType<typeof createPluginDiscovery>;
  readonly loader: ReturnType<typeof createPluginLoader>;
  readonly registry: PluginRegistry;
  readonly lifecycle: PluginLifecycleManager;
}

export const createPluginPlatform = (options: PluginPlatformOptions): PluginPlatform => {
  const { directories, agentOSVersion, logger, globalConfig, envOverrides } = options;

  const discovery = createPluginDiscovery();
  const loader = createPluginLoader();
  const registry = createPluginRegistry();
  const lifecycle = createPluginLifecycleManager({ registry, logger });

  // Create default config sources from global config and env overrides
  const defaultSources = createDefaultSources(globalConfig, envOverrides);

  const createPluginSources = (
    _pluginId: string,
    pluginSources?: readonly PluginConfigSource[],
  ): readonly PluginConfigSource[] => {
    const sources = [...defaultSources];
    if (pluginSources != null) {
      sources.push(...pluginSources);
    }
    return sources;
  };

  const discover = async (): Promise<PluginDiscoveryResult> => {
    logger.info('plugin discovery started', { directories: [...directories] });
    const result = await discovery.discover({ directories });
    logger.info('plugin discovery complete', {
      found: result.entries.length,
      errors: result.errors.length,
    });
    return result;
  };

  const registerValidPlugins = (
    entries: readonly PluginDiscoveryEntry[],
  ): {
    registered: string[];
    failed: Array<{ source: string; pluginId: string | undefined; error: string }>;
  } => {
    const registered: string[] = [];
    const failed: Array<{ source: string; pluginId: string | undefined; error: string }> = [];

    // Phase 1: Version compatibility check
    const compatibleEntries: PluginDiscoveryEntry[] = [];
    for (const entry of entries) {
      const compat = validateAgentOSCompatibility(entry.manifest, agentOSVersion);
      if (!compat.valid) {
        const errorMsg = compat.errors.join('; ');
        logger.warn('plugin version incompatible', {
          pluginId: entry.manifest.id,
          source: entry.source,
          error: errorMsg,
        });
        failed.push({ source: entry.source, pluginId: entry.manifest.id, error: errorMsg });
        continue;
      }
      compatibleEntries.push(entry);
    }

    // Phase 2: Duplicate ID detection
    const seenIds = new Set<string>();
    const uniqueEntries: PluginDiscoveryEntry[] = [];
    for (const entry of compatibleEntries) {
      if (seenIds.has(entry.manifest.id)) {
        logger.warn('duplicate plugin id', {
          pluginId: entry.manifest.id,
          source: entry.source,
        });
        failed.push({
          source: entry.source,
          pluginId: entry.manifest.id,
          error: `Duplicate plugin id "${entry.manifest.id}"`,
        });
        continue;
      }
      seenIds.add(entry.manifest.id);
      uniqueEntries.push(entry);
    }

    // Phase 3: Register all valid manifests
    for (const entry of uniqueEntries) {
      // Create a minimal AgentPlugin placeholder for registration
      const placeholder = {
        manifest: entry.manifest,
        initialize: async () => ({ ok: true as const, value: undefined }),
        start: async () => ({ ok: true as const, value: undefined }),
        stop: async () => ({ ok: true as const, value: undefined }),
        dispose: async () => ({ ok: true as const, value: undefined }),
      };

      const result = registry.register(placeholder);
      if (result.ok) {
        registered.push(entry.manifest.id);
        logger.info('plugin registered', { pluginId: entry.manifest.id, source: entry.source });
      } else {
        logger.warn('plugin registration failed', {
          pluginId: entry.manifest.id,
          error: result.error.message,
        });
        failed.push({
          source: entry.source,
          pluginId: entry.manifest.id,
          error: result.error.message,
        });
      }
    }

    return { registered, failed };
  };

  const loadAll = async (): Promise<PluginPlatformLoadResult> => {
    const discoveryResult = await discover();

    // Log discovery errors
    for (const error of discoveryResult.errors) {
      logger.error('plugin discovery error', { source: error.source, error: error.error });
    }

    // Register valid plugins
    const { registered: registeredIds, failed: registrationFailures } = registerValidPlugins(
      discoveryResult.entries,
    );

    // Validate dependency graph
    const allPlugins = registry.list().map((r) => r.plugin);
    const depResult = validateAllDependencies(allPlugins, registry);
    if (!depResult.valid) {
      for (const missing of depResult.missing) {
        logger.warn('missing plugin dependency', { dependency: missing });
      }
      for (const conflict of depResult.versionConflicts) {
        logger.warn('plugin version conflict', {
          pluginId: conflict.pluginId,
          required: conflict.required,
          available: conflict.available,
        });
      }
    }

    // Dynamically load plugins
    const loaded: string[] = [];
    const failed: Array<{ source: string; pluginId: string | undefined; error: string }> = [
      ...registrationFailures,
    ];

    for (const entry of discoveryResult.entries) {
      if (!registeredIds.includes(entry.manifest.id)) {
        continue;
      }

      const modulePath = `${entry.source}/dist/index.js`;
      const loadResult = await loader.load(entry.manifest, modulePath);
      if (!loadResult.ok) {
        logger.error('plugin load failed', {
          pluginId: entry.manifest.id,
          error: loadResult.error,
        });
        registry.updateError(entry.manifest.id, loadResult.error);
        failed.push({ source: entry.source, pluginId: entry.manifest.id, error: loadResult.error });
        continue;
      }

      // Unregister placeholder and register real plugin
      registry.unregister(entry.manifest.id);
      const registerResult = registry.register(loadResult.value);
      if (!registerResult.ok) {
        logger.error('plugin re-registration failed', {
          pluginId: entry.manifest.id,
          error: registerResult.error.message,
        });
        failed.push({
          source: entry.source,
          pluginId: entry.manifest.id,
          error: registerResult.error.message,
        });
        continue;
      }

      // Validate plugin configuration if schema is declared
      const pluginSchema = loadResult.value.manifest.configSchema;
      if (pluginSchema != null) {
        const sources = createPluginSources(entry.manifest.id);
        const pluginConfig = createPluginConfig({
          schema: pluginSchema,
          sources,
          pluginId: entry.manifest.id,
        });

        const configValidation = validateConfig(pluginConfig.all(), pluginSchema);
        if (!configValidation.valid) {
          const errorMsg = configValidation.errors.map((e) => `${e.path}: ${e.message}`).join('; ');
          logger.error('plugin configuration invalid', {
            pluginId: entry.manifest.id,
            error: errorMsg,
          });
          registry.updateError(entry.manifest.id, `Config invalid: ${errorMsg}`);
          failed.push({
            source: entry.source,
            pluginId: entry.manifest.id,
            error: `Config invalid: ${errorMsg}`,
          });
          continue;
        }
      }

      // Initialize the plugin
      const initResult = await lifecycle.initialize(entry.manifest.id);
      if (!initResult.ok) {
        logger.error('plugin initialization failed', {
          pluginId: entry.manifest.id,
          error: initResult.error.message,
        });
        failed.push({
          source: entry.source,
          pluginId: entry.manifest.id,
          error: initResult.error.message,
        });
        continue;
      }

      loaded.push(entry.manifest.id);
      logger.info('plugin loaded', { pluginId: entry.manifest.id, source: entry.source });
    }

    logger.info('plugin loading complete', { loaded: loaded.length, failed: failed.length });
    return { loaded, failed };
  };

  return {
    discover,
    loadAll,
    startAll: async () => {
      const ids = await lifecycle.startupAll();
      logger.info('plugins started', { count: ids.length });
      return ids;
    },
    stopAll: async () => {
      const ids = await lifecycle.shutdownAll();
      logger.info('plugins stopped', { count: ids.length });
      return ids;
    },
    disposeAll: async () => {
      const ids = await lifecycle.disposeAll();
      logger.info('plugins disposed', { count: ids.length });
      return ids;
    },
    registry,
    lifecycle,
  };
};
