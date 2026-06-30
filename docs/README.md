# Documentation

This directory holds human-readable documentation for Agent OS.

## Layout

| Subdirectory      | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| `adr/`            | Architecture Decision Records (start with [`template.md`](./adr/template.md)). |
| `architecture/`   | Architecture-level documents: the overview, Hermes spec, and dependency rules. |
| `api/`            | HTTP API contracts and error envelope conventions.             |
| `configuration/`  | Configuration system: schema, validation, secrets, and examples. |
| `deployment/`     | Deployment guides: Docker, Docker Compose, and production setup. |
| `diagrams/`       | Mermaid sources for dep-graph, sequence, and deployment views. |
| `operations/`     | Operations guides: startup, shutdown, health monitoring, and diagnostics. |
| `performance/`    | Performance documentation: benchmarks, memory profiling, stress testing. |
| `release/`        | Release engineering: versioning, CI/CD, release process, and checklists. |
| `security/`       | Security documentation: authentication, authorization, and best practices. |

## Index

### Architecture
- **[Architecture overview](./architecture/overview.md)** — vision, layers, data plane.
- **[Dependency rules](./architecture/dependency-rules.md)** — who can depend on whom; the contract that hermes follows.
- **[Hermes architecture](./architecture/hermes.md)** — Hermes integration layer: modules, lifecycle, public API, event model, future extensions.
- **[Platform architecture](./architecture/platform.md)** — adapters, CLI, REST, Discord, Telegram, webhooks.
- **[Email architecture](./architecture/email.md)** — Email adapter: IMAP polling and SES webhook modes.
- **[WhatsApp architecture](./architecture/whatsapp.md)** — WhatsApp adapter: webhook mode, signature validation.

### API
- **[API overview](./api/overview.md)** — current `/health` + `/version`, planned Phase-2 endpoints, error catalog.
- **[Error envelope](./api/error-envelope.md)** — wire format and contract.

### Configuration
- **[Configuration system](./configuration/configuration.md)** — ConfigRegistry, ConfigProvider, ConfigLoader, precedence.
- **[Config schema](./configuration/schema.md)** — field types and validation rules.
- **[Configuration examples](./configuration/examples.md)** — code examples for common patterns.
- **[Secrets management](./configuration/secrets.md)** — SecretValue API for safe secret handling.

### Operations
- **[Startup lifecycle](./operations/startup.md)** — StartupManager with dependency resolution.
- **[Graceful shutdown](./operations/shutdown.md)** — ShutdownManager with signal handling.
- **[Health monitoring](./operations/health.md)** — liveness and readiness probes.
- **[Runtime diagnostics](./operations/diagnostics.md)** — memory usage, plugins, adapters, config.

### Performance
- **[Benchmarks](./performance/benchmarks.md)** — benchmark suite: categories, running, interpreting results.
- **[Memory profiling](./performance/memory.md)** — memory profiling tests and leak detection.
- **[Stress testing](./performance/stress-testing.md)** — concurrent operation tests.

### Release & Deployment
- **[CI/CD architecture](./release/ci-cd.md)** — GitHub Actions pipeline architecture.
- **[Release process](./release/releases.md)** — automated and manual release processes.
- **[Release checklist](./release/release-checklist.md)** — pre/post-release verification.
- **[Versioning guide](./release/versioning.md)** — semver strategy, Changesets workflow.
- **[Docker deployment](./deployment/docker.md)** — Docker Compose, health checks, troubleshooting.

### Security
- **[Authentication](./security/authentication.md)** — API keys, bearer tokens, role-based authorization.

### Diagrams
- **[Diagrams](./diagrams/README.md)** — how to render and add Mermaid sources.

## ADRs in repository

- [ADR-001](./adr/001-pnpm-workspaces.md) — pnpm workspaces.
- [ADR-002](./adr/002-strict-typescript.md) — strict TypeScript everywhere.
- [ADR-003](./adr/003-layered-package-graph.md) — the layered package graph.
- [ADR-004](./adr/004-fastify-over-express.md) — Fastify for the API.
- [ADR-005](./adr/005-openrouter-as-default-llm.md) — OpenRouter as the default LLM.
