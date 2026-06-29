/**
 * start command — calls `hermes.start()`.
 */
import type { Command } from '../interfaces/Command.js';
import type { CommandError } from '../errors/CommandError.js';

export const startCommand: Command<{ readonly phase: string }> = {
  name: 'start',
  summary: 'Start the Hermes kernel.',
  usage: 'agent-os start',
  requires: 'start',
  handler: async (ctx) => {
    ctx.permissions.require('start');
    const result = await ctx.hermes.start();
    if (!result.ok) {
      const err: CommandError = { code: 'HERMES', message: result.error.message };
      return { ok: false, error: err };
    }
    return { ok: true, value: { phase: ctx.hermes.status().phase } };
  },
};
