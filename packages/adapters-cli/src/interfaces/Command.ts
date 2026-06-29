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

import type { KernelAction } from '@agent-os/core/kernel-permissions';

/**
 * Action a command needs permission to perform. Phase 4.2 lifted the
 * canonical taxonomy into `@agent-os/core/kernel-permissions`. This
 * alias is kept for backward compatibility with `Command.requires`.
 * The CLI never asks for actions it does not surface to operators,
 * but the wider set allows future commands to opt in without an
 * adapter-package change.
 */
export type CommandAction = KernelAction;

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
