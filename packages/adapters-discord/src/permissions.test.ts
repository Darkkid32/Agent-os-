import { describe, expect, it } from 'vitest';
import { PermissionError, can, roleFor } from './permissions.js';

describe('Discord permissions', () => {
  it('roleFor returns admin only for matching user IDs', () => {
    expect(roleFor('admin-user', ['admin-user', 'other'])).toBe('admin');
    expect(roleFor('someone-else', ['admin-user'])).toBe('viewer');
    expect(roleFor('', ['admin-user'])).toBe('viewer');
  });

  it('admin can perform every action', () => {
    expect(can('admin', 'start')).toBe(true);
    expect(can('admin', 'stop')).toBe(true);
    expect(can('admin', 'registerModule')).toBe(true);
    expect(can('admin', 'version')).toBe(true);
  });

  it('viewer cannot perform mutating actions', () => {
    expect(can('viewer', 'start')).toBe(false);
    expect(can('viewer', 'stop')).toBe(false);
    expect(can('viewer', 'registerModule')).toBe(false);
  });

  it('viewer can read', () => {
    expect(can('viewer', 'status')).toBe(true);
    expect(can('viewer', 'health')).toBe(true);
    expect(can('viewer', 'modules')).toBe(true);
    expect(can('viewer', 'config')).toBe(true);
    expect(can('viewer', 'version')).toBe(true);
  });

  it('PermissionError captures role and action', () => {
    const e = new PermissionError('viewer', 'start');
    expect(e.role).toBe('viewer');
    expect(e.action).toBe('start');
    expect(e.message).toContain('denied');
    expect(e).toBeInstanceOf(Error);
  });
});
