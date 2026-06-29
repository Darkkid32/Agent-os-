/**
 * WhatsApp permissions.
 *
 * Per docs/architecture/platform.md §11.7:
 *   - Admin: start, stop, plus all read-only.
 *   - Viewer: read-only (status, health, modules, config, version).
 *
 * Phase 4.2: the role/action taxonomy, the `can` predicate, and the
 * `PermissionError` class live in `@agent-os/core/kernel-permissions`.
 * The WhatsApp adapter keeps `roleFor` because the resolver is its
 * own (it maps WhatsApp phone numbers to roles via the admin list).
 */

import {
  can as kernelCan,
  type KernelAction,
  type KernelRole,
} from '@agent-os/core/kernel-permissions';

export type WhatsAppRole = KernelRole;

/**
 * Local action alias. WhatsApp never emits `registerModule` /
 * `unregisterModule` — those are Discord-only operations — but the
 * wider type is identical to `KernelAction` and we keep the local
 * alias for source-level compatibility with `WhatsAppCommand.requires`.
 */
export type WhatsAppAction = KernelAction;

export const roleFor = (phone: string, adminPhones: readonly string[]): WhatsAppRole =>
  adminPhones.includes(phone) ? 'admin' : 'viewer';

export const can = kernelCan;

export { PermissionError, requireRole } from '@agent-os/core/kernel-permissions';
