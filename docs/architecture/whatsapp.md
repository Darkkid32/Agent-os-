# WhatsApp Adapter Architecture Specification

> This document is the **source of truth** for the WhatsApp adapter. No
> implementation code shall be written until this specification is complete
> and approved. All code in `packages/adapters-whatsapp/` must trace every
> decision back to a section of this document.
>
> This is an **architecture document**, not an implementation plan. It
> defines interfaces, responsibilities, boundaries, and data flow. It does
> not contain TypeScript, package configurations, or runtime code.

---

## 1. Purpose

### 1.1 What the WhatsApp Adapter Is

The WhatsApp adapter is a Platform Layer surface that translates WhatsApp
Business API webhook payloads into Hermes kernel API calls and translates
kernel responses into WhatsApp message formats. It is one of the five
adapters named in the Platform Layer architecture (platform.md §1.2).

Per platform.md §17.3, the WhatsApp adapter uses the WhatsApp Business API
in webhook mode. External systems send incoming messages to a registered
webhook endpoint; the adapter authenticates, parses, and dispatches them to
Hermes.

### 1.2 Responsibilities

| Responsibility | Mechanism |
| --- | --- |
| Receive incoming WhatsApp messages | Webhook endpoint receiving POST from WhatsApp Business API |
| Authenticate webhook payloads | Validate `X-Hub-Signature-256` HMAC signature per Meta specification |
| Parse text commands | Extract command and arguments from message text body |
| Authorize callers | Phone number allow-list mapped to admin/viewer roles per §11.7 |
| Translate to Hermes API calls | Map parsed commands to `hermes.start()`, `hermes.stop()`, etc. |
| Translate responses | Convert `Result<T>` into WhatsApp message text |
| Emit structured logs | Log every inbound message, outbound response, and error with request ID |
| Report adapter health | Report whether the webhook endpoint is reachable and the adapter is functional |
| Respect lifecycle | Refuse operations illegal in the current Hermes phase per §4.5 |

### 1.3 Non-Goals

- The WhatsApp adapter does **not** implement business logic, agent
  orchestration, or model routing. Those are Hermes-registered modules.
- The WhatsApp adapter does **not** own the Hermes lifecycle. It calls
  `hermes.start()` and `hermes.stop()`; it does not manage the phase state
  machine.
- The WhatsApp adapter does **not** manage WhatsApp Business API account
  setup, phone number verification, or Meta app review. Those are
  operator concerns outside the adapter boundary.
- The WhatsApp adapter does **not** implement a polling mode. Per §17.3,
  the mechanism is webhook mode only. If polling is needed in the future,
  it requires its own architecture specification.

---

## 2. Scope

### 2.1 In Scope

- Webhook endpoint receiving WhatsApp Business API message payloads.
- Webhook signature validation (`X-Hub-Signature-256`).
- Text-based command parser extracting commands from message bodies.
- Phone number allow-list for caller authorization.
- Mapping of parsed commands to Hermes API calls.
- Translation of Hermes responses into WhatsApp message text.
- Adapter health reporting (webhook endpoint reachability).
- Structured logging with request IDs and correlation IDs.
- Phase gating per §4.5.

### 2.2 Out of Scope

- WhatsApp Business API account provisioning or Meta app review.
- Interactive message elements (buttons, lists) — future extension.
- Media message handling (images, documents, audio) — future extension.
- Group chat management — future extension.
- Multi-device session management — handled by the WhatsApp Business API
  infrastructure, not the adapter.

---

## 3. Architecture Overview

### 3.1 Component Position

```
                    ┌──────────────────────────────────────────┐
   External         │           Platform Layer                  │
                    │                                          │
   WhatsApp ──────► │  WhatsAppAdapter                         │
   Business API     │    ├── Webhook endpoint (receives POST)   │
   (webhook POST)   │    ├── Signature validator                │
                    │    ├── Command parser                     │
                    │    ├── Permission resolver                │
                    │    └── Hermes caller                      │
                    └──────────────┬───────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │         Hermes Kernel         │
                    │  hermes.start() / stop() / …  │
                    └──────────────────────────────┘
```

