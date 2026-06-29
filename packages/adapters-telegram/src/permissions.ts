/**
 * Telegram permissions.
 *
 * Per docs/architecture/platform.md §11.7:
 *   - Admin: start, stop, plus all read-only.
 *   - Viewer: read-only (status, health, modules, config, version).
 *
 * Phase 4.2: the role/action taxonomy, the `can` predicate, and the
 * `PermissionError` class live in `@agent-os/core/kernel-permissions`.
 * The Telegram adapter keeps `roleFor` because the resolver is its
 * own (it maps Telegram numeric user IDs to roles via the bot's admin
 * list).
 */

import {
  can as kernelCan,
  type KernelAction,
  type KernelRole,
} from '@agent-os/core/kernel-permissions';

export type TelegramRole = KernelRole;

/**
 * Local action alias. Telegram never emits `registerModule` /
 * `unregisterModule` — those are Discord-only operations — but the
 * wider type is identical to `KernelAction` and we keep the local
 * alias for source-level compatibility with `TelegramCommand.requires`.
 */
export type TelegramAction = KernelAction;

export const roleFor = (userId: string, adminUserIds: readonly string[]): TelegramRole =>
  adminUserIds.includes(userId) ? 'admin' : 'viewer';

export const can = kernelCan;

export { PermissionError, requireRole } from '@agent-os/core/kernel-permissions';
