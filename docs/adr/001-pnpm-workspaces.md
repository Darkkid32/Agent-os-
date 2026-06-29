# ADR-001: pnpm workspaces over npm/yarn workspaces

## Status

Accepted (Phase 1.1).

## Context

Agent OS is a large multi-package TypeScript monorepo. We need:

- Strict topological dependency resolution that forbids circular imports.
- A single lockfile (`pnpm-lock.yaml`) reviewed in PRs.
- Fast installs with content-addressable storage on CI.

## Decision

Use **pnpm workspaces** (`pnpm-workspace.yaml`) with the following `.npmrc`
defaults:

- `shared-workspace-lockfile=true`
- `save-workspace-protocol=true` (so `package.json` shows `workspace:*` deps)
- `link-workspace-packages=true`
- `auto-install-peers=true`

## Consequences

- All packages resolve deterministically from the lockfile.
- The `workspace:*` protocol makes the dependency graph self-documenting in
  each `package.json`.
- CI installs are reproducible and fast.

## Alternatives Considered

- **Yarn 4 (Berry) PnP** — rejected because Next.js + Jest assume `node_modules`.
- **npm workspaces** — rejected because workspace protocol support lags and
  hoisting is more permissive (which encourages cycles).
- **Turbo / Nx** — adopted later as orchestrators, not now in Phase 1.1.

## References

- https://pnpm.io/workspaces
- https://pnpm.io/next/npmrc