### 3.2 Request Flow

```
WhatsApp Business API
    │
    ▼ POST /v1/adapters/whatsapp/webhook
WhatsAppAdapter
    │
    ├── Validate webhook signature (X-Hub-Signature-256)
    │     └── fail → 403 (signature invalid)
    │
    ├── Extract sender phone number from payload
    │     └── fail → 400 (malformed payload)
    │
    ├── Resolve caller role via phone number allow-list
    │     └── fail → 403 (not in allow-list)
    │
    ├── Parse text command from message body
    │     └── fail → 400 (no recognizable command)
    │
    ├── Check phase gating for the requested operation
    │     └── fail → 409 PHASE_CONFLICT
    │
    ├── Authorize operation against caller role
    │     └── fail → 403 AUTH_FORBIDDEN
    │
    ├── Call Hermes API (e.g. hermes.start())
    │     └── fail → map to AdapterErrorCode
    │
    └── Translate Result<T> to WhatsApp message text
          └── send reply via WhatsApp Business API
```

### 3.3 Data Flow Summary

1. WhatsApp Business API POSTs an incoming message to the webhook endpoint.
2. The adapter validates the webhook signature.
3. The adapter extracts the sender phone number and message text.
4. The adapter resolves the sender's role (admin / viewer) via the phone
   number allow-list.
5. The adapter parses the message text to extract a command and arguments.
6. The adapter checks phase gating for the requested operation.
7. The adapter authorizes the operation against the caller's role.
8. The adapter translates the command into a Hermes API call.
9. Hermes executes the call and returns a `Result<T>`.
10. The adapter translates the result into a WhatsApp message text.
11. The adapter sends the reply via the WhatsApp Business API.

---

## 4. Layer Placement

The WhatsApp adapter occupies **Layer 4 (Surfaces)** in the layered
package graph (ADR-003, dependency-rules.md).

| Component | Layer |
| --- | --- |
| `packages/adapters-whatsapp` | 4 — Surfaces |

### 4.1 Allowed Dependencies (§19.1)

| Package | May depend on |
| --- | --- |
| `@agent-os/adapters-whatsapp` | `@agent-os/hermes` (public API only), `@agent-os/core`, `@agent-os/observability` |

### 4.2 Forbidden Dependencies (§19.2)

| Package | Must NOT depend on |
| --- | --- |
| `@agent-os/adapters-whatsapp` | `@agent-os/runtime`, `@agent-os/event-bus`, `@agent-os/agents`, `@agent-os/memory`, `@agent-os/workflow`, `@agent-os/adapters` |

### 4.3 Rationale

The WhatsApp adapter depends on `@agent-os/hermes` because Hermes is the
sole entry point for kernel operations. It must not depend on
`@agent-os/runtime` or `@agent-os/event-bus` directly because those are
internal Hermes dependencies; adapter access goes through the Hermes
public API (§5 of hermes.md). This preserves the dependency inversion
established in ADR-003.

---

## 5. Public API

### 5.1 Exports

The package `@agent-os/adapters-whatsapp` exports:

| Export | Type | Description |
| --- | --- | --- |
| `WhatsAppAdapter` | class | The adapter composition root implementing the §4.1 Adapter lifecycle |
| `WhatsAppMetadata` | type | `AdapterMetadata & { readonly transport: 'whatsapp'; readonly webhookPath: string }` |
| `WhatsAppAdapterHealth` | type | Alias of `AdapterHealth` from `@agent-os/core/adapter-metadata` |
| `WhatsAppAdapterHealthStatus` | type | Alias of `AdapterHealthStatus` from `@agent-os/core/adapter-metadata` |
| `ADAPTER_NAME` | const | `'@agent-os/adapters-whatsapp'` |
| `ADAPTER_VERSION` | const | `'1.0.0'` |

### 5.2 HermesPort

