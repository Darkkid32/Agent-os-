/**
 * Plugin Dependency Validation.
 *
 * Validates plugin dependency graphs before registration. Detects:
 * - Missing dependencies (required plugin not registered)
 * - Duplicate IDs (same plugin registered twice)
 * - Version conflicts (incompatible version ranges)
 *
 * Layer: 2 (Platform)
 * Dependencies: types
 */

import type {
  PluginDependencyResult,
  PluginVersionConflict,
  PluginRegistry,
  AgentPlugin,
} from './types.js';

/**
 * Parse a semver string into comparable components.
 * Supports basic MAJOR.MINOR.PATCH and prefix matching (e.g. "^1.0.0").
 */
const parseVersion = (
  version: string,
): { major: number; minor: number; patch: number; prefix: string } | undefined => {
  const match = version.match(/^([~^>=<]?)(\d+)\.(\d+)\.(\d+)/);
  if (match == null) return undefined;
  return {
    prefix: match[1] ?? '',
    major: parseInt(match[2] ?? '0', 10),
    minor: parseInt(match[3] ?? '0', 10),
    patch: parseInt(match[4] ?? '0', 10),
  };
};

const versionMatches = (required: string, available: string): boolean => {
  const req = parseVersion(required);
  const avail = parseVersion(available);
  if (req == null || avail == null) return required === available;

  // Exact match for no prefix
  if (req.prefix === '') {
    return req.major === avail.major && req.minor === avail.minor && req.patch === avail.patch;
  }

  // ^ means compatible with (>= required, < next major)
  if (req.prefix === '^') {
    return (
      avail.major === req.major &&
      (avail.minor > req.minor || (avail.minor === req.minor && avail.patch >= req.patch))
    );
  }

  // ~ means approximately (>= required, < next minor)
  if (req.prefix === '~') {
    return avail.major === req.major && avail.minor === req.minor && avail.patch >= req.patch;
  }

  // Default: exact match
  return req.major === avail.major && req.minor === avail.minor && req.patch === avail.patch;
};

/**
 * Validate a plugin's dependencies against the current registry state.
 */
export const validatePluginDependencies = (
  plugin: AgentPlugin,
  registry: PluginRegistry,
): PluginDependencyResult => {
  const missing: string[] = [];
  const versionConflicts: PluginVersionConflict[] = [];

  for (const dep of plugin.manifest.dependencies) {
    const record = registry.get(dep.id);
    if (record == null) {
      missing.push(dep.id);
      continue;
    }
    const availableVersion = record.plugin.manifest.version;
    if (!versionMatches(dep.version, availableVersion)) {
      versionConflicts.push({
        pluginId: plugin.manifest.id,
        required: dep.version,
        available: availableVersion,
      });
    }
  }

  return {
    valid: missing.length === 0 && versionConflicts.length === 0,
    missing,
    duplicates: [],
    versionConflicts,
  };
};

/**
 * Check for duplicate plugin IDs in a list of plugins.
 */
export const detectDuplicateIds = (plugins: readonly AgentPlugin[]): readonly string[] => {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const plugin of plugins) {
    if (seen.has(plugin.manifest.id)) {
      duplicates.push(plugin.manifest.id);
    }
    seen.add(plugin.manifest.id);
  }
  return duplicates;
};

/**
 * Comprehensive dependency validation for a set of plugins against a registry.
 * Checks missing dependencies, duplicates, and version conflicts.
 */
export const validateAllDependencies = (
  plugins: readonly AgentPlugin[],
  registry: PluginRegistry,
): PluginDependencyResult => {
  const duplicates = detectDuplicateIds(plugins);

  const allMissing: string[] = [];
  const allConflicts: PluginVersionConflict[] = [];

  for (const plugin of plugins) {
    const result = validatePluginDependencies(plugin, registry);
    allMissing.push(...result.missing);
    allConflicts.push(...result.versionConflicts);
  }

  return {
    valid: duplicates.length === 0 && allMissing.length === 0 && allConflicts.length === 0,
    missing: allMissing,
    duplicates,
    versionConflicts: allConflicts,
  };
};
