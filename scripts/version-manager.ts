#!/usr/bin/env node

/**
 * Version Management Script
 *
 * Manages versions across the Agent OS monorepo.
 * Ensures version consistency and validates version formats.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

const ROOT_DIR = resolve(__dirname, '..');
const PACKAGES_DIR = join(ROOT_DIR, 'packages');
const APPS_DIR = join(ROOT_DIR, 'apps');
const ROOT_PACKAGE_JSON = join(ROOT_DIR, 'package.json');

interface PackageJson {
  name: string;
  version: string;
  private?: boolean;
}

interface PackageInfo {
  name: string;
  version: string;
  path: string;
  private: boolean;
}

/**
 * Get all workspace packages
 */
function getWorkspacePackages(): PackageInfo[] {
  const packages: PackageInfo[] = [];

  // Root package
  const rootPkg = JSON.parse(readFileSync(ROOT_PACKAGE_JSON, 'utf-8')) as PackageJson;
  packages.push({
    name: rootPkg.name,
    version: rootPkg.version,
    path: ROOT_PACKAGE_JSON,
    private: rootPkg.private ?? false,
  });

  // Packages directory
  const packageDirs = readdirSync(PACKAGES_DIR);
  for (const dir of packageDirs) {
    const pkgPath = join(PACKAGES_DIR, dir, 'package.json');
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJson;
      packages.push({
        name: pkg.name,
        version: pkg.version,
        path: pkgPath,
        private: pkg.private ?? false,
      });
    } catch {
      // Skip if package.json doesn't exist
    }
  }

  // Apps directory
  const appDirs = readdirSync(APPS_DIR);
  for (const dir of appDirs) {
    const pkgPath = join(APPS_DIR, dir, 'package.json');
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJson;
      packages.push({
        name: pkg.name,
        version: pkg.version,
        path: pkgPath,
        private: pkg.private ?? false,
      });
    } catch {
      // Skip if package.json doesn't exist
    }
  }

  return packages;
}

/**
 * Validate semver format
 */
function isValidSemver(version: string): boolean {
  const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;
  return semverRegex.test(version);
}

/**
 * Bump version
 */
function bumpVersion(currentVersion: string, bumpType: 'major' | 'minor' | 'patch'): string {
  const parts = currentVersion.split('.').map(Number);
  const major = parts[0] ?? 0;
  const minor = parts[1] ?? 0;
  const patch = parts[2] ?? 0;

  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * Update package version
 */
function updatePackageVersion(pkgPath: string, newVersion: string): void {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJson;
  pkg.version = newVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

/**
 * Sync versions across all packages
 */
function syncVersions(targetVersion: string): void {
  const packages = getWorkspacePackages();
  const updated: string[] = [];

  for (const pkg of packages) {
    if (pkg.version !== targetVersion) {
      updatePackageVersion(pkg.path, targetVersion);
      updated.push(pkg.name);
    }
  }

  if (updated.length > 0) {
    console.log(`Updated ${updated.length} packages to ${targetVersion}:`);
    updated.forEach((name) => console.log(`  - ${name}`));
  } else {
    console.log(`All packages already at version ${targetVersion}`);
  }
}

/**
 * Validate all package versions
 */
function validateVersions(): { valid: boolean; errors: string[] } {
  const packages = getWorkspacePackages();
  const errors: string[] = [];
  const versions = new Set<string>();

  for (const pkg of packages) {
    // Check version format
    if (!isValidSemver(pkg.version)) {
      errors.push(`${pkg.name}: invalid version format "${pkg.version}"`);
    }

    versions.add(pkg.version);
  }

  // Check version consistency
  if (versions.size > 1) {
    errors.push(`Inconsistent versions: ${Array.from(versions).join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get current version
 */
function getCurrentVersion(): string {
  const rootPkg = JSON.parse(readFileSync(ROOT_PACKAGE_JSON, 'utf-8')) as PackageJson;
  return rootPkg.version;
}

/**
 * Print version information
 */
function printVersionInfo(): void {
  const packages = getWorkspacePackages();
  const currentVersion = getCurrentVersion();

  console.log(`\nAgent OS Version Management`);
  console.log(`===========================\n`);
  console.log(`Current version: ${currentVersion}`);
  console.log(`Total packages: ${packages.length}\n`);

  // Group by version
  const byVersion = new Map<string, PackageInfo[]>();
  for (const pkg of packages) {
    const existing = byVersion.get(pkg.version) || [];
    existing.push(pkg);
    byVersion.set(pkg.version, existing);
  }

  console.log(`Version distribution:`);
  for (const [version, pkgs] of byVersion) {
    console.log(`  ${version}: ${pkgs.length} packages`);
  }

  // Validate
  const validation = validateVersions();
  if (validation.valid) {
    console.log(`\n✓ All versions are valid and consistent`);
  } else {
    console.log(`\n✗ Version issues found:`);
    validation.errors.forEach((err) => console.log(`  - ${err}`));
  }
}

/**
 * Main
 */
function main(): void {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'sync': {
      const version = args[1];
      if (!version) {
        console.error('Usage: version-manager.ts sync <version>');
        process.exit(1);
      }
      if (!isValidSemver(version)) {
        console.error(`Invalid version format: ${version}`);
        process.exit(1);
      }
      syncVersions(version);
      break;
    }

    case 'validate': {
      const validation = validateVersions();
      if (validation.valid) {
        console.log('✓ All versions are valid and consistent');
        process.exit(0);
      } else {
        console.error('✗ Version issues found:');
        validation.errors.forEach((err) => console.error(`  - ${err}`));
        process.exit(1);
      }
      break;
    }

    case 'bump': {
      const bumpType = args[1] as 'major' | 'minor' | 'patch';
      if (!['major', 'minor', 'patch'].includes(bumpType)) {
        console.error('Usage: version-manager.ts bump <major|minor|patch>');
        process.exit(1);
      }
      const current = getCurrentVersion();
      const newVersion = bumpVersion(current, bumpType);
      syncVersions(newVersion);
      break;
    }

    case 'info':
    default:
      printVersionInfo();
      break;
  }
}

main();
