# GitHub configuration

CI lives in `.github/workflows/`:

- `ci.yml` — install → lint + type-check → build. Required status for `main`.
- `codeql.yml` — weekly security scan for the TypeScript codebase.
- `dependency-review.yml` — blocks PRs that introduce disallowed licenses or
  risky version jumps.

Required repo secrets for full functionality:

- `GITHUB_TOKEN` — provided automatically; used to upload cached artifacts.

Optional (Phase 2+):

- `NPM_TOKEN` — release publishing.
