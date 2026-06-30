/**
 * Runtime operational readiness types.
 *
 * Health, shutdown, startup, and diagnostic contracts used by the
 * Agent OS runtime to coordinate process lifecycle.
 */

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface HealthCheckResult {
  readonly name: string;
  readonly status: HealthStatus;
  readonly message?: string;
  readonly latencyMs?: number;
}

export interface HealthReport {
  readonly status: HealthStatus;
  readonly checks: readonly HealthCheckResult[];
  readonly uptimeMs: number;
  readonly timestamp: string;
}

export interface ReadinessReport {
  readonly ready: boolean;
  readonly checks: readonly HealthCheckResult[];
  readonly timestamp: string;
}

export type HealthCheckFn = () => Promise<HealthCheckResult>;

export interface HealthManagerConfig {
  readonly checks?: ReadonlyArray<{ readonly name: string; readonly check: HealthCheckFn }>;
  readonly readinessTimeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Shutdown
// ---------------------------------------------------------------------------

export type ShutdownPhase = 'idle' | 'shutting-down' | 'stopped' | 'timed-out';

export interface ShutdownStep {
  readonly name: string;
  readonly shutdown: () => Promise<void>;
}

export interface ShutdownManagerConfig {
  readonly timeoutMs?: number;
  readonly steps?: readonly ShutdownStep[];
}

export interface ShutdownStatus {
  readonly phase: ShutdownPhase;
  readonly startedAt: number | undefined;
  readonly completedAt: number | undefined;
  readonly durationMs: number | undefined;
  readonly failedStep: string | undefined;
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

export type StartupPhase = 'idle' | 'starting' | 'running' | 'failed' | 'rolled-back';

export interface StartupStep {
  readonly name: string;
  readonly dependencies?: readonly string[];
  readonly startup: () => Promise<void>;
  readonly rollback?: () => Promise<void>;
}

export interface StartupManagerConfig {
  readonly timeoutMs?: number;
  readonly steps?: readonly StartupStep[];
}

export interface StartupStatus {
  readonly phase: StartupPhase;
  readonly startedSteps: readonly string[];
  readonly failedStep: string | undefined;
  readonly durationMs: number | undefined;
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

export interface BuildInfo {
  readonly version: string;
  readonly nodeVersion: string;
  readonly platform: string;
  readonly arch: string;
}

export interface DiagnosticsReport {
  readonly version: string;
  readonly uptimeMs: number;
  readonly buildInfo: BuildInfo;
  readonly loadedPlugins: readonly string[];
  readonly loadedAdapters: readonly string[];
  readonly configurationSummary: Readonly<Record<string, unknown>>;
  readonly memoryUsage: MemoryUsageReport;
  readonly eventBusStatus: EventBusStatusReport;
  readonly startup: StartupStatus;
  readonly shutdown: ShutdownStatus;
}

export interface MemoryUsageReport {
  readonly heapUsedMb: number;
  readonly heapTotalMb: number;
  readonly rssMb: number;
  readonly externalMb: number;
}

export interface EventBusStatusReport {
  readonly subscribedTopics: number;
  readonly status: 'active' | 'inactive';
}
