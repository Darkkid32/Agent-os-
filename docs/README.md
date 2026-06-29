# Documentation

This directory holds human-readable documentation for Agent OS.

## Layout

| Subdirectory      | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| `adr/`            | Architecture Decision Records (start with [`template.md`](./adr/template.md)). |
| `architecture/`   | Architecture-level documents: the overview, Hermes spec, and dependency rules. |
| `api/`            | HTTP API contracts and error envelope conventions.             |
| `diagrams/`       | Mermaid sources for dep-graph, sequence, and deployment views. |

## Index

- **[Architecture overview](./architecture/overview.md)** — vision, layers, data plane.
- **[Dependency rules](./architecture/dependency-rules.md)** — who can depend on whom; the contract that hermes follows.
- **[Hermes architecture](./architecture/hermes.md)** — Hermes integration layer: modules, lifecycle, public API, event model, future extensions.
- **[API overview](./api/overview.md)** — current `/health` + `/version`, planned Phase-2 endpoints, error catalog.
- **[Error envelope](./api/error-envelope.md)** — wire format and contract.
- **[Diagrams](./diagrams/README.md)** — how to render and add Mermaid sources.

## ADRs in repository

- [ADR-001](./adr/001-pnpm-workspaces.md) — pnpm workspaces.
- [ADR-002](./adr/002-strict-typescript.md) — strict TypeScript everywhere.
- [ADR-003](./adr/003-layered-package-graph.md) — the layered package graph.
- [ADR-004](./adr/004-fastify-over-express.md) — Fastify for the API.
- [ADR-005](./adr/005-openrouter-as-default-llm.md) — OpenRouter as the default LLM.
