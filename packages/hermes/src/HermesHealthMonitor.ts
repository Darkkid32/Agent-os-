import { now as timestampNow, type Timestamp } from '@agent-os/core';
import type {
  HermesModuleHealth,
  HermesModuleRecord,
  HermesModuleRegistry,
} from './HermesModuleRegistry.js';

/**
 * Hermes Health Monitor (Phase 2.6).
 *
 * Per docs/architecture/hermes.md §2.7 and §5.6, this module is the
 * aggregation layer. It does NOT mutate lifecycle state, does NOT register
 * modules, does NOT execute them. It only observes and reports.
 *
 * Conformance notes:
 *   - §2.7: queries every module via the Module Registry, computes the
 *     aggregate (failed > degraded > healthy > unknown).
 *   - §5.6: health() returns { status, modules: [{name, status, detail?}], at }.
 *     During INITIALIZING, returns { status: 'unknown', modules: [], at }.
 *   - The Health Monitor does NOT depend on HermesLifecycle. The
 *     INITIALIZING short-circuit is supplied by the caller via the
 *     optional `isInitializing` callback to keep this module phase-agnostic.
 *   - §4.3: dependency inversion. The Health Monitor accepts any
 *     HermesModuleRegistry-shaped object (the port); concrete registry
 *     instances are wired by the Bootstrap.
 */

export interface HermesHealthDetail {
  readonly name: string;
  readonly status: HermesModuleHealth;
  readonly detail?: string;
}

export interface HermesHealthMonitorReport {
  readonly status: HermesModuleHealth;
  readonly modules: readonly HermesHealthDetail[];
  readonly at: Timestamp;
}

export interface HermesHealthMonitorOptions {
  /**
   * Reports whether the host is currently in the INITIALIZING phase.
   * Per §5.6, when this is true, `health()` returns a synthetic
   * `unknown` report without probing any modules.
   *
   * Optional. When omitted, the monitor behaves as if NOT initializing.
   * The Bootstrap wires this from HermesLifecycle.currentPhase() at
   * construction time.
   */
  readonly isInitializing?: () => boolean;
}

export interface HermesHealthMonitor {
  /** Async aggregate report per §5.6. Probes every module's healthCheck. */
  readonly health: () => Promise<HermesHealthMonitorReport>;
  /** Sync aggregate over the cached previous snapshot. */
  readonly overallStatus: () => HermesModuleHealth;
  /** Async per-module probe. Returns `undefined` if the module is unknown. */
  readonly moduleHealth: (name: string) => Promise<HermesHealthDetail | undefined>;
  /** Snapshot of modules whose status is `failed` or `degraded`. */
  readonly unhealthyModules: () => readonly HermesHealthDetail[];
  /** Snapshot of modules whose status is `healthy`. */
  readonly healthyModules: () => readonly HermesHealthDetail[];
}

const aggregate = (statuses: readonly HermesModuleHealth[]): HermesModuleHealth => {
  if (statuses.length === 0) return 'unknown';
  if (statuses.includes('failed')) return 'failed';
  if (statuses.includes('degraded')) return 'degraded';
  if (statuses.every((s) => s === 'healthy')) return 'healthy';
  return 'unknown';
};

const probeRecord = async (record: HermesModuleRecord): Promise<HermesHealthDetail> => {
  try {
    const status = await record.healthCheck();
    if (
      status === 'healthy' ||
      status === 'degraded' ||
      status === 'failed' ||
      status === 'unknown'
    ) {
      return { name: record.name, status };
    }
    return { name: record.name, status: 'unknown', detail: 'invalid health status' };
  } catch (error) {
    return {
      name: record.name,
      status: 'failed',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
};

export const createHermesHealthMonitor = (
  registry: HermesModuleRegistry,
  options: HermesHealthMonitorOptions = {},
): HermesHealthMonitor => {
  // Cached previous report. Updated after every health() invocation.
  // Read by overallStatus() and the unhealthyModules() / healthyModules()
  // helpers so callers can read a sync view without paying the probe cost.
  let cached: readonly HermesHealthDetail[] = [];

  return {
    health: async (): Promise<HermesHealthMonitorReport> => {
      if (options.isInitializing && options.isInitializing()) {
        cached = [];
        return {
          status: 'unknown',
          modules: [],
          at: timestampNow(),
        };
      }

      const records = registry.getModules();
      const details = await Promise.all(records.map(probeRecord));
      cached = details;

      return {
        status: aggregate(details.map((d) => d.status)),
        modules: details,
        at: timestampNow(),
      };
    },

    overallStatus: (): HermesModuleHealth => aggregate(cached.map((d) => d.status)),

    moduleHealth: async (name: string): Promise<HermesHealthDetail | undefined> => {
      if (!registry.hasModule(name)) return undefined;
      const records = registry.getModules();
      const record = records.find((r) => r.name === name);
      if (!record) return undefined;
      const detail = await probeRecord(record);
      // Update the cached entry for this module.
      const next = cached.slice();
      const idx = next.findIndex((d) => d.name === name);
      if (idx === -1) next.push(detail);
      else next[idx] = detail;
      cached = next;
      return detail;
    },

    unhealthyModules: (): readonly HermesHealthDetail[] =>
      cached.filter((d) => d.status === 'failed' || d.status === 'degraded'),

    healthyModules: (): readonly HermesHealthDetail[] =>
      cached.filter((d) => d.status === 'healthy'),
  };
};
