/**
 * @agent-os/plugin-sdk
 *
 * Plugin SDK for Agent OS. Provides helpers, templates, and examples
 * for building Agent OS plugins easily and consistently.
 *
 * Layer: 3 (SDK)
 */

export const PACKAGE_NAME = '@agent-os/plugin-sdk' as const;
export const PACKAGE_VERSION = '0.1.0' as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  PluginDefinition,
  PluginManifestInput,
  PluginDependencyInput,
  PluginConfigFieldBuilder,
  PluginConfigSchemaBuilder,
  CommandHandler,
  CommandPluginDefinition,
  EventHandler,
  EventPluginDefinition,
} from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export { definePlugin } from './definePlugin.js';
export { definePluginConfig } from './definePluginConfig.js';
export { createPluginManifest } from './createPluginManifest.js';
export { createPluginContext } from './createPluginContext.js';
export type { PluginContextOptions } from './createPluginContext.js';

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export { createMinimalPlugin } from './templates/minimal.js';
export type { MinimalPluginOptions } from './templates/minimal.js';

export { createCommandPlugin, executeCommand } from './templates/command.js';
export type { CommandPluginOptions } from './templates/command.js';

export { createEventPlugin, registerEventHandler } from './templates/event.js';
export type { EventPluginOptions } from './templates/event.js';

// ---------------------------------------------------------------------------
// Examples
// ---------------------------------------------------------------------------

export { createHelloWorldPlugin } from './examples/hello-world.js';
export type { HelloWorldPluginOptions } from './examples/hello-world.js';

export { createMetricsLoggerPlugin } from './examples/metrics-logger.js';
export type { MetricsLoggerPluginOptions } from './examples/metrics-logger.js';