The adapter receives a `HermesPort` (imported from `@agent-os/hermes`)
during construction. This is the sole kernel contract. The adapter calls
only the methods defined on `HermesPort`:

| Method | Adapter usage |
| --- | --- |
| `start()` | `agent_os_start` command |
| `stop()` | `agent_os_stop` command |
| `status()` | `agent_os_status` command |
| `health()` | `agent_os_health` command |
| `config` | `agent_os_config` command (read-only) |
| `modules()` | `agent_os_plugins` command |
| `version` | `agent_os_version` command (static) |

### 5.3 Supported Operations

| Operation | Hermes call | Description |
| --- | --- | --- |
| `start` | `hermes.start()` | Start the Hermes kernel |
| `stop` | `hermes.stop()` | Stop the Hermes kernel |
| `status` | `hermes.status()` | Show phase, uptime, module count |
| `health` | `hermes.health()` | Show aggregate health |
| `plugins` | `hermes.modules()` | List registered modules |
| `config` | `hermes.config` | Show config (secrets redacted) |
| `version` | static | Show version |

---

## 6. HermesPort Interaction

### 6.1 Calling Pattern

The adapter calls Hermes through the `HermesPort` interface. Every call
returns a `Result<T>`. The adapter must never throw; it always catches
and translates.

```
Command parsed → hermes.<method>() → Result<T> → translate to WhatsApp message
```

### 6.2 Error Mapping

| Hermes result | Adapter action |
| --- | --- |
| `Result.ok: true` | Translate value to WhatsApp message text |
| `Result.ok: false` with `Error` | Map error to `AdapterErrorCode` via `mapKernelErrorToAdapterError`, translate to error message |
| Phase guard throws | Map to `PHASE_CONFLICT` (HTTP 409 equivalent) |
| Module not found | Map to `NOT_FOUND` |
| Unexpected exception | Map to `HERMES_ERROR` |

### 6.3 Best-Effort Events

The adapter does **not** subscribe to EventBus topics. Per §17.3, the
mechanism is webhook mode — the adapter is purely request-response. Event
notifications to WhatsApp users would be a future extension requiring its
own architecture specification.

---

## 7. Lifecycle

The adapter implements the five-method lifecycle defined in platform.md
§4.1. Phase gating follows §4.5.

### 7.1 `initialize(config)`

- **Required Hermes phase:** Any (always allowed per §4.5).
- **Behavior:**
  1. Read adapter-specific configuration (webhook secret, phone number
     allow-list, command prefix).
  2. Validate configuration via Zod schema.
  3. Build the command parser table mapping text patterns to Hermes API
     calls.
  4. Build the permission resolver from the phone number allow-list.
  5. Store the `HermesPort` reference for later use.
- **Returns:** `Promise<Result<void>>` — `ok` if config is valid, `err`
  with diagnostic if invalid.
- **Post-condition:** The adapter is initialized and ready for `start()`.

### 7.2 `start()`

- **Required Hermes phase:** `RUNNING` (per §4.5 — return error if Hermes
  is not `RUNNING`).
- **Behavior:**
  1. Register the webhook endpoint (or signal the host process that the
     endpoint is ready to receive).
  2. Mark adapter health as `healthy`.
- **Returns:** `Promise<Result<void>>`.
- **Post-condition:** The webhook endpoint is accepting incoming messages.

### 7.3 `stop()`

- **Required Hermes phase:** Any non-terminal (always allowed per §4.5).
- **Behavior:**
  1. Unregister the webhook endpoint (or signal the host process to stop
     forwarding).
  2. Drain in-flight message handling (wait for active Hermes calls to
     complete, with deadline).
  3. Mark adapter health as `stopped`.
- **Returns:** `Promise<Result<void>>`.
- **Post-condition:** No new messages are processed.

### 7.4 `health()`

- **Required Hermes phase:** Any (always allowed per §4.5).
- **Behavior:**
  1. Return the adapter's own health status. Does **NOT** call
     `hermes.health()`.
  2. The adapter health reports whether the webhook endpoint is reachable
     and the adapter is functional.
