/**
 * /modules — reports the module count from Hermes.status().
 *
 * Read-only command. Requires viewer role. Per-module detail is not yet
 * exposed by Hermes's public surface (the registry has the records but
 * HermesPort does not surface them); the embed shows the count and a
 * note that detail lands when the kernel exposes a readout port.
 */
import type { DiscordCommand } from '../types.js';
import { formatModulesMessage } from '../formats.js';

export const modulesCommand: DiscordCommand = {
  name: 'modules',
  description: 'Show registered modules.',
  requires: 'modules',
  handler: async (ctx) => formatModulesMessage(ctx.hermes.status().modules, ctx.now()),
};
