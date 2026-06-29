/**
 * PermissionService — adapter-owned permission model.
 *
 * Per Phase 3.1 architectural adjustments: commands ask `ctx.permissions`
 * and never inspect API keys. The CLI itself does not own authentication;
 * it receives a `CliRole` from its initializer and translates it to a
 * permission set.
 *
 * The same model will be reused by the REST adapter and the Dashboard.
 */
import type { CommandAction } from '../interfaces/Command.js';
import { PermissionError } from '../errors/PermissionError.js';

export type CliRole = 'admin' | 'viewer';

const PERMISSIONS: Readonly<Record<CliRole, ReadonlySet<CommandAction>>> = {
  admin: new Set<CommandAction>([
    'start',
    'stop',
    'status',
    'health',
    'config',
    'version',
    'registerModule',
    'unregisterModule',
  ]),
  viewer: new Set<CommandAction>(['status', 'health', 'config', 'version']),
};

export interface PermissionService {
  readonly can: (action: CommandAction) => boolean;
  readonly require: (action: CommandAction) => void;
}

export const createPermissionService = (role: CliRole): PermissionService => {
  const allowed = PERMISSIONS[role];
  return {
    can: (action) => allowed.has(action),
    require: (action) => {
      if (!allowed.has(action)) {
        throw new PermissionError(action);
      }
    },
  };
};
