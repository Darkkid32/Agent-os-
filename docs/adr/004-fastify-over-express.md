# ADR-004: Fastify over Express for the API surface

## Status

Accepted (Phase 1.1).

## Context

Agent OS's API service must serialize concurrency across thousands of
workflow polls, streaming responses, and webhook callbacks. The framework
choice cascades into plugin shape, validation ergonomics, and dev velocity.

## Decision

Adopt **Fastify 5** for `apps/api`.

Reasons:

- **Schema-first.** Fastify integrates with `zod`/`typebox` directly; OpenAPI
  generation is built-in. We choose `@fastify/swagger` in Phase 2.
- **Performance.** Benchmarks show ~2× Express throughput for JSON I/O.
- **Plugin model.** Each subsystem (`/health`, `/v1/workflows`) is a clean
  Fastify plugin — the exact topology we'll need at scale.
- **TypeScript.** Fastify's type providers narrow request/response types
  end-to-end without manual casting.

## Consequences

- Every route lives in `apps/api/src/routes/<name>.ts` and is registered
  inside `apps/api/src/app.ts`.
- Plugins are pinned to Fastify-5-compatible majors (e.g.
  `@fastify/cors ^10`, `@fastify/helmet ^12`, `@fastify/sensible ^6`).
- JSON serialization is schema-driven; raw `JSON.stringify` in handlers is
  forbidden.

## Alternatives Considered

- **Express.** Default; loses schema-first benefits and is slower.
- **Hono.** Excellent edge perf, but the workflow runtime is Node-bound, and
  Hono's streaming story is thinner.
- **NestJS.** Would couple us to a meta-framework whose opinions overlap the
  ones we want from the package graph.

## References

- https://fastify.dev/
- https://fastify.dev/docs/latest/Reference/TypeScript/
