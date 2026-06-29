/**
 * plugins — reads Hermes.status().modules.
 *
 * Read-only command. Requires viewer role.
 */
import type { EmailCommand } from '../types.js';
import { formatModulesMessage } from '../formats.js';

export const modulesCommand: EmailCommand = {
  name: 'plugins',
  description: 'List registered modules.',
  requires: 'modules',
  handler: async (ctx) => {
    const count = ctx.hermes.status().modules;
    return { ok: true, value: formatModulesMessage(count) };
  },
};
