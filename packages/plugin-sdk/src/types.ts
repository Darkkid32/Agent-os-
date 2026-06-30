/**
 * Plugin SDK types.
 *
 * Type definitions for the Plugin SDK helper APIs. Provides strongly-typed
 * interfaces for plugin definitions, config schemas, and manifest builders.
 *
 * Layer: 3 (SDK)
 * Dependencies: @agent-os/plugins (types only)
 */

import type {
  PluginManifest,
  PluginContext,
  PluginConfigSchema,
  PluginConfigFieldSchema,
} from '@agent-os/plugins';

// ---------------------------------------------------------------------------
// Plugin Definition
// ---------------------------------------------------------------------------

export interface PluginDefinition<_TConfig = Record<string, unknown>> {
  readonly manifest: PluginManifest;
  readonly configSchema?: PluginConfigSchema;
  readonly initialize: (context: PluginContext) => Promise<void>;
  readonly start?: () => Promise<void>;
  readonly stop?: () => Promise<void>;
  readonly dispose?: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Manifest Builder
// ---------------------------------------------------------------------------

export interface PluginManifestInput {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly author: string;
  readonly description: string;
  readonly capabilities?: readonly string[];
  readonly dependencies?: readonly PluginDependencyInput[];
  readonly minimumAgentOSVersion?: string;
  readonly configSchema?: PluginConfigSchema;
}

export interface PluginDependencyInput {
  readonly id: string;
  readonly version: string;
}

// ---------------------------------------------------------------------------
// Config Builder
// ---------------------------------------------------------------------------

export interface PluginConfigFieldBuilder {
  readonly type: PluginConfigFieldType;
  readonly options: PluginConfigFieldSchema;
  required(required?: boolean): PluginConfigFieldBuilder;
  default(value: unknown): PluginConfigFieldBuilder;
  description(desc: string): PluginConfigFieldBuilder;
  enum(values: readonly unknown[]): PluginConfigFieldBuilder;
  build(): PluginConfigFieldSchema;
}

export type PluginConfigFieldType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface PluginConfigSchemaBuilder {
  readonly fields: Record<string, PluginConfigFieldSchema>;
  field(name: string, type: PluginConfigFieldType): PluginConfigFieldBuilder;
  build(): PluginConfigSchema;
}

// ---------------------------------------------------------------------------
// Command Plugin Template
// ---------------------------------------------------------------------------

export interface CommandHandler {
  readonly name: string;
  readonly description: string;
  readonly execute: (args: string[], context: PluginContext) => Promise<string>;
}

export interface CommandPluginDefinition {
  readonly manifest: PluginManifest;
  readonly commands: readonly CommandHandler[];
}

// ---------------------------------------------------------------------------
// Event Listener Plugin Template
// ---------------------------------------------------------------------------

export interface EventHandler {
  readonly event: string;
  readonly handle: (data: unknown, context: PluginContext) => Promise<void>;
}

export interface EventPluginDefinition {
  readonly manifest: PluginManifest;
  readonly handlers: readonly EventHandler[];
}