- **Returns:** `AdapterHealth` (`{ status, detail?, at }`).

### 7.5 `metadata()`

- **Required Hermes phase:** Any (always allowed per §4.5).
- **Behavior:**
  1. Return adapter identity: name, version, interface type, supported
     operations, transport, webhook path.
- **Returns:** `WhatsAppMetadata`.

---

## 8. Authentication

### 8.1 Webhook Signature Validation

Per platform.md §17.3, the WhatsApp adapter uses the WhatsApp Business API
in webhook mode. Meta signs incoming webhook payloads using HMAC-SHA256.

- **Header:** `X-Hub-Signature-256`
- **Algorithm:** HMAC-SHA256 of the raw request body using the configured
  webhook secret.
- **Validation:** The adapter computes the HMAC of the raw body and
  compares it to the signature in the header. Mismatches are rejected
  before any Hermes call.
- **Configuration:** The webhook secret is provided via the adapter
  configuration (sourced from environment variables at `initialize()` time).

### 8.2 Signature Failure Behavior

If signature validation fails:
- The adapter returns a rejection without calling Hermes.
- The adapter logs the failure with the request ID.
- The adapter does **not** expose internal error details to the caller.

---

## 9. Authorization / Permissions

### 9.1 Permission Model

Per platform.md §17.3, the WhatsApp adapter uses a **phone number
allow-list** for caller authorization.

| Role | Allowed operations |
| --- | --- |
| `admin` | `start`, `stop`, `status`, `health`, `plugins`, `config`, `version` |
| `viewer` | `status`, `health`, `config`, `version` |

### 9.2 Role Resolution

The adapter maintains a configured list of admin phone numbers
(`WHATSAPP_ADMIN_IDS`, comma-separated). At message handling time:

1. Extract the sender phone number from the WhatsApp message payload.
2. If the phone number is in the admin list, assign role `admin`.
3. Otherwise, assign role `viewer`.

### 9.3 Permission Enforcement

Before calling Hermes, the adapter checks whether the caller's role
permits the requested operation using the `can` predicate from
`@agent-os/core/kernel-permissions`.

| Check | Result on failure |
| --- | --- |
| `can(role, action)` returns `false` | Return `AUTH_FORBIDDEN` (403 equivalent), do not call Hermes |

### 9.4 Mapping to Hermes Permissions

Per platform.md §11.7:

| Authenticated identity | Hermes permission |
| --- | --- |
| WhatsApp admin phone number | Full access |
| WhatsApp non-admin phone number | Read-only |

Full access: `start`, `stop`, `status`, `health`, `plugins`, `config`,
`version`.
Read-only: `status`, `health`, `config`, `version`.

---

## 10. Message Flow

### 10.1 Incoming Message Processing

```
1. WhatsApp Business API → POST /v1/adapters/whatsapp/webhook
2. Adapter validates X-Hub-Signature-256
3. Adapter extracts: sender phone number, message text, timestamp
4. Adapter resolves sender role (admin / viewer)
5. Adapter parses message text for command:
   a. Match against command table (e.g. "start" → hermes.start())
   b. Extract arguments (e.g. "--timeout 30000")
   c. If no match → respond with help text
6. Adapter checks phase gating for the operation
7. Adapter checks role authorization for the operation
8. Adapter calls Hermes API
9. Adapter translates Result<T> to WhatsApp message text
10. Adapter sends reply via WhatsApp Business API
```

### 10.2 Command Table

| Command text | Hermes call | Description |
| --- | --- | --- |
| `start` | `hermes.start()` | Start the kernel |
| `stop` | `hermes.stop()` | Stop the kernel |
| `status` | `hermes.status()` | Show phase, uptime, modules |
| `health` | `hermes.health()` | Show aggregate health |
| `plugins` | `hermes.modules()` | List registered modules |
| `config` | `hermes.config` | Show config (redacted) |
| `version` | static | Show version |
| `help` | — | Show command list |

