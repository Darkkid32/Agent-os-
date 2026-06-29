/**
 * Tests for the shared adapter error taxonomy.
 *
 * Coverage:
 *   - The 8 codes in the union match `platform.md` §6.6 row-for-row.
 *   - `ADAPTER_ERROR_HTTP_STATUS` is the §6.6 HTTP map.
 *   - `adapterError` produces a frozen shape; the optional `detail` is
 *     preserved or omitted cleanly.
 *   - `mapKernelErrorToAdapterError` handles `PermissionError`, hermes
 *     phase-conflict messages, generic `Error`, `null`/`undefined`, and
 *     non-Error throwables — and never throws.
 */
import { describe, expect, it } from 'vitest';
import {
  ADAPTER_ERROR_HTTP_STATUS,
  adapterError,
  mapKernelErrorToAdapterError,
  type AdapterErrorCode,
} from './adapter-errors.js';
import { PermissionError } from './kernel-permissions.js';

describe('adapter-errors', () => {
  describe('AdapterErrorCode union', () => {
    it('contains exactly the 8 codes from platform.md §6.6', () => {
      const expected: readonly AdapterErrorCode[] = [
        'VALIDATION_ERROR',
        'AUTH_MISSING',
        'AUTH_FORBIDDEN',
        'NOT_FOUND',
        'PHASE_CONFLICT',
        'RATE_LIMITED',
        'HERMES_ERROR',
        'SERVICE_UNAVAILABLE',
      ];
      expect(Object.keys(ADAPTER_ERROR_HTTP_STATUS).sort()).toEqual([...expected].sort());
    });
  });

  describe('ADAPTER_ERROR_HTTP_STATUS', () => {
    it('VALIDATION_ERROR → 400', () => {
      expect(ADAPTER_ERROR_HTTP_STATUS.VALIDATION_ERROR).toBe(400);
    });
    it('AUTH_MISSING → 401', () => {
      expect(ADAPTER_ERROR_HTTP_STATUS.AUTH_MISSING).toBe(401);
    });
    it('AUTH_FORBIDDEN → 403', () => {
      expect(ADAPTER_ERROR_HTTP_STATUS.AUTH_FORBIDDEN).toBe(403);
    });
    it('NOT_FOUND → 404', () => {
      expect(ADAPTER_ERROR_HTTP_STATUS.NOT_FOUND).toBe(404);
    });
    it('PHASE_CONFLICT → 409', () => {
      expect(ADAPTER_ERROR_HTTP_STATUS.PHASE_CONFLICT).toBe(409);
    });
    it('RATE_LIMITED → 429', () => {
      expect(ADAPTER_ERROR_HTTP_STATUS.RATE_LIMITED).toBe(429);
    });
    it('HERMES_ERROR → 500', () => {
      expect(ADAPTER_ERROR_HTTP_STATUS.HERMES_ERROR).toBe(500);
    });
    it('SERVICE_UNAVAILABLE → 503', () => {
      expect(ADAPTER_ERROR_HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503);
    });

    it('the map is frozen', () => {
      expect(Object.isFrozen(ADAPTER_ERROR_HTTP_STATUS)).toBe(true);
    });
  });

  describe('adapterError()', () => {
    it('produces a frozen shape without detail', () => {
      const e = adapterError('NOT_FOUND', 'module x not found');
      expect(e).toEqual({ code: 'NOT_FOUND', message: 'module x not found' });
      expect(Object.isFrozen(e)).toBe(true);
    });

    it('preserves the detail field when supplied', () => {
      const e = adapterError('VALIDATION_ERROR', 'bad input', { field: 'name' });
      expect(e).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'bad input',
        detail: { field: 'name' },
      });
      expect(Object.isFrozen(e)).toBe(true);
    });

    it('omits the detail field when not supplied', () => {
      const e = adapterError('RATE_LIMITED', 'too many requests');
      expect('detail' in e).toBe(false);
    });
  });

  describe('mapKernelErrorToAdapterError()', () => {
    it('maps PermissionError to AUTH_FORBIDDEN', () => {
      const e = new PermissionError('viewer', 'start');
      const mapped = mapKernelErrorToAdapterError(e);
      expect(mapped.code).toBe('AUTH_FORBIDDEN');
      expect(mapped.message).toContain('"start"');
      expect(mapped.message).toContain('"viewer"');
      expect(mapped.detail).toEqual({ action: 'start', role: 'viewer' });
    });

    it('maps a hermes phase-conflict Error to PHASE_CONFLICT', () => {
      const e = new Error(
        'Hermes: operation not allowed in phase INITIALIZING. Expected one of: STARTING, RUNNING.',
      );
      const mapped = mapKernelErrorToAdapterError(e);
      expect(mapped.code).toBe('PHASE_CONFLICT');
      expect(mapped.message).toBe(e.message);
    });

    it('maps a HermesLifecycle illegal-transition Error to PHASE_CONFLICT', () => {
      const e = new Error('HermesLifecycle: illegal transition INITIALIZING -> STOPPING.');
      const mapped = mapKernelErrorToAdapterError(e);
      expect(mapped.code).toBe('PHASE_CONFLICT');
      expect(mapped.message).toBe(e.message);
    });

    it('maps a Hermes cannot-stop-from-FAILED Error to PHASE_CONFLICT', () => {
      const e = new Error('Hermes: cannot stop from FAILED state.');
      const mapped = mapKernelErrorToAdapterError(e);
      expect(mapped.code).toBe('PHASE_CONFLICT');
      expect(mapped.message).toBe(e.message);
    });

    it('maps a generic Error to HERMES_ERROR', () => {
      const e = new Error('something broke');
      const mapped = mapKernelErrorToAdapterError(e);
      expect(mapped.code).toBe('HERMES_ERROR');
      expect(mapped.message).toBe('something broke');
    });

    it('maps null to a generic HERMES_ERROR', () => {
      const mapped = mapKernelErrorToAdapterError(null);
      expect(mapped.code).toBe('HERMES_ERROR');
    });

    it('maps undefined to a generic HERMES_ERROR', () => {
      const mapped = mapKernelErrorToAdapterError(undefined);
      expect(mapped.code).toBe('HERMES_ERROR');
    });

    it('maps a non-Error throwable to HERMES_ERROR with the raw value as detail', () => {
      const mapped = mapKernelErrorToAdapterError('oops');
      expect(mapped.code).toBe('HERMES_ERROR');
      expect(mapped.detail).toEqual({ value: 'oops' });
    });

    it('never throws, even on weird inputs', () => {
      expect(() => mapKernelErrorToAdapterError(Symbol('s'))).not.toThrow();
      expect(() => mapKernelErrorToAdapterError({ not: 'an error' })).not.toThrow();
      expect(() => mapKernelErrorToAdapterError(42)).not.toThrow();
    });
  });
});
