# API surface (Phase 1.1)

This document describes the public HTTP surface the API exposes today and the
contracts Phase 2 will land.

## Conventions

### Content type

All requests and responses are `application/json; charset=utf-8`. Clients
**must** send `Accept: application/json` to receive the structured error
envelope on failure.

### Errors

Every non-2xx response uses the `ErrorEnvelope` shape defined in
`@agent-os/shared`:

```ts
type ErrorEnvelope = {
  code: string;          // stable machine identifier, e.g. "validation.failed"
  message: string;       // safe-to-render summary
  details?: Record<string, unknown>;
  traceId?: string;      // correlates with OpenTelemetry spans
};
```

Failure modes are validated with **Zod** at the route boundary. New endpoints
must define an input schema in `@agent-os/shared` and a typed handler in
`apps/api/src/routes/<resource>.ts`.

### Versioning

The HTTP path embeds a single major version. Phase 2 introduces `/v1/`.
Phase 1.1 ships only the version-less endpoints listed below.

### Idempotency

`POST`/`PUT`/`PATCH` endpoints will accept the `Idempotency-Key` header in
Phase 2. Replays use the cached response.

### Authentication

Phase 1.1 does not authenticate. Phase 2 introduces bearer tokens and rotates
them through `@agent-os/api`'s secrets loader.

## Endpoints

### `GET /health`

Liveness probe. Always returns `200 OK`.

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok",
  "uptimeSeconds": 17
}
```

### `GET /version`

Service identity for tooling, deploy dashboards, and CI grep.

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "name": "@agent-os/api",
  "version": "1.0.0"
}
```

## Endpoints planned for Phase 2

| Method | Path                              | Purpose                                       |
| ------ | --------------------------------- | --------------------------------------------- |
| `POST` | `/v1/workflows`                   | Define a workflow version                     |
| `GET`  | `/v1/workflows`                   | List workflow versions                        |
| `GET`  | `/v1/workflows/:id`               | Read a workflow definition                    |
| `POST` | `/v1/workflows/:id/run`           | Trigger execution                             |
| `GET`  | `/v1/runs/:id`                    | Inspect a workflow run (state, errors, spans) |
| `GET`  | `/v1/runs`                        | List recent runs                              |
| `POST` | `/v1/agents/:id/invoke`           | Direct agent invocation (debug-mode)          |
| `GET`  | `/v1/agents`                      | List registered agents                        |
| `GET`  | `/v1/memory/:namespace/:key`      | Read a memory entry                           |
| `PUT`  | `/v1/memory/:namespace/:key`      | Write a memory entry                          |
| `GET`  | `/v1/events/stream`               | Subscribe to runtime events (SSE)             |

All Phase-2 routes are subject to the conformance rules described in the
header of this document.

## Error catalog

| HTTP | `code`                  | Meaning                                                  |
| ---- | ----------------------- | -------------------------------------------------------- |
| 400  | `validation.failed`     | Input did not match the Zod schema for the endpoint.     |
| 401  | `auth.required`         | No bearer token provided.                                |
| 403  | `auth.denied`           | Authenticated but not allowed.                           |
| 404  | `not_found`             | Resource does not exist.                                 |
| 409  | `conflict`              | State of the resource conflicts with the operation.      |
| 422  | `unprocessable.entity`  | Resource is well-formed but cannot be processed.         |
| 429  | `rate_limit.exceeded`   | Rate limit hit; back off and retry with `Retry-After`.   |
| 500  | `internal.error`        | Unexpected error. The trace will be in `traceId`.        |
| 503  | `dependency.unavailable`| A downstream (DB, cache, LLM) is unreachable.            |

Codes ending in `.failed`/`.required`/`.denied`/`.exceeded`/`.unavailable`
are stable and safe to surface in operator UIs.
