/**
 * stop command — calls `hermes.stop()`.
 */
import type { Command } from '../interfaces/Command.js';
import type { CommandError } from '../errors/CommandError.js';

export const stopCommand: Command<{ readonly phase: string }> = {
  name: 'stop',
  summary: 'Stop the Hermes kernel.',
  usage: 'agent-os stop',
  requires: 'stop',
  handler: async (ctx) => {
    ctx.permissions.require('stop');
    const result = await ctx.hermes.stop();
    if (!result.ok) {
      const err: CommandError = { code: 'HERMES', message: result.error.message };
      return { ok: false, error: err };
    }
    return { ok: true, value: { phase: ctx.hermes.status().phase } };
  },
};
