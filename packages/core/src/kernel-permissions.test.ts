import { describe, expect, it } from 'vitest';
import { PermissionError, can, requireRole } from './kernel-permissions.js';

describe('kernel permissions', () => {
  it('admin can perform every action', () => {
    for (const a of [
      'start',
      'stop',
      'status',
      'health',
      'modules',
      'config',
      'version',
      'registerModule',
      'unregisterModule',
    ] as const) {
      expect(can('admin', a)).toBe(true);
    }
  });

  it('viewer cannot perform mutating actions', () => {
    for (const a of ['start', 'stop', 'registerModule', 'unregisterModule'] as const) {
      expect(can('viewer', a)).toBe(false);
    }
  });

  it('viewer can perform read-only actions', () => {
    for (const a of ['status', 'health', 'modules', 'config', 'version'] as const) {
      expect(can('viewer', a)).toBe(true);
    }
  });

  it('requireRole throws PermissionError when the role is denied', () => {
    expect(() => requireRole('viewer', 'start')).toThrow(PermissionError);
  });

  it('requireRole is a no-op when the role is allowed', () => {
    expect(() => requireRole('admin', 'start')).not.toThrow();
  });

  it('PermissionError carries role and action', () => {
    const e = new PermissionError('viewer', 'start');
    expect(e.role).toBe('viewer');
    expect(e.action).toBe('start');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('PermissionError');
  });
});
