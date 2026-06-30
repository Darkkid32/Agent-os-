/**
 * Fine-grained HTTP permission model for Agent OS API routes.
 *
 * Extends the kernel permission model with HTTP-specific actions and
 * provides route-level authorization via a Fastify decorator.
 *
 * Admin can perform all actions; viewer can only perform read-only actions.
 */
import { type KernelRole, PermissionError } from '@agent-os/core/kernel-permissions';

/**
 * HTTP-level actions covering all API operations.
 * Superset of kernel actions — includes HTTP-specific operations like
 * restart and plugins management.
 */
export type HttpAction =
  | 'start'
  | 'stop'
  | 'restart'
  | 'health'
  | 'status'
  | 'config'
  | 'plugins'
  | 'admin'
  | 'modules'
  | 'version';

const ADMIN_HTTP_ACTIONS: ReadonlySet<HttpAction> = new Set<HttpAction>([
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
]);

const VIEWER_HTTP_ACTIONS: ReadonlySet<HttpAction> = new Set<HttpAction>([
  'health',
  'status',
  'config',
  'modules',
  'version',
]);

const HTTP_PERMISSIONS: Readonly<Record<KernelRole, ReadonlySet<HttpAction>>> = {
  admin: ADMIN_HTTP_ACTIONS,
  viewer: VIEWER_HTTP_ACTIONS,
};

type KernelActionMapping =
  | 'start'
  | 'stop'
  | 'status'
  | 'health'
  | 'modules'
  | 'config'
  | 'version'
  | 'registerModule'
  | 'unregisterModule';

const TO_KERNEL_ACTION: Readonly<Record<HttpAction, KernelActionMapping>> = {
  start: 'start',
  stop: 'stop',
  restart: 'stop',
  health: 'health',
  status: 'status',
  config: 'config',
  plugins: 'registerModule',
  admin: 'start',
  modules: 'modules',
  version: 'version',
};

/**
 * Check whether a role can perform an HTTP action.
 */
export const canHttp = (role: KernelRole, action: HttpAction): boolean =>
  HTTP_PERMISSIONS[role].has(action);

/**
 * Map an `HttpAction` to the closest `KernelAction` for backward
 * compatibility with the kernel permission model.
 */
export const toKernelAction = (action: HttpAction): KernelActionMapping => TO_KERNEL_ACTION[action];

/**
 * Assert that a role can perform an HTTP action. Throws `PermissionError`
 * if the action is denied.
 */
export const requireHttpRole = (role: KernelRole, action: HttpAction): void => {
  if (!canHttp(role, action)) {
    throw new PermissionError(role, toKernelAction(action));
  }
};

export { PermissionError } from '@agent-os/core/kernel-permissions';
