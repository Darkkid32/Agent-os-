# Contributing to Agent OS

Thank you for contributing. This guide describes the workflow, tools, and
conventions every contributor must follow.

## Code of Conduct

Participation is governed by `CODE_OF_CONDUCT.md`. By signing a commit you
agree to its terms.

## Reporting issues

- Use GitHub issues for bug reports and feature requests.
- Use `security@agent-os.dev` for security disclosures (see `SECURITY.md`).

## Development setup

1. Install Node LTS and enable pnpm:
   ```bash
   corepack enable && corepack prepare pnpm@9.12.0 --activate
   ```
2. Install deps:
   ```bash
   pnpm install
   ```
3. Run the local CI loop before pushing:
   ```bash
   pnpm run verify
   ```

## Branch & commit conventions

- Branch names: `<type>/<scope>-<slug>` (e.g. `feat/api-health-endpoint`).
- Commits follow Conventional Commits (enforced by commitlint):
  - `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`,
    `build:`, `ci:`, `chore:`, `revert:`
  - Header ≤ 100 chars, lowercase subject, no trailing period.
- Pre-commit hook runs `lint-staged` (ESLint + Prettier) on staged files.
- Pre-push hook runs `pnpm run typecheck`.

## Pull requests

1. Open a PR against `main` with a clear summary and testing notes.
2. Ensure `ci.yml` is green.
3. Get at least one maintainer approval.
4. Squash-merge with the conventional commit header.

## Coding standards

- **TypeScript strict.** No `any`, no implicit returns, no shadowing.
- **No circular dependencies.** `scripts/check-cycles.ts` enforces this in CI.
- **Path aliases.** All new cross-package imports must use the aliases in
  `tsconfig.base.json`.
- **Zod at boundaries.** Inputs that cross package or network boundaries
  validate via Zod schemas in `@agent-os/shared`.
- **Tests.** New logic ships with tests (Phase 2+).

## Adding a package

1. Create `packages/<slug>/` with `package.json`, `tsconfig.json`,
   `tsconfig.build.json`, `.eslintrc.cjs`, `src/index.ts`, `README.md`.
2. Wire workspace deps with the `workspace:*` protocol.
3. Add the new alias to `tsconfig.base.json`.
4. Register the slug in `scripts/check-cycles.ts`.

## Release management

- Changesets live in `.changeset/`.
- PRs touching production code must include a changeset patch describing the
  user-visible effect.
- The release bot opens version PRs that `pnpm release` then merges.
