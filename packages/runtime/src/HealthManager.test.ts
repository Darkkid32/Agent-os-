import { describe, it, expect } from 'vitest';
import { createHealthManager } from './HealthManager.js';
import type { HealthCheckResult } from './types.js';

describe('HealthManager', () => {
  describe('liveness', () => {
    it('returns ok status with uptime', () => {
      const hm = createHealthManager({});
      const report = hm.liveness();
      expect(report.status).toBe('ok');
      expect(report.uptimeMs).toBeGreaterThanOrEqual(0);
      expect(report.timestamp).toBeDefined();
    });
  });

  describe('readiness', () => {
    it('returns ready when no checks registered', async () => {
      const hm = createHealthManager({});
      const report = await hm.readiness();
      expect(report.ready).toBe(true);
      expect(report.checks).toHaveLength(0);
    });

    it('returns ready when all checks pass', async () => {
      const hm = createHealthManager({
        checks: [
          {
            name: 'test',
            check: async (): Promise<HealthCheckResult> => ({
              name: 'test',
              status: 'ok',
            }),
          },
        ],
      });
      const report = await hm.readiness();
      expect(report.ready).toBe(true);
      expect(report.checks).toHaveLength(1);
      expect(report.checks[0]!.status).toBe('ok');
    });

    it('returns not ready when a check is down', async () => {
      const hm = createHealthManager({
        checks: [
          {
            name: 'failing',
            check: async (): Promise<HealthCheckResult> => ({
              name: 'failing',
              status: 'down',
              message: 'connection lost',
            }),
          },
        ],
      });
      const report = await hm.readiness();
      expect(report.ready).toBe(false);
      expect(report.checks[0]!.status).toBe('down');
    });

    it('returns not ready when a check throws', async () => {
      const hm = createHealthManager({
        checks: [
          {
            name: 'throwing',
            check: async () => {
              throw new Error('boom');
            },
          },
        ],
      });
      const report = await hm.readiness();
      expect(report.ready).toBe(false);
      expect(report.checks[0]!.status).toBe('down');
      expect(report.checks[0]!.message).toBe('boom');
    });

    it('returns degraded when a check is degraded', async () => {
      const hm = createHealthManager({
        checks: [
          {
            name: 'degraded',
            check: async (): Promise<HealthCheckResult> => ({
              name: 'degraded',
              status: 'degraded',
              message: 'high latency',
            }),
          },
        ],
      });
      const report = await hm.readiness();
      expect(report.ready).toBe(false);
      expect(report.checks[0]!.status).toBe('degraded');
    });

    it('includes latency in check results', async () => {
      const hm = createHealthManager({
        checks: [
          {
            name: 'slow',
            check: async () => {
              await new Promise((r) => setTimeout(r, 10));
              return { name: 'slow', status: 'ok' };
            },
          },
        ],
      });
      const report = await hm.readiness();
      expect(report.checks[0]!.latencyMs).toBeGreaterThanOrEqual(10);
    });
  });

  describe('register/unregister', () => {
    it('registers a new check dynamically', async () => {
      const hm = createHealthManager({});
      hm.register('dynamic', async () => ({ name: 'dynamic', status: 'ok' }));
      const report = await hm.readiness();
      expect(report.checks).toHaveLength(1);
      expect(report.checks[0]!.name).toBe('dynamic');
    });

    it('unregisters a check', async () => {
      const hm = createHealthManager({
        checks: [{ name: 'to-remove', check: async () => ({ name: 'to-remove', status: 'ok' }) }],
      });
      hm.unregister('to-remove');
      const report = await hm.readiness();
      expect(report.checks).toHaveLength(0);
    });
  });

  describe('isReady', () => {
    it('returns false initially', () => {
      const hm = createHealthManager({});
      expect(hm.isReady()).toBe(false);
    });

    it('returns true after successful readiness check', async () => {
      const hm = createHealthManager({});
      await hm.readiness();
      expect(hm.isReady()).toBe(true);
    });
  });
});
