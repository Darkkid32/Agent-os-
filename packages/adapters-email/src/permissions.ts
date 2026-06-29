/**
 * Email adapter permission resolver.
 *
 * Maps sender email addresses to roles using an admin email allow-list.
 * Non-admin addresses receive viewer role. The permission predicate
 * reuses the shared kernel-permissions module from @agent-os/core.
 *
 * Per docs/architecture/email.md §9:
 *   admin  → start, stop, status, health, plugins, config, version
 *   viewer → status, health, config, version
 */
import {
  can as kernelCan,
  PermissionError as KernelPermissionError,
  requireRole as kernelRequireRole,
  type KernelAction,
  type KernelRole,
} from '@agent-os/core/kernel-permissions';

export type EmailRole = KernelRole;
export type EmailAction = KernelAction;

export const roleFor = (email: string, adminEmails: readonly string[]): EmailRole => {
  const normalized = email.trim().toLowerCase();
  if (adminEmails.some((e) => e.trim().toLowerCase() === normalized)) return 'admin';
  return 'viewer';
};

export const can = (role: EmailRole, action: EmailAction): boolean => kernelCan(role, action);

export class PermissionError extends KernelPermissionError {}

export const requireRole = (role: EmailRole, action: EmailAction): void =>
  kernelRequireRole(role, action);
