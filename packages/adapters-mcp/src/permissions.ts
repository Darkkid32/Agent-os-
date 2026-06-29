/**
 * MCP permissions.
 *
 * Mirrors the CLI / Discord / Telegram taxonomy without depending on
 * any of them. Two roles, seven actions, one resolver. Phase 4 will
 * consolidate.
 */

export type McpRole = 'admin' | 'viewer';

export type McpAction = 'start' | 'stop' | 'status' | 'health' | 'modules' | 'config' | 'version';

const ADMIN_ACTIONS: ReadonlySet<McpAction> = new Set<McpAction>([
  'start',
  'stop',
  'status',
  'health',
  'modules',
  'config',
  'version',
]);

const VIEWER_ACTIONS: ReadonlySet<McpAction> = new Set<McpAction>([
  'status',
  'health',
  'modules',
  'config',
  'version',
]);

const PERMISSIONS: Readonly<Record<McpRole, ReadonlySet<McpAction>>> = {
  admin: ADMIN_ACTIONS,
  viewer: VIEWER_ACTIONS,
};

export const can = (role: McpRole, action: McpAction): boolean => PERMISSIONS[role].has(action);

export class PermissionError extends Error {
  public readonly action: McpAction;
  public readonly role: McpRole;

  public constructor(role: McpRole, action: McpAction) {
    super(`McpAdapter: permission denied for action "${action}" with role "${role}".`);
    this.name = 'PermissionError';
    this.action = action;
    this.role = role;
  }
}

export const requireRole = (role: McpRole, action: McpAction): void => {
  if (!can(role, action)) {
    throw new PermissionError(role, action);
  }
};
