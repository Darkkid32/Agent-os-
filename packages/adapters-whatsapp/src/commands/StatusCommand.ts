/**
 * status — reads Hermes.status().
 *
 * Read-only command. Requires viewer role. `hermes.status()` is
 * synchronous; no Result to propagate.
 */
import type { WhatsAppCommand } from '../types.js';
import { formatStatusMessage } from '../formats.js';

export const statusCommand: WhatsAppCommand = {
  name: 'status',
  description: 'Show kernel phase, uptime, and module count.',
  requires: 'status',
  handler: async (ctx) => ({ ok: true, value: formatStatusMessage(ctx.hermes.status()) }),
};
