/**
 * HealthManager — manages liveness and readiness health checks.
 *
 * Liveness: process is alive (always ok unless explicitly marked down).
 * Readiness: all registered dependency checks pass.
 *
 * Emits health transitions and check durations via the logger.
 */

import type { Logger } from '@agent-os/observability';
import type {
  HealthCheckFn,
  HealthCheckResult,
  HealthManagerConfig,
  HealthReport,
  HealthStatus,
  ReadinessReport,
} from './types.js';

function uptimeMs(): number {
  return Math.round(process.uptime() * 1000);
}

function isoNow(): string {
  return new Date().toISOString();
}

function aggregateStatus(checks: readonly HealthCheckResult[]): HealthStatus {
  if (checks.some((c) => c.status === 'down')) return 'down';
  if (checks.some((c) => c.status === 'degraded')) return 'degraded';
  return 'ok';
}

export interface HealthManager {
  readonly register: (name: string, check: HealthCheckFn) => void;
  readonly unregister: (name: string) => void;
  readonly liveness: () => HealthReport;
  readonly readiness: () => Promise<ReadinessReport>;
  readonly isReady: () => boolean;
}

export const createHealthManager = (
  config: HealthManagerConfig,
  logger?: Logger,
): HealthManager => {
  const checks = new Map<string, HealthCheckFn>(config.checks?.map((c) => [c.name, c.check]) ?? []);
  let lastReady = false;

  const runChecks = async (): Promise<readonly HealthCheckResult[]> => {
    const results: HealthCheckResult[] = [];
    for (const [name, check] of checks) {
      const start = Date.now();
      try {
        const result = await check();
        results.push({ ...result, name, latencyMs: Date.now() - start });
      } catch (error) {
        results.push({
          name,
          status: 'down',
          message: error instanceof Error ? error.message : String(error),
          latencyMs: Date.now() - start,
        });
      }
    }
    return results;
  };

  return {
    register(name: string, check: HealthCheckFn): void {
      checks.set(name, check);
    },

    unregister(name: string): void {
      checks.delete(name);
    },

    liveness(): HealthReport {
      return {
        status: 'ok',
        checks: [],
        uptimeMs: uptimeMs(),
        timestamp: isoNow(),
      };
    },

    async readiness(): Promise<ReadinessReport> {
      const checkResults = await runChecks();
      const ready = aggregateStatus(checkResults) === 'ok';

      if (ready !== lastReady) {
        logger?.info('readiness transition', {
          from: lastReady ? 'ready' : 'not-ready',
          to: ready ? 'ready' : 'not-ready',
          phase: ready ? 'running' : 'draining',
        });
        lastReady = ready;
      }

      return {
        ready,
        checks: checkResults,
        timestamp: isoNow(),
      };
    },

    isReady(): boolean {
      return lastReady;
    },
  };
};
