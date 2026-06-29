/**
 * PermissionService — adapter-owned permission model.
 *
 * Per Phase 3.1 architectural adjustments: commands ask `ctx.permissions`
 * and never inspect API keys. The CLI itself does not own authentication;
 * it receives a `CliRole` from its initializer and translates it to a
 * permission set.
 *
 * Phase 4.2: the role/action taxonomy and the `can` predicate live in
 * `@agent-os/core/kernel-permissions`. The CLI keeps its local
 * `PermissionService` shape so commands continue to consume it through
 * `ctx.permissions.can(action) / require(action)`.
 */
import {
  can as kernelCan,
  type KernelAction,
  type KernelRole,
} from '@agent-os/core/kernel-permissions';
import { PermissionError } from '../errors/PermissionError.js';

export type CliRole = KernelRole;

/**
 * Local action alias kept for compatibility with the pre-Phase-4.2
 * `Command.requires` field. It is structurally identical to
 * `KernelAction`.
 */
export type CommandAction = KernelAction;

export interface PermissionService {
  readonly can: (action: KernelAction) => boolean;
  readonly require: (action: KernelAction) => void;
}

export const can = kernelCan;

export const createPermissionService = (role: CliRole): PermissionService => ({
  can: (action) => kernelCan(role, action),
  require: (action) => {
    if (!kernelCan(role, action)) {
      throw new PermissionError(action);
    }
  },
});
