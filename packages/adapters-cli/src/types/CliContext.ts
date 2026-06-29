/**
 * CliContext — what every command receives.
 *
 * Per docs/architecture/platform.md §4.1 the adapter is the only component
 * that touches Hermes; commands receive a HermesPort (not the concrete
 * Hermes). Permissions are checked via `ctx.permissions.can(action)` — the
 * adapter owns the mapping from roles to actions; commands never inspect
 * API keys.
 */
import type { HermesPort } from '@agent-os/hermes';
import type { PermissionService } from '../services/Permissions.js';
import type { Timestamp } from '@agent-os/core';

export type OutputMode = 'human' | 'json';

export interface CliContext {
  readonly hermes: HermesPort;
  readonly permissions: PermissionService;
  readonly output: OutputMode;
  readonly now: () => Timestamp;
}
