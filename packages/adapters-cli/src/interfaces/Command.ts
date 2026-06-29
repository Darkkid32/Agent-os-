/**
 * Command — registration-based command shape.
 *
 * Phase 3.1 — CLI Adapter.
 * Per docs/architecture/platform.md §5 + §18.2 the registry holds commands by
 * name. Each command is a stateless value-object: receives `CliContext` and
 * a parsed `args` payload and returns a `Result`. The adapter renders the
 * result; commands never format output, never inspect API keys, and never
 * own state.
 */
import type { Result } from '@agent-os/core';
import type { CliContext } from '../types/CliContext.js';
import type { CommandError } from '../errors/CommandError.js';

/**
 * Action a command needs permission to perform. The mapping is owned by
 * the permission service (see services/Permissions.ts). Commands never
 * inspect API keys or roles directly; they ask the context.
 */
export type CommandAction =
  | 'start'
  | 'stop'
  | 'status'
  | 'health'
  | 'config'
  | 'version'
  | 'registerModule'
  | 'unregisterModule';

export interface CommandArgs {
  readonly positional: readonly string[];
  readonly flags: Readonly<Record<string, string | boolean>>;
}

export interface Command<TValue = unknown> {
  readonly name: string;
  readonly summary: string;
  readonly usage: string;
  readonly requires?: CommandAction;
  readonly handler: (ctx: CliContext, args: CommandArgs) => Promise<Result<TValue, CommandError>>;
}
