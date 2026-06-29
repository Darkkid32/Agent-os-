/**
 * start — calls Hermes.start().
 *
 * Mutating command. Requires admin role. The handler propagates the
 * Hermes Result as a CommandError Result rather than throwing, per
 * docs/architecture/platform.md §17.3.
 */
import type { CommandError, WhatsAppCommand } from '../types.js';
import { formatStartedMessage } from '../formats.js';

export const startCommand: WhatsAppCommand = {
  name: 'start',
  description: 'Start the Hermes kernel.',
  requires: 'start',
  handler: async (ctx) => {
    const result = await ctx.hermes.start();
    if (!result.ok) {
      const err: CommandError = { code: 'HERMES', message: result.error.message };
      return { ok: false, error: err };
    }
    const phase = ctx.hermes.status().phase;
    return { ok: true, value: formatStartedMessage(phase) };
  },
};
