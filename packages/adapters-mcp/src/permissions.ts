/**
 * MCP permissions.
 *
 * Phase 4.2: the role/action taxonomy, the `can` predicate, and the
 * `PermissionError` class live in `@agent-os/core/kernel-permissions`.
 * The MCP adapter keeps no local permission surface; its role
 * resolution is owned by `McpAdapter.resolveRole` which remains in
 * the composition root.
 */

import {
  can as kernelCan,
  type KernelAction,
  type KernelRole,
} from '@agent-os/core/kernel-permissions';

export type McpRole = KernelRole;

/**
 * Local action alias kept for compatibility with `McpToolDefinition.requires`.
 */
export type McpAction = KernelAction;

export const can = kernelCan;

export { PermissionError, requireRole } from '@agent-os/core/kernel-permissions';
