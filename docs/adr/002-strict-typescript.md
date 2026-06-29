# ADR-002: Strict TypeScript across all packages

## Status

Accepted (Phase 1.1).

## Context

Phase 2 will introduce runtime code with strict correctness requirements
(workflow execution, memory consistency). Sloppy TS settings now will cause
pain later.

## Decision

Enable the following TypeScript strict flags in `tsconfig.base.json`:

- `strict: true`
- `noImplicitAny: true`
- `noImplicitReturns: true`
- `noImplicitOverride: true`
- `noFallthroughCasesInSwitch: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `noUnusedLocals: true`, `noUnusedParameters: true`
- `isolatedModules: true`

## Consequences

- Every package must satisfy strict-mode rules before merge.
- ESLint forbids `any` (`@typescript-eslint/no-explicit-any: 'error'`).
- Path aliases declared once at the root and inherited by every sub-package.

## Alternatives Considered

- **Per-package tsconfig variants** — rejected; one base config removes
  drift between packages and makes upgrades atomic.

## References

- https://www.typescriptlang.org/tsconfig#strict
