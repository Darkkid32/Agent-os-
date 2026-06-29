/**
 * /health — reads Hermes.health().
 *
 * Read-only command. Requires viewer role.
 */
import type { TelegramCommand } from '../types.js';
import { formatHealthMessage } from '../formats.js';

export const healthCommand: TelegramCommand = {
  name: 'health',
  description: 'Show aggregate and per-module health.',
  requires: 'health',
  handler: async (ctx) => {
    const report = await ctx.hermes.health();
    return { ok: true, value: formatHealthMessage(report) };
  },
};
