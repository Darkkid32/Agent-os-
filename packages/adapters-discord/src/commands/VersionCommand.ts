/**
 * /version — reads PACKAGE_NAME and PACKAGE_VERSION from Hermes.
 *
 * Read-only command. Requires viewer role.
 */
import { PACKAGE_NAME, PACKAGE_VERSION } from '@agent-os/hermes';
import type { DiscordCommand } from '../types.js';
import { formatVersionMessage } from '../formats.js';

export const versionCommand: DiscordCommand = {
  name: 'version',
  description: 'Show Hermes kernel version.',
  requires: 'version',
  handler: async () => formatVersionMessage(PACKAGE_NAME, PACKAGE_VERSION),
};
