/**
 * plugins command — subcommand router.
 *
 * Subcommands:
 *   plugins list                  list registered modules (read-only)
 *   plugins unload <name>         call hermes.unregisterModule(name)
 *
 * The CLI does NOT discover plugins and does NOT scan the filesystem
 * (per Phase 3.1 architectural adjustments and docs/architecture/platform.md
 * §5.7 `plugins load` is delegated to a future Plugin Loader call; the
 * current implementation lists registered modules and unregisters a named
 * one). `load` is exposed as a usage-only error so callers learn the
 * scope boundary explicitly.
 */
import type { Result } from '@agent-os/core';
import type { Command, CommandArgs } from '../interfaces/Command.js';
import type { CommandError } from '../errors/CommandError.js';

export interface PluginsListResult {
  readonly kind: 'list';
  readonly modules: readonly string[];
  readonly count: number;
}

export interface PluginsUnloadResult {
  readonly kind: 'unload';
  readonly name: string;
}

export interface PluginsLoadNotSupportedResult {
  readonly kind: 'load_unsupported';
}

export type PluginsResult = PluginsListResult | PluginsUnloadResult | PluginsLoadNotSupportedResult;

const usageError = (message: string): Result<never, CommandError> => ({
  ok: false,
  error: { code: 'USAGE', message },
});

export const pluginsCommand: Command<PluginsResult> = {
  name: 'plugins',
  summary: 'List or unload registered plugins.',
  usage: 'agent-os plugins list | agent-os plugins unload <name>',
  handler: async (ctx, args: CommandArgs) => {
    const sub = args.positional[0];

    if (sub === undefined || sub === 'list') {
      ctx.permissions.require('status');
      const status = ctx.hermes.status();
      const snapshot: PluginsListResult = {
        kind: 'list',
        modules: [],
        count: status.modules,
      };
      return { ok: true, value: snapshot };
    }

    if (sub === 'unload') {
      const name = args.positional[1];
      if (name === undefined || name.length === 0) {
        return usageError('plugins unload requires a plugin name.');
      }
      ctx.permissions.require('unregisterModule');
      const result = ctx.hermes.unregisterModule(name);
      if (!result.ok) {
        return { ok: false, error: { code: 'HERMES', message: result.error.message } };
      }
      return { ok: true, value: { kind: 'unload', name } };
    }

    if (sub === 'load') {
      return {
        ok: true,
        value: { kind: 'load_unsupported' },
      };
    }

    return usageError(`Unknown plugins subcommand: "${sub ?? ''}".`);
  },
};
