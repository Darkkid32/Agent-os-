/**
 * /modules — reports the module count from Hermes.status().
 *
 * Read-only command. Requires viewer role.
 */
import type { TelegramCommand } from '../types.js';
import { formatModulesMessage } from '../formats.js';

export const modulesCommand: TelegramCommand = {
  name: 'modules',
  description: 'Show registered modules.',
  requires: 'modules',
  handler: async (ctx) => ({
    ok: true,
    value: formatModulesMessage(ctx.hermes.status().modules),
  }),
};
