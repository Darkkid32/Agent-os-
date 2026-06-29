/**
 * /status — reads Hermes.status().
 *
 * Read-only command. Requires viewer role.
 */
import type { DiscordCommand } from '../types.js';
import { formatStatusMessage } from '../formats.js';

export const statusCommand: DiscordCommand = {
  name: 'status',
  description: 'Show kernel phase, uptime, and module count.',
  requires: 'status',
  handler: async (ctx) => formatStatusMessage(ctx.hermes.status(), ctx.now()),
};
