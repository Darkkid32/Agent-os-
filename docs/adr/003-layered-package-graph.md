# ADR-003: Layered package dependency graph

## Status

Accepted (Phase 1.1).

## Context

Agent OS has 12 packages; without a dependency rule set, refactor friction
grows quadratically. We need a deterministic graph where:

- Foundation packages (`core`, `shared`) cannot accidentally depend on
  domain logic.
- `hermes` — the eventual top-level integration layer — cannot cherry-pick
  every other package as it pleases.
- Adapter authors cannot bypass the contract by importing concrete agents.

## Decision

Adopt the four-layer model documented in
[`docs/architecture/dependency-rules.md`](../architecture/dependency-rules.md):

1. **Foundation** — `core`, `shared`.
2. **Platform** — `event-bus`, `memory`, `runtime`, `workflow`,
   `observability`.
3. **Domain** — `agents`, `adapters-sdk`, `adapters`, `ui`.
4. **Surfaces** — `hermes`.

Dependencies flow only downward. `apps/api` and `apps/dashboard` are treated
as layer 4 surfaces with reduced reach.

## Consequences

- New packages declare their layer at birth (see template below).
- `scripts/check-cycles.ts` is the first line of defense against cycles.
- Future Phase-2 work introduces `dependency-lint` (madge) as a hard
  enforcement.

### Layer declaration template

```ts
// in packages/<slug>/package.json
{
  "agent-os": {
    "layer": 4,           // 1 = foundation, 2 = platform, …
    "audience": "internal" // or "public" for adapters-sdk/hermes
  }
}
```

## Alternatives Considered

- **Hexagonal/ports-and-adapters naming.** Rejected — too verbose for a
  common team vocabulary.
- **No formal layers, just lint rules.** Rejected — humans forget.
