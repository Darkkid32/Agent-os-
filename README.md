# Agent OS

> **Phase 1.1 — Repository & Engineering Foundation.** The full monorepo and
> tooling exist; no business logic, agents, or Hermes functionality has been
> implemented.

Agent OS is a runtime and operations platform for production AI agents. It
gives teams the same kind of operating-system guarantees — supervised
lifecycle, deterministic observability, replaceable adapters, versionable
workflows — for agent workloads that Kubernetes gives for stateless
services.

The repository is a strict-TypeScript pnpm-workspace monorepo with two
deployable apps and twelve focused packages.

---

## Project vision

1. **Own the agent lifecycle.** Spawn, supervise, drain, and shut down agents
   the way `systemd` supervises long-running processes.
2. **Treat workflows as first-class units.** Versioned, replayable, and
   inspectable end-to-end.
3. **Ship an adapter surface.** Author a single TypeScript file and plug a
   model provider, vector store, or external tool into the runtime.
4. **Observe everything.** Every node is traced under a single OpenTelemetry
   pipeline; metrics and logs route to the same back-end.

Phase 2 turns these requirements into runnable workflows and a fully wired
runtime. Phase 1.1 is the foundation phase: the engine the rest of the work
runs on.

---

## Architecture overview

```
                ┌──────────────────────────────────────────────────┐
   Surfaces     │  apps/api (Fastify)         apps/dashboard (Next) │
                └──────────────────────────────────────────────────┘
                                  │
                ┌─────────────────┼──────────────────┐
   Domain       │       ui      adapters-sdk       adapters          │
                └─────────────────┼──────────────────┘
                                  │
                ┌─────────┬───────┴──────┬─────────┬──────────────┐
   Platform     │ agents │  workflow    │ memory  │ event-bus │ observability│
                └─────────┴──────────────┴─────────┴──────────────┘
                                  │
                ┌─────────────────┴──────────────────┐
   Foundation   │           core         shared         │
                └──────────────────────────────────────┘
```

`hermes` sits one layer below `apps/*` and depends only on a controlled set
of platform packages; it does **not** depend on every package. The rules
live in [`docs/architecture/dependency-rules.md`](docs/architecture/dependency-rules.md).

For the full architecture document see
[`docs/architecture/overview.md`](docs/architecture/overview.md); for the API
surface, [`docs/api/overview.md`](docs/api/overview.md).

---

## Repository structure

```
agent-os/
├── apps/
│   ├── api/                    Fastify HTTP API (Phase 1.1: health, version)
│   └── dashboard/              Next.js operator UI (Phase 1.1: landing)
├── packages/
│   ├── core/                   Foundation: Result, brand types, identifier helpers
│   ├── shared/                 Foundation: Zod schemas, ErrorEnvelope
│   ├── event-bus/              Platform: pub/sub envelope contracts
│   ├── memory/                 Platform: store contracts for records + namespaces
│   ├── runtime/                Platform: lifecycle + RuntimePort
│   ├── workflow/               Platform: DAG definitions
│   ├── observability/          Platform: OpenTelemetry wiring (no-op default)
│   ├── agents/                 Domain: AgentSpec, AgentMessage, AgentPort
│   ├── adapters-sdk/           Domain: SDK authors implement
│   ├── adapters/               Domain: built-in adapter implementations (Phase 2)
│   ├── ui/                     Domain: React + Tailwind + shadcn/ui primitives
│   └── hermes/                 Surface: top-level integration (Phase 2)
├── docs/                       Architecture, ADRs, API docs, diagrams
├── docker/                     Per-app Dockerfiles + compose files
├── scripts/                    Repo utilities (cycle detection, path validation, tree)
├── obsidian/                   Reserved: Obsidian vault mirror
├── graphify/                   Reserved: graph utilities
└── .github/workflows/          CI: install, lint, typecheck, build, codeql, dep-review
```

Per-package contracts are documented in each `packages/*/README.md`. Per-app
contracts live in `apps/*/README.md`.

---

## Development setup

### Prerequisites

