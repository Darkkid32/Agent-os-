# CI/CD Architecture

Agent OS uses GitHub Actions for continuous integration and deployment.

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          CI Pipeline                            │
├─────────────────────────────────────────────────────────────────┤
│  PR to main / Push to main                                      │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────┐                                                    │
│  │ Install │ ─── pnpm install --frozen-lockfile                 │
│  └────┬────┘                                                    │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────┐                                                    │
│  │  Build  │ ─── Build all packages, upload dist artifacts      │
│  └────┬────┘                                                    │
│       │                                                         │
│       ├─────────────────┬─────────────────┬─────────────────┐   │
│       ▼                 ▼                 ▼                 ▼   │
│  ┌─────────┐      ┌──────────┐      ┌──────────┐      ┌───────┐│
│  │  Lint   │      │Typecheck │      │   Test   │      │ Graph ││
│  └─────────┘      └──────────┘      └──────────┘      └───────┘│
│                                                                 │
│  ┌─────────────────┐      ┌─────────────────┐                   │
│  │   Benchmarks    │      │ Package Validate│                   │
│  └─────────────────┘      └─────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       Release Pipeline                          │
├─────────────────────────────────────────────────────────────────┤
│  Push to main                                                   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────┐                                            │
│  │ Full Validation │ ─── test, lint, typecheck, build, graph    │
│  └────────┬────────┘                                            │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │  Apply Changesets│ ─── version bumps, changelogs             │
│  └────────┬────────┘                                            │
│           │                                                     │
│           ├─────────────────┬─────────────────┐                 │
│           ▼                 ▼                 ▼                 │
│  ┌─────────────────┐ ┌──────────────┐ ┌─────────────────────┐  │
│  │   Release PR    │ │ Docker Build │ │   GitHub Release    │  │
│  └─────────────────┘ └──────────────┘ └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Workflows

### CI Workflow (`ci.yml`)

Triggers:
- Push to `main`
- Pull request to `main`

Jobs:
1. **install**: Cache and install dependencies
2. **build**: Build all packages, upload artifacts
3. **lint**: ESLint + Prettier checks
4. **typecheck**: TypeScript type checking
5. **test**: Run test suites
6. **graph-check**: Dependency graph validation
7. **benchmarks**: Performance benchmarks (on push or with label)
8. **package-validation**: Validate package structure

### Release Workflow (`release.yml`)

Triggers:
- Push to `main`

Jobs:
1. **release**: Full validation + apply changesets + create Release PR
2. **docker-release**: Build and push Docker images
3. **create-github-release**: Create GitHub Release with changelog

### CodeQL Workflow (`codeql.yml`)

Triggers:
- Push to `main`
- Pull request to `main`
- Weekly schedule (Monday 06:00)

Purpose: Security analysis

### Dependency Review (`dependency-review.yml`)

Triggers:
- All pull requests

Purpose: Review dependency changes

## Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_VERSION` | `20.11.1` | Node.js version |
| `PNPM_VERSION` | `9.12.0` | pnpm version |

## Secrets

| Secret | Description |
|--------|-------------|
| `GITHUB_TOKEN` | GitHub Actions token (automatic) |

## Caching Strategy

### pnpm Store

```yaml
- name: Cache pnpm modules
  uses: actions/cache@v4
  with:
    path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-
```

### Docker Layer Caching

```yaml
- name: Build and push
  uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

## Concurrency

CI and release workflows use concurrency groups to prevent duplicate runs:

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

## Job Timeouts

| Job | Timeout |
|-----|---------|
| Install | 15 min |
| Build | 15 min |
| Lint | 10 min |
| Typecheck | 10 min |
| Test | 15 min |
| Benchmarks | 15 min |
| Package Validation | 10 min |
| Release | 30 min |
| Docker Release | 30 min |

## Artifact Retention

- **dist-packages**: 1 day (used within workflow only)
- **Docker images**: Indefinite (in GHCR)
- **GitHub Releases**: Indefinite
