#!/usr/bin/env node

/**
 * Package Validation Script
 *
 * Validates all workspace packages for:
 * - package.json structure and required fields
 * - exports configuration
 * - type declarations
 * - build outputs (dist directory)
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, resolve, relative } from 'path';

const ROOT_DIR = resolve(__dirname, '..');
const PACKAGES_DIR = join(ROOT_DIR, 'packages');
const APPS_DIR = join(ROOT_DIR, 'apps');

interface ValidationError {
  package: string;
  field: string;
  message: string;
}

interface PackageJson {
  name: string;
  version: string;
  description?: string;
  main?: string;
  types?: string;
  exports?: Record<string, unknown>;
  files?: string[];
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  private?: boolean;
  license?: string;
  repository?: string | { type: string; url: string };
  engines?: Record<string, string>;
}

/**
 * Required fields for package.json
 */
const REQUIRED_FIELDS = ['name', 'version', 'license'];

/**
 * Validate package.json structure
 */
function validatePackageJson(pkg: PackageJson, pkgPath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const pkgName = pkg.name || relative(ROOT_DIR, pkgPath);

  // Required fields
  for (const field of REQUIRED_FIELDS) {
    if (!pkg[field as keyof PackageJson]) {
      errors.push({
        package: pkgName,
        field,
        message: `Missing required field: ${field}`,
      });
    }
  }

  // Version format
  if (pkg.version && !/^\d+\.\d+\.\d+/.test(pkg.version)) {
    errors.push({
      package: pkgName,
      field: 'version',
      message: `Invalid version format: ${pkg.version}`,
    });
  }

  // License format
  if (pkg.license && typeof pkg.license !== 'string') {
    errors.push({
      package: pkgName,
      field: 'license',
      message: `License must be a string`,
    });
  }

  // Exports validation
  if (pkg.exports) {
    if (typeof pkg.exports !== 'object') {
      errors.push({
        package: pkgName,
        field: 'exports',
        message: `Exports must be an object`,
      });
    } else {
      // Check for package main entry
      if (!pkg.exports['.'] && !pkg.exports['./package.json']) {
        errors.push({
          package: pkgName,
          field: 'exports',
          message: `Missing "." or "./package.json" export`,
        });
      }
    }
  }

  // Types validation
  if (pkg.types && !pkg.exports) {
    errors.push({
      package: pkgName,
      field: 'types',
      message: `Types specified but no exports configuration`,
    });
  }

  return errors;
}

/**
 * Validate build outputs
 */
function validateBuildOutputs(pkg: PackageJson, pkgDir: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const pkgName = pkg.name || relative(ROOT_DIR, pkgDir);

  // Skip apps - they have different build structures
  if (pkgDir.includes('\\apps\\') || pkgDir.includes('/apps/')) {
    return errors;
  }

  // Skip packages without build script
  if (!pkg.scripts?.build) {
    return errors;
  }

  const distDir = join(pkgDir, 'dist');

  // Check if dist directory exists for packages with build script
  if (!existsSync(distDir)) {
    errors.push({
      package: pkgName,
      field: 'dist',
      message: `Build output directory "dist" not found`,
    });
    return errors;
  }

  // Check for entry points in dist
  const entryPoints = ['index.js', 'server.js', 'cli.js'];
  const typeEntryPoints = ['index.d.ts', 'server.d.ts', 'cli.d.ts'];

  const hasEntry = entryPoints.some((ep) => existsSync(join(distDir, ep)));
  const hasTypes = typeEntryPoints.some((ep) => existsSync(join(distDir, ep)));

  if (!hasEntry) {
    errors.push({
      package: pkgName,
      field: 'dist/index.js',
      message: `Missing main entry point in dist/`,
    });
  }

  if (!hasTypes) {
    errors.push({
      package: pkgName,
      field: 'dist/index.d.ts',
      message: `Missing type declaration in dist/`,
    });
  }

  return errors;
}

