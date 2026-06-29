/**
 * HermesPort — minimal subset of the Hermes public surface that adapters
 * actually exercise. Structural typing: any object that supplies these
 * members (including the full `Hermes` instance from this package) is
 * accepted as a HermesPort. No modifications are required to Hermes.
 *
 * Phase 3 — Platform Layer.
 * Per docs/architecture/platform.md §5 the CLI may call:
 *   start, stop, status, health, config, registerModule, unregisterModule.
 * Per docs/architecture/platform.md §6 the REST adapter calls the same
 * seven methods. Per docs/architecture/platform.md §10 the Dashboard uses
 * the REST adapter and never imports Hermes directly. Future adapters
 * (Discord, Telegram, Webhooks, MCP) consume the same subset.
 *
 * Promoting this interface to @agent-os/hermes removes the previous
 * adapter-to-adapter type-only import path; adapters now depend on the
 * kernel's port, not on each other.
 */
import type { HermesHealthMonitorReport, HermesStatus } from './Hermes.js';
import type { HermesConfig } from './HermesConfig.js';
import type { HermesModuleSpec } from './HermesModuleRegistry.js';
import type { Result } from '@agent-os/core';

export interface HermesPort {
  readonly start: () => Promise<Result<void>>;
  readonly stop: () => Promise<Result<void>>;
  readonly status: () => HermesStatus;
  readonly health: () => Promise<HermesHealthMonitorReport>;
  readonly config: HermesConfig;
  readonly registerModule: (spec: HermesModuleSpec) => Result<void>;
  readonly unregisterModule: (name: string) => Result<void>;
}
