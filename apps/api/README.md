# @agent-os/api

Fastify-based HTTP API for Agent OS.

## Run

```bash
pnpm --filter @agent-os/api dev
```

## Endpoints

- `GET /health` — liveness, readiness, and diagnostics.
- `GET /version` — service identity.
- `GET /v1/*` — Hermes kernel REST routes (status, modules, config, health, plugins).