### 10.3 Command Parsing

- Commands are case-insensitive.
- The command is the first word of the message text.
- Arguments follow the command, separated by whitespace.
- Unknown commands receive a help text response.
- Empty messages are ignored (no response sent).

### 10.4 Response Format

Responses are plain text messages sent via the WhatsApp Business API. The
format follows the CLI adapter's human-readable output conventions (§5.4
of platform.md):

| Response type | Format |
| --- | --- |
| Success | Human-readable text (e.g. "Hermes is RUNNING (uptime: 5m, modules: 3)") |
| Error | Error code + human-readable message (e.g. "PHASE_CONFLICT: Cannot start from RUNNING") |
| Help | Command list with brief descriptions |

---

## 11. Error Handling

### 11.1 Error Propagation

Per platform.md §12.1:

```
Hermes Error → Adapter → WhatsApp Message
```

The adapter must never throw. All errors are caught and translated into
WhatsApp message text.

### 11.2 Error Categories

| Category | Source | Adapter response |
| --- | --- | --- |
| Signature validation failure | Invalid `X-Hub-Signature-256` | Log and reject (no Hermes call, no reply to user) |
| Malformed payload | WhatsApp sends unparseable data | Log and reject (no Hermes call) |
| Unknown command | Message text has no matching command | Reply with help text |
| Permission denied | Caller role insufficient for operation | Reply with "Permission denied" message |
| Phase conflict | Operation illegal in current Hermes phase | Reply with error message including phase info |
| Hermes error | `hermes.<method>()` returns `Result.err` | Reply with error message (internal details not exposed) |
| Internal error | Unexpected adapter failure | Log with request ID; reply with generic error message |

### 11.3 Error Envelope

The adapter maps errors to the shared `AdapterErrorCode` taxonomy from
`@agent-os/core/adapter-errors`:

| Error category | `AdapterErrorCode` |
| --- | --- |
| Signature invalid | `AUTH_FORBIDDEN` |
| Malformed payload | `VALIDATION_ERROR` |
| Unknown command | `VALIDATION_ERROR` |
| Permission denied | `AUTH_FORBIDDEN` |
| Phase conflict | `PHASE_CONFLICT` |
| Hermes error | `HERMES_ERROR` |
| Internal error | `HERMES_ERROR` |

### 11.4 Error Message Convention

Error messages returned to the WhatsApp user follow this format:

```
<ERROR_CODE>: <human-readable explanation>
```

Internal error details (stack traces, Hermes diagnostics) are logged with
the request ID for operator review. They are **not** exposed to the
WhatsApp user.

---

## 12. Adapter Health Model

### 12.1 Health Reporting

Per platform.md §4.1, the adapter health reports whether the adapter
**itself** is functional — not `hermes.health()`.

| Health status | Meaning |
| --- | ---|
| `healthy` | Webhook endpoint is registered and accepting messages |
| `degraded` | Webhook endpoint is registered but experiencing issues (e.g. high latency) |
| `failed` | Webhook endpoint is not reachable or configuration is invalid |
| `unknown` | Adapter is not yet initialized or not yet started |

### 12.2 Health Check Scope

The health check verifies:
- The webhook endpoint is registered (if the host process manages
  registration).
- The adapter configuration is valid.
- The adapter is in the `Started` lifecycle state.

The health check does **not** verify:
- WhatsApp Business API availability (the API is external and out of
  adapter control).
- Hermes kernel health (that is reported through `hermes.health()`).

---

## 13. Logging Requirements

### 13.1 Structured Logging

Per platform.md §13, every log entry is JSON with:

| Field | Source |
| --- | --- |
| `timestamp` | ISO-8601 |
| `level` | trace / debug / info / warn / error / fatal |
| `message` | Human-readable |
| `adapter` | `'whatsapp'` |
| `requestId` | UUID v4, generated at inbound message boundary |
| `correlationId` | From inbound request or generated UUID v4 |
| `traceId` | From OpenTelemetry context (if available) |
| `spanId` | From OpenTelemetry context (if available) |
| `phase` | Current Hermes lifecycle phase |
| `senderPhone` | Sender phone number (masked in logs: last 4 digits only) |
| `command` | Parsed command name (if recognizable) |

