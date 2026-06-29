/**
 * /start — calls Hermes.start().
 *
 * Mutating command. Requires admin role. Per docs/architecture/platform.md
 * §7.5 the adapter responds with a deferred message that is updated when
 * the operation completes.
 */
import type { DiscordCommand } from '../types.js';
import { formatStartedMessage } from '../formats.js';

export const startCommand: DiscordCommand = {
  name: 'start',
  description: 'Start the Hermes kernel.',
  requires: 'start',
  handler: async (ctx) => {
    const result = await ctx.hermes.start();
    if (!result.ok) {
      throw new Error(`Hermes.start() failed: ${result.error.message}`);
    }
    return formatStartedMessage(ctx.hermes.status().phase, ctx.now());
  },
};
