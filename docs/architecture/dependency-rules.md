# Package dependency rules

This file is the contract every `@agent-os/*` package must follow. The
contract is enforced both by code review and by `scripts/check-cycles.ts`.

## Layered graph

The repo is split into four layers. A package may only depend on packages in
its own layer or in lower-numbered layers. A package **must not** depend on a
package in a higher-numbered layer.

| Layer | Packages |
| ----- | -------- |
| 1 — Foundation | `core`, `shared` |
| 2 — Platform | `event-bus`, `memory`, `runtime`, `workflow`, `observability`, `config`, `auth`, `plugins` |
| 3 — Domain | `agents`, `plugin-sdk`, `adapters`, `ui` |
| 4 — Surfaces | `hermes`, `benchmarks` |

In addition:

- `apps/api` may depend on any layer 1–3 package, **not** `hermes` directly.
- `apps/dashboard` may depend on layers 1, 2, and on `ui` only.

### Why this matters

- `hermes` is the top-level integration layer that orchestrates agents,
  workflows, memory and adapters. Every dependency on `hermes` is a coupling
  that defeats the layering and makes Phase 2 impossible to compose. The
  rule **"Hermes must not directly depend on every package"** is enforced by
  inspection — `hermes` is allowed to depend on `core`, `shared`, `runtime`,
  `observability`, and `event-bus` for the eventual integration — but never
  on `adapters`, `memory`, or `agents` directly.

- `adapters` are the only packages allowed to depend on concrete third-party
  SDKs (HTTP clients, vector stores, etc.). `plugin-sdk` exports the contract
  third parties implement.

- `ui` and `apps/dashboard` are the only nodes allowed to depend on React.
  Every other package is headless.

## Allowed matrix (source of truth)

| From        | May depend on (in this repo)                                       |
| ----------- | ------------------------------------------------------------------ |
| `core`      | _(none)_                                                           |
| `shared`    | `core`                                                             |
| `event-bus` | `core`                                                             |
| `memory`    | `core`                                                             |
| `runtime`   | `core`, `observability`                                            |
| `workflow`  | `core`                                                             |
| `agents`    | `core`, `runtime`                                                  |
| `adapters-sdk` | `core`                                                          |
| `adapters`  | `core`, `adapters-sdk`                                             |
| `observability` | `core`                                                         |
| `config`     | `core`, `observability`                                            |
| `ui`        | _(none — only Tailwind + React)_                                   |
| `hermes`    | `core`, `runtime`, `observability`, `event-bus`                    |
| `apps/api`  | `core`, `shared`, `runtime`, `observability`, `config`, `auth`     |
| `apps/dashboard` | `core`, `shared`, `ui`                                       |

## Enforcement

Three mechanisms keep the graph honest:

1. **Review-time.** Each PR that changes `packages/*/package.json` must call
   out which layer it touches and justify cross-layer links.
2. **Cycles.** `scripts/check-cycles.ts` walks the workspace dep graph and
   fails the build on any cycle.
3. **CI job.** Phase 2 adds `dependency-lint` to `.github/workflows/ci.yml`
   that runs `pnpm dlx madge` against the package graph and fails on
   disallowed edges.

## Anti-patterns (forbidden)

- An `adapters/*` package importing from `agents/*`. Adapters interact with
  agents through the port defined by `runtime` — never directly.
- Picking up React anywhere except `ui` and the dashboard.
- Using `luxon`, `dayjs`, or any date library — `_ISO_8601` strings only.
- Importing from `dist/` paths of another package. Always import via the
  public package name (`@agent-os/core`).