- **Node.js 20.11+ (LTS).** Older minor versions are not supported.
- **pnpm 9.x.** `npm i -g pnpm@9.12.0` if you don't have corepack, or
  `corepack enable && corepack prepare pnpm@9.12.0 --activate`.
- **Docker 24+** (optional) — only needed to exercise the compose stack.

### First run

```bash
pnpm install                    # one-time install across the workspace
pnpm verify                     # lint + typecheck + build
pnpm --filter @agent-os/api run dev       # start the API (http://localhost:4000)
pnpm --filter @agent-os/dashboard run dev # start the dashboard (http://localhost:3000)
```

Environment overrides come from `docker/.env.example`. Copy it to
`docker/.env` and edit.

### Docker-based stack

```bash
docker compose -f docker/docker-compose.yml \
  --env-file docker/.env.example \
  up --build
```

For local development with hot reload, add the dev overlay:

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
  --env-file docker/.env.example \
  up --build
```

---

## Commands

### Workspace

| Command                  | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| `pnpm install`           | Install all workspace deps                            |
| `pnpm verify`            | Lint + typecheck + build (single, fast loop)          |
| `pnpm lint`              | ESLint + Prettier check                               |
| `pnpm lint:eslint`       | ESLint only                                           |
| `pnpm lint:prettier`     | Prettier check only                                   |
| `pnpm format`            | Prettier write                                        |
| `pnpm typecheck`         | Repository-wide `tsc --noEmit`                        |
| `pnpm build`             | Build all packages then all apps                      |
| `pnpm test`              | Forwarded to every workspace's `test` script         |
| `pnpm clean`             | Remove `dist/`, `.next/`, etc.                        |
| `pnpm commitlint`        | Validate the working commit message                   |
| `pnpm release`           | Apply Changesets and publish versions                 |

### Per-package

Filter by workspace name:

```bash
pnpm --filter @agent-os/api run dev
pnpm --filter @agent-os/dashboard build
pnpm --filter @agent-os/observability typecheck
```

Run on every workspace in parallel:

```bash
pnpm -r --parallel run typecheck
```

---

## Coding standards

- **Strict TypeScript.** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, no implicit returns. No `any` (enforced by ESLint).
- **No circular dependencies.** `scripts/check-cycles.ts` runs in CI.
- **Layered package graph.** See [`docs/architecture/dependency-rules.md`](docs/architecture/dependency-rules.md).
- **Zod at boundaries.** Inputs that cross package or network boundaries validate via schemas in `@agent-os/shared`.
- **Conventional commits** (commitlint + husky). PR titles follow `type(scope): subject`.
- **Path aliases.** Cross-package imports go through `@agent-os/*` packages, not relative paths.

---

## Roadmap

| Phase | Theme | Outcome |
| ----- | ----- | ------- |
| **1.1** ✅ | Engineering foundation | Monorepo, tooling, CI, Docker. No business logic. |
| **1.2** | Repo polish | Add `madge` dependency-lint, sample code-path tests, dashboard top-nav. |
| **2** | Runtime MVP | Workflow execution, Postgres+Redis adapters, `/v1/workflows.*` API, dashboard timeline view. |
| **3** | Hermes initial cut | `hermes` integration layer that composes agent + workflow + memory ports. |
| **4** | Multi-tenant & ops | Auth, quotas, audit logs, Grafana dashboards. |
| **5** | Self-hosted LLMs | Optional local model serving with proper resource caps. |

Detailed ADRs summarise the choices taken so far:

- [ADR-001 pnpm workspaces](docs/adr/001-pnpm-workspaces.md)
- [ADR-002 strict TypeScript](docs/adr/002-strict-typescript.md)
- [ADR-003 layered package graph](docs/adr/003-layered-package-graph.md)
- [ADR-004 Fastify over Express](docs/adr/004-fastify-over-express.md)
- [ADR-005 OpenRouter as default LLM](docs/adr/005-openrouter-as-default-llm.md)

---

## License

Apache 2.0 — see [`LICENSE`](LICENSE).
