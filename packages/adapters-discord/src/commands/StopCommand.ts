/**
 * /stop — calls Hermes.stop().
 *
 * Mutating command. Requires admin role.
 */
import type { DiscordCommand } from '../types.js';
import { formatStoppedMessage } from '../formats.js';

export const stopCommand: DiscordCommand = {
  name: 'stop',
  description: 'Stop the Hermes kernel.',
  requires: 'stop',
  handler: async (ctx) => {
    const result = await ctx.hermes.stop();
    if (!result.ok) {
      throw new Error(`Hermes.stop() failed: ${result.error.message}`);
    }
    return formatStoppedMessage(ctx.hermes.status().phase, ctx.now());
  },
};
