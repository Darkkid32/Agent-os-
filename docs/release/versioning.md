# Versioning Guide

Agent OS follows semantic versioning (semver) for all packages.

## Version Format

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
```

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)
- **PRERELEASE**: Optional pre-release identifier (e.g., `alpha.1`, `beta.2`)
- **BUILD**: Optional build metadata

## Version Strategy

### Current State

All packages are at version `0.1.0` and are private (not published to npm).

### When to Bump Versions

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Breaking API changes | MAJOR | 1.0.0 → 2.0.0 |
| New features | MINOR | 1.0.0 → 1.1.0 |
| Bug fixes | PATCH | 1.0.0 → 1.0.1 |
| Pre-release | PRERELEASE | 1.0.0-alpha.1 → 1.0.0-alpha.2 |

### Version Consistency

All workspace packages share the same version number. This simplifies release management and ensures compatibility.

```bash
# Check current version
pnpm run version:info

# Sync all packages to a specific version
pnpm run version:sync 1.2.3

# Bump all packages
pnpm run version:bump patch
pnpm run version:bump minor
pnpm run version:bump major
```

## Changesets

Agent OS uses [Changesets](https://github.com/changesets/changesets) for version management.

### Creating a Changeset

```bash
pnpm changeset
```

Follow the prompts to:
1. Select affected packages
2. Choose version bump type
3. Write a changeset description

### Applying Changesets

```bash
# Apply pending changesets and update versions
pnpm run release
```

This will:
1. Read all pending changesets
2. Update package versions
3. Generate changelogs
4. Update lockfile

## Pre-release Versions

For pre-release versions, use the changeset pre mode:

```bash
# Enter pre-release mode
pnpm changeset pre enter alpha

# Add changesets as normal
pnpm changeset

# Exit pre-release mode when ready
pnpm changeset pre exit
```

## Version Validation

The CI pipeline validates:

- All packages have valid semver versions
- All packages share the same version
- package.json structure is correct
- Build outputs exist and are valid

```bash
# Run validation locally
tsx scripts/validate-packages.ts
```
