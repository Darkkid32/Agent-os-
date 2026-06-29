/**
 * Telegram permissions.
 *
 * Per docs/architecture/platform.md §11.7:
 *   - Admin: start, stop, plus all read-only.
 *   - Viewer: read-only (status, health, modules, config, version).
 *
 * The taxonomy is defined locally to keep the Telegram adapter
 * independent of the CLI / REST / Discord adapters. Promoting it to a
 * shared package is a Phase 4+ cleanup.
 */

export type TelegramRole = 'admin' | 'viewer';

export type TelegramAction =
  'start' | 'stop' | 'status' | 'health' | 'modules' | 'config' | 'version';

const ADMIN_ACTIONS: ReadonlySet<TelegramAction> = new Set<TelegramAction>([
  'start',
  'stop',
  'status',
  'health',
  'modules',
  'config',
  'version',
]);

const VIEWER_ACTIONS: ReadonlySet<TelegramAction> = new Set<TelegramAction>([
  'status',
  'health',
  'modules',
  'config',
  'version',
]);

const PERMISSIONS: Readonly<Record<TelegramRole, ReadonlySet<TelegramAction>>> = {
  admin: ADMIN_ACTIONS,
  viewer: VIEWER_ACTIONS,
};

export const roleFor = (userId: string, adminUserIds: readonly string[]): TelegramRole =>
  adminUserIds.includes(userId) ? 'admin' : 'viewer';

export const can = (role: TelegramRole, action: TelegramAction): boolean =>
  PERMISSIONS[role].has(action);

export class PermissionError extends Error {
  public readonly action: TelegramAction;
  public readonly role: TelegramRole;

  public constructor(role: TelegramRole, action: TelegramAction) {
    super(`TelegramAdapter: permission denied for action "${action}" with role "${role}".`);
    this.name = 'PermissionError';
    this.action = action;
    this.role = role;
  }
}

export const requireRole = (role: TelegramRole, action: TelegramAction): void => {
  if (!can(role, action)) {
    throw new PermissionError(role, action);
  }
};