### 13.2 Request IDs

Every inbound WhatsApp message is assigned a UUID v4 request ID at the
adapter boundary. The request ID is included in all log entries for that
message. The request ID is **not** returned to the WhatsApp user (unlike
REST where it appears in the response envelope).

### 13.3 Correlation IDs

If the inbound message metadata contains a correlation ID, the adapter
uses it. Otherwise, the adapter generates a UUID v4.

### 13.4 Tracing

The adapter creates an OpenTelemetry span for each inbound message:
- Span name: `whatsapp.<command>` (e.g. `whatsapp.start`).
- The span inherits trace context from the caller if provided.

---

## 14. Configuration

### 14.1 Required Configuration

| Key | Source | Description |
| --- | --- | --- |
| `WHATSAPP_WEBHOOK_SECRET` | env | HMAC-SHA256 secret for `X-Hub-Signature-256` validation |
| `WHATSAPP_ADMIN_IDS` | env | Comma-separated list of admin phone numbers |
| `WHATSAPP_COMMAND_PREFIX` | env (optional) | Command prefix (default: no prefix — bare command names) |

### 14.2 Configuration Validation

All configuration is validated at `initialize()` time via Zod schema.
Invalid configuration causes `initialize()` to return `Result.err`.

### 14.3 Configuration Scope

Configuration is read from environment variables at `initialize()` time
and frozen. No configuration mutations after initialization.

---

## 15. Security Considerations

### 15.1 Trust Boundary

```
┌──────────────────────────────────────────────────────────┐
│  Untrusted Zone                                           │
│  WhatsApp Business API webhook payloads                   │
└──────────────────────┬───────────────────────────────────┘
                       │  Signature validation + allow-list
                       ▼
┌──────────────────────────────────────────────────────────┐
│  Platform Layer (WhatsApp Adapter)                        │
│  Input validation, auth enforcement                       │
└──────────────────────┬───────────────────────────────────┘
                       │  Typed Hermes API calls
                       ▼
┌──────────────────────────────────────────────────────────┐
│  Trusted Zone                                             │
│  Hermes Kernel, Runtime, EventBus, Core, Observability    │
└──────────────────────────────────────────────────────────┘
```

### 15.2 Signature Validation

- The adapter validates `X-Hub-Signature-256` on every incoming webhook.
- The webhook secret is never logged, never included in responses, and
  never exposed through any endpoint.
- Signature validation happens **before** any payload parsing or Hermes
  call.

### 15.3 Phone Number Masking

Phone numbers are masked in log output (last 4 digits only) to prevent
PII leakage into structured logs.

### 15.4 Input Validation

All message text is validated before command parsing:
- Maximum message length enforced.
- Control characters stripped.
- No user-supplied data is passed to Hermes without validation.

### 15.5 Rate Limiting

Per platform.md §15.2, rate limiting is enforced per adapter, per
authenticated identity. The WhatsApp adapter applies rate limiting to
incoming webhook payloads. Default: 60 requests per minute per phone
number.

---

## 16. Dependency Rules

### 16.1 Allowed Dependencies

| Package | Layer | What the adapter uses it for |
| --- | --- | --- |
| `@agent-os/hermes` | 4 | `HermesPort` — the sole kernel contract |
| `@agent-os/core` | 1 | `Result`, `Timestamp`, `AdapterMetadata`, `AdapterHealth`, `AdapterErrorCode`, `kernel-permissions` |
| `@agent-os/observability` | 2 | `Tracer`, `getTracer` — OpenTelemetry spans |

### 16.2 Forbidden Dependencies

