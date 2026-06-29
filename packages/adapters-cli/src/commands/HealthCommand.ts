/**
 * health command — reads `hermes.health()`.
 */
import type { HermesHealthMonitorReport } from '@agent-os/hermes';
import type { Command } from '../interfaces/Command.js';

export const healthCommand: Command<HermesHealthMonitorReport> = {
  name: 'health',
  summary: 'Show aggregate and per-module health.',
  usage: 'agent-os health',
  requires: 'health',
  handler: async (ctx) => ({ ok: true, value: await ctx.hermes.health() }),
};
