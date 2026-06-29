/**
 * status command — reads `hermes.status()`.
 */
import type { HermesStatus } from '@agent-os/hermes';
import type { Command } from '../interfaces/Command.js';

export const statusCommand: Command<HermesStatus> = {
  name: 'status',
  summary: 'Show kernel phase, uptime, and module count.',
  usage: 'agent-os status',
  requires: 'status',
  handler: async (ctx) => ({ ok: true, value: ctx.hermes.status() }),
};
