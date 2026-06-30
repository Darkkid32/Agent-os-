/**
 * Plugin Discovery.
 *
 * Scans configurable directories for plugin manifests. Reads package.json
 * files, extracts agent-os.plugin sections, and validates manifests.
 * Non-destructive — only reads the filesystem.
 *
 * Layer: 2 (Platform)
 * Dependencies: @agent-os/core (Result), PluginMetadataValidator, types
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Dirent } from 'node:fs';
import type {
  PluginDiscovery,
  PluginDiscoveryOptions,
  PluginDiscoveryResult,
  PluginDiscoveryEntry,
  PluginDiscoveryError,
  PluginManifest,
} from './types.js';
import { validatePluginManifest } from './PluginMetadataValidator.js';

const DEFAULT_FILE_PATTERNS = ['package.json'] as const;

interface PackageJsonLike {
  readonly name?: string;
  readonly version?: string;
  readonly description?: string;
  readonly author?: string;
  readonly 'agent-os'?: {
    readonly plugin?: Partial<PluginManifest>;
  };
}

const readJsonFile = async (filePath: string): Promise<unknown | undefined> => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as unknown;
  } catch {
    return undefined;
  }
};

const extractManifest = (pkg: PackageJsonLike, source: string): PluginManifest | undefined => {
  const pluginConfig = pkg['agent-os']?.plugin;
  if (pluginConfig == null) {
    return undefined;
  }

  const manifest: PluginManifest = {
    id: pluginConfig.id ?? pkg.name ?? path.basename(path.dirname(source)),
    name: pluginConfig.name ?? pkg.name ?? 'unknown',
    version: pluginConfig.version ?? pkg.version ?? '0.0.0',
    author: pluginConfig.author ?? pkg.author ?? 'unknown',
    description: pluginConfig.description ?? pkg.description ?? '',
    capabilities: pluginConfig.capabilities ?? [],
    dependencies: pluginConfig.dependencies ?? [],
    minimumAgentOSVersion: pluginConfig.minimumAgentOSVersion ?? '0.0.0',
  };

  return manifest;
};

const scanDirectory = async (
  dir: string,
  filePatterns: readonly string[],
): Promise<PluginDiscoveryEntry[]> => {
  const entries: PluginDiscoveryEntry[] = [];

  let dirEntries: Dirent[];
  try {
    dirEntries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return entries;
  }

  for (const entry of dirEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const subDir = path.join(dir, entry.name);

    for (const pattern of filePatterns) {
      const filePath = path.join(subDir, pattern);
      const pkg = (await readJsonFile(filePath)) as PackageJsonLike | undefined;
      if (pkg == null) {
        continue;
      }

      const manifest = extractManifest(pkg, filePath);
      if (manifest == null) {
        continue;
      }

      const validation = validatePluginManifest(manifest);
      if (!validation.valid) {
        continue;
      }

      entries.push({ manifest, source: subDir });
    }
  }

  return entries;
};

export const createPluginDiscovery = (): PluginDiscovery => ({
  discover: async (options: PluginDiscoveryOptions): Promise<PluginDiscoveryResult> => {
    const filePatterns = options.filePatterns ?? DEFAULT_FILE_PATTERNS;
    const entries: PluginDiscoveryEntry[] = [];
    const errors: PluginDiscoveryError[] = [];

    for (const dir of options.directories) {
      let resolvedDir: string;
      try {
        resolvedDir = path.resolve(dir);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        errors.push({ source: dir, error: `Invalid directory path: ${message}` });
        continue;
      }

      try {
        const stat = await fs.stat(resolvedDir);
        if (!stat.isDirectory()) {
          errors.push({ source: dir, error: `Not a directory: ${resolvedDir}` });
          continue;
        }
      } catch {
        errors.push({ source: dir, error: `Directory not found: ${resolvedDir}` });
        continue;
      }

      try {
        const dirEntries = await scanDirectory(resolvedDir, filePatterns);
        entries.push(...dirEntries);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        errors.push({ source: dir, error: `Failed to scan directory: ${message}` });
      }
    }

    return { entries, errors };
  },
});
