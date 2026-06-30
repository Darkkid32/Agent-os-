# Release Process

This document describes how releases are created and published for Agent OS.

## Release Workflow

### Automated Releases (Recommended)

Releases are automated via GitHub Actions:

1. **PR to main**: CI runs all checks
2. **Merge to main**: Release workflow starts
3. **Changesets**: Version bumps and changelogs are generated
4. **Release PR**: Created automatically with version changes
5. **Publish**: When Release PR is merged, versions are published
6. **Docker Images**: Built and pushed to GHCR
7. **GitHub Release**: Created with changelog and artifacts

### Manual Releases

For manual releases:

```bash
# 1. Ensure all tests pass
pnpm run verify

# 2. Create a changeset
pnpm changeset

# 3. Apply changesets and update versions
pnpm run release

# 4. Commit changes
git add .
git commit -m "chore(release): version packages"

# 5. Tag the release
git tag -a v1.0.0 -m "Release v1.0.0"

# 6. Push
git push origin main --tags
```

## Release Artifacts

### Source Archives

Each release includes a source archive:
- `agent-os-<version>.tar.gz`

### Docker Images

Docker images are pushed to GitHub Container Registry:

```
ghcr.io/agent-os/api:<version>
ghcr.io/agent-os/dashboard:<version>
```

Tags:
- `latest`: Latest stable release
- `<version>`: Specific version
- `<major>.<minor>`: Minor version

### GitHub Releases

Each release creates a GitHub Release with:
- Changelog from commits
- Docker image references
- Source archive download

## Release Checklist

### Pre-release

- [ ] All tests pass (`pnpm run test`)
- [ ] Lint passes (`pnpm run lint`)
- [ ] Type-check passes (`pnpm run typecheck`)
- [ ] Build succeeds (`pnpm run build`)
- [ ] Dependency graph is valid (`pnpm run graph:check`)
- [ ] Packages are valid (`tsx scripts/validate-packages.ts`)
- [ ] Changelog is up to date

### Release

- [ ] Version is bumped
- [ ] Changesets are applied
- [ ] Git tag is created
- [ ] Push to main
- [ ] Release workflow completes
- [ ] Docker images are built
- [ ] GitHub Release is created

### Post-release

- [ ] Docker images are pulled and tested
- [ ] Documentation is updated
- [ ] Team is notified
- [ ] Release notes are reviewed

## Rollback Procedure

### If Issues Found After Release

1. **Immediate**: Revert the release commit
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Docker**: Remove affected images from GHCR
   ```bash
   gh api repos/OWNER/REPO/packages/container/IMAGE/versions/VERSION_ID -X DELETE
   ```

3. **GitHub Release**: Mark as pre-release or delete

4. **Notify**: Inform team of rollback

### If Issues Found During Release

1. **Stop**: Do not merge Release PR
2. **Fix**: Address issues in feature branch
3. **Re-run**: Trigger release workflow again

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 0.1.0 | - | Initial release |