| Package | Why forbidden |
| --- | --- |
| `@agent-os/runtime` | Internal Hermes dependency; access through Hermes API |
| `@agent-os/event-bus` | Internal Hermes dependency; access through Hermes API |
| `@agent-os/agents` | Domain concept; Hermes decouples via module registration |
| `@agent-os/memory` | Domain concept; access through Hermes-registered modules |
| `@agent-os/workflow` | Domain concept; access through Hermes-registered modules |
| `@agent-os/adapters` | Contains concrete third-party SDK code; coupling risk |

---

## 17. Testing Strategy

### 17.1 Unit Tests

| Test area | Coverage |
| --- | ---|
| Command parser | Parse valid commands, handle unknown commands, handle empty messages, handle argument extraction |
| Permission resolver | Admin phone numbers resolve to `admin`, non-admin resolve to `viewer`, unknown resolve to `viewer` |
| Signature validator | Valid signature passes, invalid signature fails, missing header fails, tampered body fails |
| Error mapping | Each error category maps to the correct `AdapterErrorCode` |
| Configuration validation | Valid config passes, missing required keys fail, invalid values fail |

### 17.2 Integration Tests

| Test | What it verifies |
| --- | ---|
| Full lifecycle | `initialize()` → `start()` → `stop()` in sequence |
| Hermes interaction | Command parsing → Hermes call → response translation |
| Phase gating | `start()` rejected when Hermes is not `RUNNING` |
| Permission enforcement | Admin-only operations rejected for viewer role |
| Health reporting | `health()` returns adapter status independent of Hermes health |

### 17.3 Test Conventions

- All tests use `vitest`.
- Hermes is mocked via `HermesPort` (hand-constructed test doubles).
- No external API calls in tests.
- No environment variable reads in tests (config is injected).

---

## 18. Future Extensions

The following extensions are **reserved** — they are named here so the
architecture can accommodate them, but they are **not implemented** and
must not appear in the source tree until their own specifications are
written and approved.

### 18.1 Interactive Messages

- **Purpose:** Support WhatsApp interactive message elements (buttons,
  lists) for richer command UX.
- **Priority:** Post-Phase 5.

### 18.2 Media Handling

- **Purpose:** Handle incoming media messages (images, documents, audio)
  and map them to Hermes operations.
- **Priority:** Post-Phase 5.

### 18.3 Polling Mode

- **Purpose:** Add a polling fallback for environments where webhook
  delivery is unavailable.
- **Priority:** Post-Phase 5. Requires own architecture specification
  per §17 preamble.

---

## 19. Risks

| Risk | Severity | Mitigation |
| --- | ---| --- |
| WhatsApp Business API requires Meta app review before production use | High | Use sandbox/test credentials for development; mock in unit tests |
| Meta may change webhook payload format without notice | Medium | Validate payload shape via Zod schema; fail-closed on unexpected fields |
| Phone number format varies by country (E.164 vs local) | Medium | Normalize all phone numbers to E.164 format at the adapter boundary |
| Rate limits from WhatsApp Business API may throttle outbound replies | Low | Implement retry with back-off for outbound send failures |
| No polling fallback means webhook delivery failures are invisible | Low | Log webhook delivery failures; operator monitoring required |

---

## 20. Open Questions

| # | Question | Impact | Required for |
| --- | --- | --- | --- |
| 1 | Should the adapter normalize phone numbers to E.164 format, or should the allow-list accept multiple formats? | Permission resolution | Spec approval |
| 2 | Should unknown commands silently reply with help text, or should they be logged as warnings? | Logging behavior | Spec approval |
| 3 | Should the adapter support a configurable command prefix (e.g. `/agent-os start`) or only bare commands? | Command parsing | Spec approval |
| 4 | What is the maximum message length the adapter should accept? | Input validation | Implementation |
| 5 | Should the adapter expose the webhook endpoint through the existing `apps/api` Fastify server, or through a standalone process? | Deployment model | Implementation |

---

## Revision History

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| 1.0.0 | 2026-06-29 | Agent OS Maintainers | Phase 5.1 — WhatsApp adapter architecture specification |
