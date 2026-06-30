import {
  validatePluginManifest,
  type PluginManifest,
  type PluginDependency,
  type PluginConfigSchema,
} from '@agent-os/plugins';
import type { PluginManifestInput } from './types.js';

const DEFAULT_AGENT_OS_VERSION = '1.0.0';

export const createPluginManifest = (input: PluginManifestInput): PluginManifest => {
  const capabilities: readonly string[] = input.capabilities ?? [];
  const dependencies: readonly PluginDependency[] = input.dependencies ?? [];
  const minimumAgentOSVersion: string = input.minimumAgentOSVersion ?? DEFAULT_AGENT_OS_VERSION;

  const fields: {
    id: string;
    name: string;
    version: string;
    author: string;
    description: string;
    capabilities: readonly string[];
    dependencies: readonly PluginDependency[];
    minimumAgentOSVersion: string;
  } = {
    id: input.id,
    name: input.name,
    version: input.version,
    author: input.author,
    description: input.description,
    capabilities,
    dependencies,
    minimumAgentOSVersion,
  };

  if (input.configSchema !== undefined) {
    (fields as { configSchema?: PluginConfigSchema }).configSchema = input.configSchema;
  }

  const manifest = fields as PluginManifest;

  const result = validatePluginManifest(manifest);
  if (!result.valid) {
    const errors = result.errors.join(', ');
    throw new Error(`Invalid plugin manifest: ${errors}`);
  }

  return manifest;
};
