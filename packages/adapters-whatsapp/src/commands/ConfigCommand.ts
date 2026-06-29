/**
 * config — reads Hermes.config.
 *
 * Read-only command. Requires viewer role. Secrets are redacted by
 * `redactHermesConfig` owned by the kernel.
 */
import type { WhatsAppCommand } from '../types.js';
import { formatConfigMessage } from '../formats.js';

export const configCommand: WhatsAppCommand = {
  name: 'config',
  description: 'Show active configuration (secrets redacted).',
  requires: 'config',
  handler: async (ctx) => ({ ok: true, value: formatConfigMessage(ctx.hermes.config) }),
};
