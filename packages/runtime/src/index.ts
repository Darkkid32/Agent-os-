/**
 * @agent-os/runtime
 *
 * Operational readiness — health, startup, shutdown, and diagnostics
 * for the Agent OS platform.
 */

export const PACKAGE_NAME = '@agent-os/runtime' as const;
export const PACKAGE_VERSION = '1.0.0' as const;

// ---------------------------------------------------------------------------
// Existing lifecycle types (Phase 1.1)
// ---------------------------------------------------------------------------

import type { Identifier, Result, Timestamp } from '@agent-os/core';

export type RuntimeId = Identifier<'RuntimeId'>;
export type LifecyclePhase = 'init' | 'starting' | 'running' | 'draining' | 'stopped' | 'errored';

export interface RuntimeContext {
  readonly id: RuntimeId;
  readonly startedAt: Timestamp;
  readonly phase: LifecyclePhase;
}

export type LifecycleEvent =
  | { readonly kind: 'phase'; readonly phase: LifecyclePhase; readonly at: Timestamp }
  | { readonly kind: 'shutdown'; readonly reason: string; readonly at: Timestamp };

export interface RuntimePort {
  readonly start: (ctx: RuntimeContext) => Promise<Result<void>>;
  readonly stop: (ctx: RuntimeContext) => Promise<Result<void>>;
}

// ---------------------------------------------------------------------------
// Operational readiness types (Phase 8.4)
// ---------------------------------------------------------------------------

export type {
  HealthStatus,
  HealthCheckResult,
  HealthReport,
  ReadinessReport,
  HealthCheckFn,
  HealthManagerConfig,
  ShutdownPhase,
  ShutdownStep,
  ShutdownManagerConfig,
  ShutdownStatus,
  StartupPhase,
  StartupStep,
  StartupManagerConfig,
  StartupStatus,
  BuildInfo,
  DiagnosticsReport,
  MemoryUsageReport,
  EventBusStatusReport,
} from './types.js';

// ---------------------------------------------------------------------------
// Managers
// ---------------------------------------------------------------------------

export { createHealthManager } from './HealthManager.js';
export type { HealthManager } from './HealthManager.js';

export { createShutdownManager } from './ShutdownManager.js';
export type { ShutdownManager } from './ShutdownManager.js';

export { createStartupManager } from './StartupManager.js';
export type { StartupManager } from './StartupManager.js';

export { createDiagnostics } from './RuntimeDiagnostics.js';
export type { RuntimeDiagnostics, DiagnosticsConfig } from './RuntimeDiagnostics.js';
