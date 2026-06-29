/**
 * Kernel permission model.
 *
 * Layer-4 surface adapters (CLI, REST, Dashboard, Discord, Telegram,
 * Webhook, MCP) all need a role-gated action check. Until Phase 4.2
 * each adapter carried its own copy of this taxonomy; this module is
 * the single canonical implementation.
 *
 * Two roles, nine actions. Admin can perform every action; viewer
 * can perform the read-only subset. The taxonomy is intentionally
 * superset-of-capabilities: an adapter that does not expose a given
 * action simply never asks whether the role can perform it.
 *
 * Per-adapter error identity is preserved via re-export
 * (`@agent-os/adapters-cli/permissions` re-exports
 * `PermissionError` from here). Consumers still pass `instanceof`
 * checks the same way.
 */
export type KernelRole = 'admin' | 'viewer';

export type KernelAction =
  | 'start'
  | 'stop'
  | 'status'
  | 'health'
  | 'modules'
  | 'config'
  | 'version'
  | 'registerModule'
  | 'unregisterModule';

const ADMIN_ACTIONS: ReadonlySet<KernelAction> = new Set<KernelAction>([
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

const VIEWER_ACTIONS: ReadonlySet<KernelAction> = new Set<KernelAction>([
  'status',
  'health',
  'modules',
  'config',
  'version',
]);

const PERMISSIONS: Readonly<Record<KernelRole, ReadonlySet<KernelAction>>> = {
  admin: ADMIN_ACTIONS,
  viewer: VIEWER_ACTIONS,
};

export const can = (role: KernelRole, action: KernelAction): boolean =>
  PERMISSIONS[role].has(action);

export class PermissionError extends Error {
  public readonly action: KernelAction;
  public readonly role: KernelRole;

  public constructor(role: KernelRole, action: KernelAction) {
    super(`KernelPermission: action "${action}" denied for role "${role}".`);
    this.name = 'PermissionError';
    this.action = action;
    this.role = role;
  }
}

export const requireRole = (role: KernelRole, action: KernelAction): void => {
  if (!can(role, action)) {
    throw new PermissionError(role, action);
  }
};
