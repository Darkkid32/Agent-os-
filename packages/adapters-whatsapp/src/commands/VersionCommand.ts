/**
 * version — reads PACKAGE_NAME/PACKAGE_VERSION from @agent-os/hermes.
 *
 * Read-only command. Requires viewer role. No Hermes call required —
 * versions are static constants.
 */
import { PACKAGE_NAME, PACKAGE_VERSION } from '@agent-os/hermes';
import type { WhatsAppCommand } from '../types.js';
import { formatVersionMessage } from '../formats.js';

export const versionCommand: WhatsAppCommand = {
  name: 'version',
  description: 'Show version.',
  requires: 'version',
  handler: async () => ({ ok: true, value: formatVersionMessage(PACKAGE_NAME, PACKAGE_VERSION) }),
};
