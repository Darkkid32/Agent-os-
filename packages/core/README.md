# @agent-os/core

Foundational primitives, types, and utilities for the Agent OS runtime.

This package sits at the bottom of the dependency graph and MUST NOT depend on
any other `@agent-os/*` package.

## Responsibilities

- Generic brand types and identifier helpers.
- A `Result<T, E>` sum type for explicit success/failure propagation.
- `Timestamp` brand and `now()` helper.
- Shared invariants for the runtime (to be expanded in Phase 2).

## Status

Phase 1.1 skeleton. No business logic.
