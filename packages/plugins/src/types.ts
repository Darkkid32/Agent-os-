/**
 * Plugin platform types.
 *
 * Defines the manifest, interface, context, and lifecycle shapes for the
 * Agent OS plugin system. Supports both explicit registration and dynamic
 * plugin loading from configurable directories.
 *
 * Layer: 2 (Platform)
 * Dependencies: @agent-os/core, @agent-os/observability, @agent-os/event-bus
 */

import type { Result } from '@agent-os/core';
import type { Logger, MetricRegistry, Tracer } from '@agent-os/observability';
import type { EventBus } from '@agent-os/event-bus';

export type { Logger, MetricRegistry, Tracer } from '@agent-os/observability';

// ---------------------------------------------------------------------------
// Plugin Manifest
// ---------------------------------------------------------------------------

export interface PluginDependency {
  readonly id: string;
  readonly version: string;
}

export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly author: string;
  readonly description: string;
  readonly capabilities: readonly string[];
  readonly dependencies: readonly PluginDependency[];
  readonly minimumAgentOSVersion: string;
  readonly configSchema?: PluginConfigSchema;
}

// ---------------------------------------------------------------------------
// Plugin Lifecycle Phases
// ---------------------------------------------------------------------------

export type PluginLifecyclePhase =
  | 'REGISTERED'
  | 'INITIALIZING'
  | 'INITIALIZED'
  | 'STARTING'
  | 'RUNNING'
  | 'STOPPING'
  | 'STOPPED'
  | 'DISPOSED'
  | 'FAILED';

export const PLUGIN_TERMINAL_PHASES: readonly PluginLifecyclePhase[] = [
  'STOPPED',
  'DISPOSED',
  'FAILED',
] as const;

export const PLUGIN_VALID_TRANSITIONS: Readonly<
  Record<PluginLifecyclePhase, readonly PluginLifecyclePhase[]>
> = {
  REGISTERED: ['INITIALIZING', 'FAILED'],
  INITIALIZING: ['INITIALIZED', 'FAILED'],
  INITIALIZED: ['STARTING', 'STOPPING', 'FAILED'],
  STARTING: ['RUNNING', 'FAILED'],
  RUNNING: ['STOPPING', 'FAILED'],
  STOPPING: ['STOPPED', 'FAILED'],
  STOPPED: ['DISPOSED', 'FAILED'],
  DISPOSED: [],
  FAILED: [],
} as const;

// ---------------------------------------------------------------------------
// Plugin Interface
// ---------------------------------------------------------------------------

export interface AgentPlugin {
  readonly manifest: PluginManifest;
  initialize: (context: PluginContext) => Promise<Result<void>>;
  start: () => Promise<Result<void>>;
  stop: () => Promise<Result<void>>;
  dispose: () => Promise<Result<void>>;
}

// ---------------------------------------------------------------------------
// Plugin Context
// ---------------------------------------------------------------------------

export interface PluginContext {
  readonly hermes: HermesPort;
  readonly logger: Logger;
  readonly metrics: MetricRegistry;
  readonly tracer: Tracer;
  readonly eventBus: EventBus;
  readonly config: PluginConfig;
}

export interface HermesPort {
  readonly start: () => Promise<Result<void>>;
  readonly stop: () => Promise<Result<void>>;
  readonly status: () => string;
  readonly health: () => Promise<Record<string, unknown>>;
  readonly registerModule: (spec: PluginModuleSpec) => Result<void>;
  readonly unregisterModule: (name: string) => Result<void>;
}

export interface PluginModuleSpec {
  readonly name: string;
  readonly version: string;
  readonly dependencies: readonly string[];
  readonly required: boolean;
  readonly healthCheck: () => Promise<PluginModuleHealth>;
  readonly shutdown: (deadlineMs: number) => Promise<void>;
}

export type PluginModuleHealth = 'healthy' | 'degraded' | 'failed' | 'unknown';

