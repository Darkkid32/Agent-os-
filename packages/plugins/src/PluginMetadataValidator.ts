/**
 * Plugin Metadata Validation.
 *
 * Validates plugin manifest metadata before registration. Ensures
 * required fields are present and well-formed.
 *
 * Layer: 2 (Platform)
 * Dependencies: types
 */

import type { PluginMetadataValidationResult, PluginManifest, PluginDependency } from './types.js';

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
const ID_PATTERN = /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/;

/**
 * Validate a plugin manifest. Returns a result with all validation errors.
 */
export const validatePluginManifest = (
  manifest: PluginManifest,
): PluginMetadataValidationResult => {
  const errors: string[] = [];

  // id
  if (manifest.id.length === 0) {
    errors.push('Plugin id is required');
  } else if (!ID_PATTERN.test(manifest.id)) {
    errors.push(
      `Plugin id "${manifest.id}" must be lowercase alphanumeric with hyphens, dots, or underscores`,
    );
  }

  // name
  if (manifest.name.length === 0) {
    errors.push('Plugin name is required');
  }

  // version
  if (manifest.version.length === 0) {
    errors.push('Plugin version is required');
  } else if (!SEMVER_PATTERN.test(manifest.version)) {
    errors.push(`Plugin version "${manifest.version}" must be valid semver (e.g. 1.0.0)`);
  }

  // author
  if (manifest.author.length === 0) {
    errors.push('Plugin author is required');
  }

  // description
  if (manifest.description.length === 0) {
    errors.push('Plugin description is required');
  }

  // minimumAgentOSVersion
  if (manifest.minimumAgentOSVersion.length === 0) {
    errors.push('Plugin minimumAgentOSVersion is required');
  } else if (!SEMVER_PATTERN.test(manifest.minimumAgentOSVersion)) {
    errors.push(
      `Plugin minimumAgentOSVersion "${manifest.minimumAgentOSVersion}" must be valid semver`,
    );
  }

  // capabilities
  if (!Array.isArray(manifest.capabilities)) {
    errors.push('Plugin capabilities must be an array');
  }

  // dependencies
  if (!Array.isArray(manifest.dependencies)) {
    errors.push('Plugin dependencies must be an array');
  } else {
    for (const dep of manifest.dependencies as PluginDependency[]) {
      if (dep.id.length === 0) {
        errors.push('Dependency id is required');
      }
      if (dep.version.length === 0) {
        errors.push(`Dependency version is required for "${dep.id}"`);
      } else if (!SEMVER_PATTERN.test(dep.version)) {
        errors.push(`Dependency version "${dep.version}" for "${dep.id}" must be valid semver`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate the current Agent OS version against a plugin's minimum requirement.
 */
export const validateAgentOSCompatibility = (
  manifest: PluginManifest,
  currentVersion: string,
): PluginMetadataValidationResult => {
  const errors: string[] = [];
  const current = parseSemver(currentVersion);
  const required = parseSemver(manifest.minimumAgentOSVersion);

  if (current == null) {
    errors.push(`Cannot parse current Agent OS version "${currentVersion}"`);
  }
  if (required == null) {
    errors.push(`Cannot parse required version "${manifest.minimumAgentOSVersion}"`);
  }

  if (current != null && required != null) {
    if (
      current.major < required.major ||
      (current.major === required.major && current.minor < required.minor) ||
      (current.major === required.major &&
        current.minor === required.minor &&
        current.patch < required.patch)
    ) {
      errors.push(
        `Plugin requires Agent OS >= ${manifest.minimumAgentOSVersion}, current is ${currentVersion}`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

const parseSemver = (
  version: string,
): { major: number; minor: number; patch: number } | undefined => {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (match == null) return undefined;
  return {
    major: parseInt(match[1] ?? '0', 10),
    minor: parseInt(match[2] ?? '0', 10),
    patch: parseInt(match[3] ?? '0', 10),
  };
};
