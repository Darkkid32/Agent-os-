/**
 * @agent-os/plugins
 *
 * Plugin platform foundation for Agent OS. Provides manifest types,
 * plugin interface, registry, lifecycle management, and validation.
 *
 * Plugins are registered explicitly — no dynamic loading, no filesystem
 * scanning. Composition only. No dependency cycles.
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
