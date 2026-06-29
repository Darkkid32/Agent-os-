/**
 * version command — reports CLI and Hermes package versions.
 */
import { PACKAGE_NAME, PACKAGE_VERSION } from '@agent-os/hermes';
import type { Command } from '../interfaces/Command.js';
import { CLI_PACKAGE_NAME, CLI_PACKAGE_VERSION } from '../services/CliAdapter.js';

export interface VersionInfo {
  readonly cli: { readonly name: string; readonly version: string };
  readonly hermes: { readonly name: string; readonly version: string };
}

export const versionCommand: Command<VersionInfo> = {
  name: 'version',
  summary: 'Show CLI and Hermes kernel versions.',
  usage: 'agent-os version',
  requires: 'version',
  handler: async () => ({
    ok: true,
    value: {
      cli: { name: CLI_PACKAGE_NAME, version: CLI_PACKAGE_VERSION },
      hermes: { name: PACKAGE_NAME, version: PACKAGE_VERSION },
    },
  }),
};
