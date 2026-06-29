/**
 * help — show available commands.
 *
 * Read-only command. Requires viewer role.
 */
import type { EmailCommand } from '../types.js';
import { formatHelpMessage } from '../formats.js';

export const helpCommand: EmailCommand = {
  name: 'help',
  description: 'Show available commands.',
  requires: 'status',
  handler: async () => ({ ok: true, value: formatHelpMessage() }),
};