export interface PluginConfiguration {
  readonly [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Plugin Registry
// ---------------------------------------------------------------------------

export type PluginRegisteredHandler = (plugin: AgentPlugin) => void;
export type PluginUnregisteredHandler = (pluginId: string) => void;

export interface PluginRecord {
  readonly plugin: AgentPlugin;
  readonly phase: PluginLifecyclePhase;
  readonly registeredAt: number;
  readonly startedAt: number | undefined;
  readonly stoppedAt: number | undefined;
  readonly error: string | undefined;
}

export interface PluginRegistry {
  readonly register: (plugin: AgentPlugin) => Result<void>;
  readonly unregister: (pluginId: string) => Result<void>;
  readonly list: () => readonly PluginRecord[];
  readonly get: (pluginId: string) => PluginRecord | undefined;
  readonly has: (pluginId: string) => boolean;
  readonly count: () => number;
  readonly updatePhase: (pluginId: string, phase: PluginLifecyclePhase) => Result<void>;
  readonly updateError: (pluginId: string, error: string) => Result<void>;
  readonly onRegistered: (handler: PluginRegisteredHandler) => () => void;
  readonly onUnregistered: (handler: PluginUnregisteredHandler) => () => void;
}

// ---------------------------------------------------------------------------
// Plugin Lifecycle Manager
// ---------------------------------------------------------------------------

export type PluginLifecycleTransitionHandler = (
  pluginId: string,
  from: PluginLifecyclePhase,
  to: PluginLifecyclePhase,
) => void;

export interface PluginLifecycleManager {
  readonly initialize: (pluginId: string) => Promise<Result<void>>;
  readonly startup: (pluginId: string) => Promise<Result<void>>;
  readonly shutdown: (pluginId: string) => Promise<Result<void>>;
  readonly dispose: (pluginId: string) => Promise<Result<void>>;
  readonly health: (pluginId: string) => Promise<PluginHealthReport>;
  readonly initializeAll: () => Promise<readonly string[]>;
  readonly startupAll: () => Promise<readonly string[]>;
  readonly shutdownAll: () => Promise<readonly string[]>;
  readonly disposeAll: () => Promise<readonly string[]>;
  readonly onTransition: (handler: PluginLifecycleTransitionHandler) => () => void;
}

export interface PluginHealthReport {
  readonly pluginId: string;
  readonly phase: PluginLifecyclePhase;
  readonly healthy: boolean;
  readonly error: string | undefined;
  readonly uptimeMs: number | undefined;
}

// ---------------------------------------------------------------------------
// Plugin Dependency Validation
// ---------------------------------------------------------------------------

export interface PluginDependencyResult {
  readonly valid: boolean;
  readonly missing: readonly string[];
  readonly duplicates: readonly string[];
  readonly versionConflicts: readonly PluginVersionConflict[];
}

export interface PluginVersionConflict {
  readonly pluginId: string;
  readonly required: string;
  readonly available: string;
}

// ---------------------------------------------------------------------------
// Plugin Metadata Validation
// ---------------------------------------------------------------------------

export interface PluginMetadataValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

// ---------------------------------------------------------------------------
// Plugin Configuration (Phase 7.3)
// ---------------------------------------------------------------------------

export type PluginConfigFieldType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface PluginConfigFieldSchema {
  readonly type: PluginConfigFieldType;
  readonly required?: boolean;
  readonly default?: unknown;
  readonly description?: string;
  readonly enum?: readonly unknown[];
  readonly items?: PluginConfigFieldSchema;
  readonly properties?: Readonly<Record<string, PluginConfigFieldSchema>>;
}

export interface PluginConfigSchema {
  readonly [key: string]: PluginConfigFieldSchema;
}

export interface PluginConfigValidationResult {
  readonly valid: boolean;
  readonly errors: readonly PluginConfigValidationError[];
}

export interface PluginConfigValidationError {
  readonly path: string;
  readonly message: string;
}

export interface PluginConfigSource {
  readonly priority: number;
  readonly get: (pluginId: string) => PluginConfiguration | undefined;
}

export interface PluginConfig {
  readonly get: <T = unknown>(key: string) => T | undefined;
  readonly require: <T = unknown>(key: string) => T;
  readonly has: (key: string) => boolean;
  readonly all: () => PluginConfiguration;
  readonly schema: () => PluginConfigSchema | undefined;
}

export interface PluginConfigOptions {
  readonly schema?: PluginConfigSchema;
  readonly sources: readonly PluginConfigSource[];
  readonly pluginId: string;
}

// ---------------------------------------------------------------------------
// Plugin Discovery (Phase 7.2)
// ---------------------------------------------------------------------------

export interface PluginDiscoveryOptions {
  readonly directories: readonly string[];
  readonly filePatterns?: readonly string[];
}

export interface PluginDiscoveryEntry {
  readonly manifest: PluginManifest;
  readonly source: string;
}

export interface PluginDiscoveryResult {
  readonly entries: readonly PluginDiscoveryEntry[];
  readonly errors: readonly PluginDiscoveryError[];
}

export interface PluginDiscoveryError {
  readonly source: string;
  readonly error: string;
}

export interface PluginDiscovery {
  readonly discover: (options: PluginDiscoveryOptions) => Promise<PluginDiscoveryResult>;
}

// ---------------------------------------------------------------------------
// Plugin Loader (Phase 7.2)
// ---------------------------------------------------------------------------

export interface PluginLoader {
  readonly load: (
    manifest: PluginManifest,
    modulePath: string,
  ) => Promise<Result<AgentPlugin, string>>;
}

// ---------------------------------------------------------------------------
// Plugin Platform (Phase 7.2)
// ---------------------------------------------------------------------------

export interface PluginPlatformOptions {
  readonly directories: readonly string[];
  readonly agentOSVersion: string;
  readonly logger: Logger;
  readonly metrics?: MetricRegistry;
  readonly tracer?: Tracer;
  readonly eventBus?: EventBus;
  readonly hermes?: HermesPort;
  readonly globalConfig?: PluginConfiguration;
  readonly envOverrides?: Readonly<Record<string, PluginConfiguration>>;
}

export interface PluginPlatformLoadResult {
  readonly loaded: readonly string[];
  readonly failed: readonly PluginPlatformLoadFailure[];
}

export interface PluginPlatformLoadFailure {
  readonly source: string;
  readonly pluginId: string | undefined;
  readonly error: string;
}

export interface PluginPlatform {
  readonly discover: () => Promise<PluginDiscoveryResult>;
  readonly loadAll: () => Promise<PluginPlatformLoadResult>;
  readonly startAll: () => Promise<readonly string[]>;
  readonly stopAll: () => Promise<readonly string[]>;
  readonly disposeAll: () => Promise<readonly string[]>;
  readonly registry: PluginRegistry;
  readonly lifecycle: PluginLifecycleManager;
}
