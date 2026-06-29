# HTTP API — error envelope

> Versioning policy for `ErrorEnvelope` lives in [`./overview.md`](./overview.md).

The platform standardizes on a single error wire format across every API
surface and every internal RPC that crosses a process boundary.

## Shape

```ts
type ErrorEnvelope = {
  /** stable machine identifier; never localized */
  code: string;
  /** human-readable summary; safe to render to operators */
  message: string;
  /** machine-structured detail, e.g. Zod field errors */
  details?: Record<string, unknown>;
  /** OpenTelemetry trace ID; injectable for support tickets */
  traceId?: string;
};
```

## Example

```json
{
  "code": "validation.failed",
  "message": "Input did not match the schema for POST /v1/workflows.",
  "details": {
    "issues": [
      { "path": "steps[2].tool", "message": "must be a known tool name" }
    ]
  },
  "traceId": "01HMRX3D5YJ7K2Q9P1B6N4C8XE"
}
```

## Rules

- `code` is a dotted slug in lower-case. The first segment is the resource
  group (`auth`, `validation`, `conflict`, `rate_limit`, …).
- `message` may change wording across versions without bumping the API
  version. Clients **must not** branch on `message`.
- `details` is opaque to consumers; only the resource they came from knows
  the schema. Anything inside is offered for debugging only.
- `traceId` is included whenever an `OpenTelemetry` tracer is active; its
  presence is best-effort, never required.

## Implementation contract

1. The Zod schema lives in `@agent-os/shared`.
2. Routes in `apps/api/src/routes/**` invoke `.safeParse(input)`; on failure
   they respond `400` with `code: "validation.failed"` and the Zod issues
   under `details.issues`.
3. Higher-level errors (auth, dependency failures) use the catalog in
   [`./overview.md`](./overview.md#error-catalog).
