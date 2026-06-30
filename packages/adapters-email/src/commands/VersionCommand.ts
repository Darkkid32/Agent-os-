/**
 * version — reads PACKAGE_NAME/PACKAGE_VERSION from this package.
 *
 * Read-only command. Requires viewer role. No Hermes call required —
 * versions are static constants.
 */
import { PACKAGE_NAME, PACKAGE_VERSION } from '../constants.js';
import type { EmailCommand } from '../types.js';
import { formatVersionMessage } from '../formats.js';

export const versionCommand: EmailCommand = {
  name: 'version',
  description: 'Show version.',
  requires: 'version',
  handler: async () => ({ ok: true, value: formatVersionMessage(PACKAGE_NAME, PACKAGE_VERSION) }),
};
