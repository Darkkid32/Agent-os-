import { describe, it, expect } from 'vitest';
import { canHttp, requireHttpRole, PermissionError, type HttpAction } from './permissions.js';

describe('canHttp', () => {
  it('admin can perform all actions', () => {
    const actions: HttpAction[] = [
      'start',
      'stop',
      'restart',
      'health',
      'status',
      'config',
      'plugins',
      'admin',
      'modules',
      'version',
    ];
    for (const action of actions) {
      expect(canHttp('admin', action)).toBe(true);
    }
  });

  it('viewer can perform read-only actions', () => {
    const readActions: HttpAction[] = ['health', 'status', 'config', 'modules', 'version'];
    for (const action of readActions) {
      expect(canHttp('viewer', action)).toBe(true);
    }
  });

  it('viewer cannot perform mutating actions', () => {
    const writeActions: HttpAction[] = ['start', 'stop', 'restart', 'plugins', 'admin'];
    for (const action of writeActions) {
      expect(canHttp('viewer', action)).toBe(false);
    }
  });
});

describe('requireHttpRole', () => {
  it('does not throw for allowed action', () => {
    expect(() => requireHttpRole('admin', 'start')).not.toThrow();
    expect(() => requireHttpRole('viewer', 'status')).not.toThrow();
  });

  it('throws PermissionError for denied action', () => {
    expect(() => requireHttpRole('viewer', 'start')).toThrow(PermissionError);
  });

  it('throws PermissionError with correct action and role', () => {
    try {
      requireHttpRole('viewer', 'stop');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PermissionError);
      if (err instanceof PermissionError) {
        expect(err.action).toBe('stop');
        expect(err.role).toBe('viewer');
      }
    }
  });
});
