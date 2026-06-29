/**
 * plugins — reads Hermes.status().modules.
 *
 * Read-only command. Requires viewer role.
 */
import type { WhatsAppCommand } from '../types.js';
import { formatModulesMessage } from '../formats.js';

export const modulesCommand: WhatsAppCommand = {
  name: 'plugins',
  description: 'List registered modules.',
  requires: 'status',
  handler: async (ctx) => {
    const count = ctx.hermes.status().modules;
    return { ok: true, value: formatModulesMessage(count) };
  },
};
