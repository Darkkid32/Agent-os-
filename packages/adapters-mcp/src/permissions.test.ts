import { describe, expect, it } from 'vitest';
import { PermissionError, can } from './permissions.js';

describe('MCP permissions', () => {
  it('admin can perform every action', () => {
    for (const a of [
      'start',
      'stop',
      'status',
      'health',
      'modules',
      'config',
      'version',
    ] as const) {
      expect(can('admin', a)).toBe(true);
    }
  });

  it('viewer cannot perform start or stop', () => {
    expect(can('viewer', 'start')).toBe(false);
    expect(can('viewer', 'stop')).toBe(false);
  });

  it('viewer can perform read-only actions', () => {
    for (const a of ['status', 'health', 'modules', 'config', 'version'] as const) {
      expect(can('viewer', a)).toBe(true);
    }
  });

  it('PermissionError carries role and action metadata', () => {
    const e = new PermissionError('viewer', 'start');
    expect(e.role).toBe('viewer');
    expect(e.action).toBe('start');
    expect(e).toBeInstanceOf(Error);
  });
});
