/**
 * /health — reads Hermes.health().
 *
 * Read-only command. Requires viewer role.
 */
import type { DiscordCommand } from '../types.js';
import { formatHealthMessage } from '../formats.js';

export const healthCommand: DiscordCommand = {
  name: 'health',
  description: 'Show aggregate and per-module health.',
  requires: 'health',
  handler: async (ctx) => formatHealthMessage(await ctx.hermes.health(), ctx.now()),
};
