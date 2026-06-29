/**
 * Adapter metadata and health shapes.
 *
 * Per docs/architecture/platform.md §4.2 and §4.3, every Agent OS surface
 * adapter declares an `AdapterMetadata` (identity) and reports
 * `AdapterHealth` (liveness). Until Phase 4.4 each adapter carried its own
 * structurally-identical copy of these shapes (e.g. `CliAdapterHealth`,
 * `DiscordAdapterHealth`, `TelegramAdapterHealth`, `WebhookAdapterHealth`,
 * `McpAdapterHealth`). This module is the single canonical declaration.
 *
 * Per-adapter extras that are not transport-neutral (Telegram's `transport`,
 * Webhook's `routeCount` / `signatureEnabled`, MCP's `toolCount`) live in
 * per-adapter intersection types, never on the canonical shape itself.
 *
 * Public-API note: per-adapter `XxxAdapterHealth` and `XxxAdapterHealthStatus`
 * names are preserved as type aliases that resolve to `AdapterHealth` and
 * `AdapterHealthStatus`. Consumers that imported those names continue to
 * work without modification.
 */
import type { Timestamp } from './index.js';

export type AdapterInterfaceType =
  'cli' | 'rest' | 'discord' | 'telegram' | 'webhook' | 'mcp' | 'whatsapp' | 'email';

/**
 * Identity of a single adapter.
 *
 * `name` is the npm package name (e.g. `@agent-os/adapters-cli`).
 * `version` is the semver of that package.
 * `interfaceType` is the surface the adapter wraps.
 * `supportedOperations` is the set of operations the adapter exposes to
 * callers (a strict subset of the kernel verb set, plus adapter-specific
 * extras such as `plugins` for the CLI).
 */
export interface AdapterMetadata {
  readonly name: string;
  readonly version: string;
  readonly interfaceType: AdapterInterfaceType;
  readonly supportedOperations: readonly string[];
}

/**
 * Health status of the adapter itself — NOT `hermes.health()`. The kernel
 * is reported through `hermes.health()`; the adapter health reports
 * whether the adapter's own transport is functional (gateway connected,
 * HTTP server bound, etc.).
 */
export type AdapterHealthStatus = 'healthy' | 'degraded' | 'failed' | 'unknown';

export interface AdapterHealth {
  readonly status: AdapterHealthStatus;
  readonly detail?: string;
  readonly at: Timestamp;
}
