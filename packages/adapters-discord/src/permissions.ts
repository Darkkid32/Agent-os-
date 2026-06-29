/**
 * Discord permissions.
 *
 * Per docs/architecture/platform.md §11.7:
 *   - Admin can do all operations (start, stop, register, unregister,
 *     plus all read-only).
 *   - Viewer can do read-only operations only.
 *
 * Phase 4.2: the role/action taxonomy, the `can` predicate, and the
 * `PermissionError` class live in `@agent-os/core/kernel-permissions`.
 * The Discord adapter keeps `roleFor` because the resolver is its
 * own (it maps Discord user IDs to roles via the bot's admin list).
 */

import {
  can as kernelCan,
  PermissionError,
  requireRole,
  type KernelAction,
  type KernelRole,
} from '@agent-os/core/kernel-permissions';

export type DiscordRole = KernelRole;

/**
 * Local alias kept for compatibility with `DiscordCommand.requires`.
 * It is structurally identical to `KernelAction`.
 */
export type DiscordAction = KernelAction;

export const roleFor = (userId: string, adminUserIds: readonly string[]): DiscordRole =>
  adminUserIds.includes(userId) ? 'admin' : 'viewer';

export const can = kernelCan;

export { PermissionError, requireRole };
