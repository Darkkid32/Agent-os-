# Architecture overview

> Phase 1.1 ships **engineering scaffolding only** — no business logic. This
> document describes the *shape* of the system so Phase 2 lands coherently.

## Vision

Agent OS is a runtime and operations platform for production AI agents. The
goal is to give teams the same kind of operating-system-level guarantees
(process isolation, observability, lifecycle management, upgradeable
contracts) for agents that Kubernetes gives for stateless services.

Concretely, Agent OS:

1. **Owns the agent lifecycle.** Spawn, supervise, drain, and shut down
   agents the way `systemd` supervises long-running processes.
2. **Treats workflows as first-class units.** Versioned, replayable, and
   inspectable end-to-end.
3. **Ships an adapter surface.** Author a single TypeScript file and plug a
   model provider, vector store, or external tool into the runtime.
4. **Observes everything.** Every node is traced under a single
   OpenTelemetry pipeline; metrics and logs route to the same back-end.

## Layered architecture

```
                ┌──────────────────────────────────────────────────┐
   Surfaces     │  apps/api (Fastify)         apps/dashboard (Next) │
                └──────────────────────────────────────────────────┘
                                  │
                ┌─────────────────┼──────────────────┐
   Domain       │      ui       adapters-sdk       adapters         │
                └─────────────────┼──────────────────┘
                                  │
                ┌─────────┬───────┴──────┬─────────┬──────────────┐
   Platform     │ agents │  workflow    │ memory  │ event-bus │ observability │
                └─────────┴──────────────┴─────────┴──────────────┘
                                  │
                ┌─────────────────┴──────────────────┐
   Foundation   │           core         shared         │
                └──────────────────────────────────────┘
```

`hermes` is a top-level integration package that may depend on **core,
runtime, observability, event-bus** — *never* on every package. See
[`dependency-rules.md`](./dependency-rules.md).

## Runtime topology (Phase 2 target)

```
   ┌────────────┐    HTTP/JSON     ┌─────────┐
   │  operator  │ ───────────────▶ │   api   │
   │ dashboard  │ ◀──── sse ───── │ (Fastify)│
   └────────────┘                  └────┬────┘
                                        │
                                        │ in-process
                                        ▼
                                  ┌───────────┐
                                  │  runtime  │──┐
                                  └─────┬─────┘  │
                                        │       │
                ┌──────────┬───────────┼───────┼─────┬───────────┐
                ▼          ▼           ▼       ▼     ▼           ▼
           event-bus    memory    agents  workflow  adapters   observability
                                        │
                                        ▼
                                     hermes (Phase 3)
```

`services` (DB + cache) live behind `adapters` and are accessed through the
`adapters-sdk` contract. The dashboard never talks to the database directly —
it goes through the API.

## Quality attributes

| Attribute         | How Agent OS achieves it                              |
| ----------------- | ----------------------------------------------------- |
| Testability       | Every adapter is injected; no module-level singletons. |
| Replaceability    | Adapters, drivers, and toolchains are versioned.      |
| Observability     | `@opentelemetry/api` tracer wired at the runtime boundary. |
| Operability       | `apps/api` exposes health/version; SIGTERM-aware shutdown. |
| Type safety       | Strict TS, no `any`, path aliases centralized in root. |
| Build determinism | A single lockfile; `pnpm --frozen-lockfile` in CI.    |

## Process model

- **`apps/api`** is the sole network-facing process. Fastify boots, registers
  routes, and waits for `SIGINT`/`SIGTERM` to drain in-flight requests.
- **`apps/dashboard`** is a stateless Next.js app — scale horizontally.
- **Workers** (Phase 2) will run inside the API process under a single
  supervisor. Long-running tasks land in a queue (Redis-backed) to keep the
  Fastify event loop responsive.

## Data plane (Phase 2 — not implemented)

| Data          | Store          | Owner             |
| ------------- | -------------- | ----------------- |
| Workflow runs | Postgres       | `memory` adapter  |
| Event stream  | Redis Streams  | `event-bus` impl  |
| LLM cache     | Redis + TTL    | `adapters/llm`    |
| Traces        | OTLP collector | `observability`   |

## Non-goals (Phase 1 + Phase 2)

- Multi-tenant isolation.
- GPU pooling / inference scheduling.
- Self-hosted model serving.
- Web UI beyond an operator-facing dashboard.

These land (or are rejected) in later phases.

## Where to read next

- [Dependency rules](./dependency-rules.md) — who can depend on whom.
- [API surface](../api/overview.md).
- Diagrams: [dependency graph](../diagrams/dependency-graph.mmd),
  [request flow](../diagrams/request-flow.mmd).
- ADRs explaining the choices: [ADR-001](../adr/001-pnpm-workspaces.md),
  [ADR-002](../adr/002-strict-typescript.md),
  [ADR-003](../adr/003-layered-package-graph.md),
  [ADR-004](../adr/004-fastify-over-express.md),
  [ADR-005](../adr/005-openrouter-as-default-llm.md).
