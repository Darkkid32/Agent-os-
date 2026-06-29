/**
 * Discord permissions.
 *
 * Per docs/architecture/platform.md §11.7:
 *   - Admin can do all operations (start, stop, register, unregister,
 *     plus all read-only).
 *   - Viewer can do read-only operations only.
 *
 * The taxonomy mirrors the CLI and REST adapters' two-role model but is
 * defined locally to keep the Discord adapter independent. Promoting this
 * to a shared package is a Phase 4+ cleanup.
 */

export type DiscordRole = 'admin' | 'viewer';

export type DiscordAction =
  | 'start'
  | 'stop'
  | 'status'
  | 'health'
  | 'modules'
  | 'config'
  | 'version'
  | 'registerModule'
  | 'unregisterModule';

const ADMIN_ACTIONS: ReadonlySet<DiscordAction> = new Set<DiscordAction>([
  'start',
  'stop',
  'status',
  'health',
  'modules',
  'config',
  'version',
  'registerModule',
  'unregisterModule',
]);

const VIEWER_ACTIONS: ReadonlySet<DiscordAction> = new Set<DiscordAction>([
  'status',
  'health',
  'modules',
  'config',
  'version',
]);

const PERMISSIONS: Readonly<Record<DiscordRole, ReadonlySet<DiscordAction>>> = {
  admin: ADMIN_ACTIONS,
  viewer: VIEWER_ACTIONS,
};

export const roleFor = (userId: string, adminUserIds: readonly string[]): DiscordRole =>
  adminUserIds.includes(userId) ? 'admin' : 'viewer';

export const can = (role: DiscordRole, action: DiscordAction): boolean =>
  PERMISSIONS[role].has(action);

export class PermissionError extends Error {
  public readonly action: DiscordAction;
  public readonly role: DiscordRole;

  public constructor(role: DiscordRole, action: DiscordAction) {
    super(`DiscordAdapter: permission denied for action "${action}" with role "${role}".`);
    this.name = 'PermissionError';
    this.action = action;
    this.role = role;
  }
}

export const requireRole = (role: DiscordRole, action: DiscordAction): void => {
  if (!can(role, action)) {
    throw new PermissionError(role, action);
  }
};
