/**
 * /config — reads Hermes.config (secrets redacted).
 *
 * Read-only command. Requires viewer role. Secrets are replaced with
 * `****` by formats.redactConfig.
 */
import type { TelegramCommand } from '../types.js';
import { formatConfigMessage } from '../formats.js';

export const configCommand: TelegramCommand = {
  name: 'config',
  description: 'Show active configuration (secrets redacted).',
  requires: 'config',
  handler: async (ctx) => ({ ok: true, value: formatConfigMessage(ctx.hermes.config) }),
};
