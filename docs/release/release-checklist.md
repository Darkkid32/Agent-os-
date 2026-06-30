# Release Checklist

Use this checklist before and after each release.

## Pre-release Verification

### Code Quality

- [ ] All tests pass: `pnpm run test`
- [ ] Lint passes: `pnpm run lint`
- [ ] Type-check passes: `pnpm run typecheck`
- [ ] Build succeeds: `pnpm run build`
- [ ] Dependency graph is valid: `pnpm run graph:check`
- [ ] Packages are valid: `tsx scripts/validate-packages.ts`

### Documentation

- [ ] CHANGELOG.md is up to date
- [ ] README.md reflects current state
- [ ] API documentation is current
- [ ] Release notes are prepared

### Dependencies

- [ ] No known vulnerabilities
- [ ] Dependencies are up to date
- [ ] Lockfile is current

## Release Process

### Version Management

- [ ] Version bump type is determined (major/minor/patch)
- [ ] Changesets are created
- [ ] Versions are synced across packages
- [ ] Version format is valid semver

### Git Operations

- [ ] All changes are committed
- [ ] Main branch is up to date
- [ ] No uncommitted changes
- [ ] Git tag is created (format: `v<version>`)
- [ ] Changes are pushed to origin

### CI/CD

- [ ] Release workflow is triggered
- [ ] All CI checks pass
- [ ] Release PR is created (if using changesets)
- [ ] Release PR is merged

### Docker Images

- [ ] API image is built
- [ ] Dashboard image is built
- [ ] Images are pushed to GHCR
- [ ] Images are tagged correctly:
  - [ ] `ghcr.io/agent-os/api:<version>`
  - [ ] `ghcr.io/agent-os/dashboard:<version>`
  - [ ] `ghcr.io/agent-os/api:latest`
  - [ ] `ghcr.io/agent-os/dashboard:latest`

### GitHub Release

- [ ] GitHub Release is created
- [ ] Release tag is correct
- [ ] Changelog is included
- [ ] Source archive is attached
- [ ] Release is marked as latest

## Post-release Verification

### Smoke Tests

- [ ] Docker images pull successfully
- [ ] API container starts and responds to health checks
- [ ] Dashboard container starts and loads
- [ ] Database migrations run successfully (if applicable)
- [ ] Authentication works (if applicable)

### Deployment Verification

- [ ] Production environment is updated
- [ ] All services are healthy
- [ ] No error spikes in logs
- [ ] Performance metrics are normal
- [ ] User-facing features work

### Communication

- [ ] Team is notified of release
- [ ] Release notes are shared
- [ ] Any breaking changes are documented
- [ ] Migration guide is provided (if applicable)

## Rollback Procedure

### Immediate Rollback (< 1 hour)

1. **Revert commit**:
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Remove Docker images**:
   ```bash
   # List versions
   gh api repos/OWNER/REPO/packages/container/api/versions
   
   # Delete specific version
   gh api repos/OWNER/REPO/packages/container/api/versions/VERSION_ID -X DELETE
   ```

3. **Update GitHub Release**:
   - Mark as pre-release or
   - Delete the release

4. **Notify team** of rollback

### Delayed Rollback (> 1 hour)

1. **Create hotfix branch**:
   ```bash
   git checkout -b hotfix/rollback-v1.0.0 main
   ```

2. **Revert changes**:
   ```bash
   git revert <commit-sha>
   ```

3. **Create new release**:
   ```bash
   git commit -m "fix: rollback v1.0.0"
   git push origin hotfix/rollback-v1.0.0
   ```

4. **Create PR and merge**

5. **Tag new release**:
   ```bash
   git tag -a v1.0.1 -m "Rollback v1.0.0"
   git push origin main --tags
   ```

6. **Notify team** of rollback

## Troubleshooting

### Release Workflow Fails

1. Check GitHub Actions logs
2. Identify failing step
3. Fix issue in feature branch
4. Create PR and merge
5. Re-run release workflow

### Docker Build Fails

1. Check Dockerfile syntax
2. Verify base image availability
3. Check for dependency issues
4. Review build context

### Version Mismatch

1. Run version sync: `pnpm run version:sync <version>`
2. Commit changes
3. Push to main

### Changeset Issues

1. Check `.changeset/` directory
2. Verify changeset format
3. Remove invalid changesets
4. Create new changeset

## Release Schedule

### Regular Releases

- **Frequency**: As needed (features, fixes)
- **Day**: Any day
- **Time**: Preferably during business hours

### Hotfix Releases

- **Frequency**: As needed (critical fixes)
- **Day**: Any day
- **Time**: Immediate

### Scheduled Releases

- **Frequency**: Weekly/Monthly (if applicable)
- **Day**: Designated day
- **Time**: Designated time

## Version History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 0.1.0 | - | - | Initial release |