/**
 * Validate exports configuration
 */
function validateExports(pkg: PackageJson, pkgDir: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const pkgName = pkg.name || relative(ROOT_DIR, pkgDir);

  if (!pkg.exports) {
    return errors;
  }

  // Check if export paths exist
  for (const [exportPath, config] of Object.entries(pkg.exports)) {
    // Skip wildcard paths and CSS files
    if (exportPath.includes('*') || exportPath.endsWith('.css')) {
      continue;
    }

    if (typeof config === 'string') {
      // Simple string export
      const exportFile = join(pkgDir, exportPath);
      if (!existsSync(exportFile)) {
        errors.push({
          package: pkgName,
          field: `exports.${exportPath}`,
          message: `Export path does not exist: ${exportPath}`,
        });
      }
    } else if (typeof config === 'object' && config !== null) {
      // Conditional export
      const conditionalConfig = config as Record<string, unknown>;
      const types = conditionalConfig.types || conditionalConfig['@types'];
      if (types && typeof types === 'string') {
        const typesFile = join(pkgDir, types);
        if (!existsSync(typesFile)) {
          errors.push({
            package: pkgName,
            field: `exports.${exportPath}.types`,
            message: `Types path does not exist: ${types}`,
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Validate a single package
 */
function validatePackage(pkgDir: string): ValidationError[] {
  const pkgPath = join(pkgDir, 'package.json');
  const errors: ValidationError[] = [];

  if (!existsSync(pkgPath)) {
    return [
      {
        package: relative(ROOT_DIR, pkgDir),
        field: 'package.json',
        message: 'package.json not found',
      },
    ];
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJson;

    errors.push(...validatePackageJson(pkg, pkgPath));
    errors.push(...validateBuildOutputs(pkg, pkgDir));
    errors.push(...validateExports(pkg, pkgDir));
  } catch (err) {
    errors.push({
      package: relative(ROOT_DIR, pkgDir),
      field: 'package.json',
      message: `Failed to parse package.json: ${err}`,
    });
  }

  return errors;
}

/**
 * Get all workspace directories
 */
function getWorkspaceDirs(): string[] {
  const dirs: string[] = [];

  // Packages
  if (existsSync(PACKAGES_DIR)) {
    const packageDirs = readdirSync(PACKAGES_DIR);
    for (const dir of packageDirs) {
      const pkgDir = join(PACKAGES_DIR, dir);
      if (statSync(pkgDir).isDirectory()) {
        dirs.push(pkgDir);
      }
    }
  }

  // Apps
  if (existsSync(APPS_DIR)) {
    const appDirs = readdirSync(APPS_DIR);
    for (const dir of appDirs) {
      const appDir = join(APPS_DIR, dir);
      if (statSync(appDir).isDirectory()) {
        dirs.push(appDir);
      }
    }
  }

  return dirs;
}

/**
 * Main validation
 */
function main(): void {
  console.log('\nPackage Validation');
  console.log('==================\n');

  const dirs = getWorkspaceDirs();
  const allErrors: ValidationError[] = [];

  for (const dir of dirs) {
    const errors = validatePackage(dir);
    allErrors.push(...errors);
  }

  // Report results
  if (allErrors.length === 0) {
    console.log('✓ All packages are valid\n');
    process.exit(0);
  } else {
    console.log(`✗ Found ${allErrors.length} validation errors:\n`);

    // Group by package
    const byPackage = new Map<string, ValidationError[]>();
    for (const err of allErrors) {
      const existing = byPackage.get(err.package) || [];
      existing.push(err);
      byPackage.set(err.package, existing);
    }

    for (const [pkg, errors] of byPackage) {
      console.log(`  ${pkg}:`);
      for (const err of errors) {
        console.log(`    - [${err.field}] ${err.message}`);
      }
    }

    console.log('');
    process.exit(1);
  }
}

main();
