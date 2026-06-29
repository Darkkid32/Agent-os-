/**
 * stop — calls Hermes.stop().
 *
 * Mutating command. Requires admin role.
 */
import type { CommandError, EmailCommand } from '../types.js';
import { formatStoppedMessage } from '../formats.js';

export const stopCommand: EmailCommand = {
  name: 'stop',
  description: 'Stop the Hermes kernel.',
  requires: 'stop',
  handler: async (ctx) => {
    const result = await ctx.hermes.stop();
    if (!result.ok) {
      const err: CommandError = { code: 'HERMES', message: result.error.message };
      return { ok: false, error: err };
    }
    const phase = ctx.hermes.status().phase;
    return { ok: true, value: formatStoppedMessage(phase) };
  },
};
