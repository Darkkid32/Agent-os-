/**
 * @agent-os/plugins
 *
 * Plugin platform foundation for Agent OS. Provides manifest types,
 * plugin interface, registry, lifecycle management, validation,
 * dynamic plugin loading, and plugin configuration.
 *
 * Layer: 2 (Platform)
 */

export const PACKAGE_NAME = '@agent-os/plugins' as const;
export const PACKAGE_VERSION = '0.1.0' as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  PluginManifest,
  PluginDependency,
  PluginLifecyclePhase,
  AgentPlugin,
  PluginContext,
  HermesPort,
  PluginModuleSpec,
  PluginModuleHealth,
  PluginConfiguration,
  PluginRecord,
  PluginRegistry,
  PluginRegisteredHandler,
  PluginUnregisteredHandler,
  PluginLifecycleManager,
  PluginLifecycleTransitionHandler,
  PluginHealthReport,
  PluginDependencyResult,
  PluginVersionConflict,
  PluginMetadataValidationResult,
  // Phase 7.2 types
  PluginDiscoveryOptions,
  PluginDiscoveryEntry,
  PluginDiscoveryResult,
  PluginDiscoveryError,
  PluginDiscovery,
  PluginLoader,
  PluginPlatformOptions,
  PluginPlatformLoadResult,
  PluginPlatformLoadFailure,
  PluginPlatform,
  // Phase 7.3 types
  PluginConfigFieldType,
  PluginConfigFieldSchema,
  PluginConfigSchema,
  PluginConfigValidationResult,
  PluginConfigValidationError,
  PluginConfigSource,
  PluginConfig,
  PluginConfigOptions,
} from './types.js';

export { PLUGIN_TERMINAL_PHASES, PLUGIN_VALID_TRANSITIONS } from './types.js';

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export { createPluginRegistry } from './PluginRegistry.js';

// ---------------------------------------------------------------------------
// Lifecycle Manager
// ---------------------------------------------------------------------------

export { createPluginLifecycleManager } from './PluginLifecycleManager.js';
export type { PluginLifecycleManagerOptions } from './PluginLifecycleManager.js';

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

export {
  validatePluginDependencies,
  detectDuplicateIds,
  validateAllDependencies,
} from './PluginDependencyValidator.js';

export { validatePluginManifest, validateAgentOSCompatibility } from './PluginMetadataValidator.js';

// ---------------------------------------------------------------------------
// Discovery & Loading (Phase 7.2)
// ---------------------------------------------------------------------------

export { createPluginDiscovery } from './PluginDiscovery.js';
export { createPluginLoader } from './PluginLoader.js';
export { createPluginPlatform } from './PluginPlatform.js';

// ---------------------------------------------------------------------------
// Configuration (Phase 7.3)
// ---------------------------------------------------------------------------

export { createPluginConfig, validateConfig, createDefaultSources } from './PluginConfig.js';
export { validatePluginConfig, applyDefaults } from './PluginConfigValidator.js';
