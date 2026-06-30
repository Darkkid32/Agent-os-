# Email Adapter Architecture Specification

> This document is the **source of truth** for the Email adapter. No
> implementation code shall be written until this specification is complete
> and approved. All code in `packages/adapters-email/` must trace every
> decision back to a section of this document.
>
> This is an **architecture document**, not an implementation plan. It
> defines interfaces, responsibilities, boundaries, and data flow. It does
> not contain TypeScript, package configurations, or runtime code.

---

## 1. Purpose

### 1.1 What the Email Adapter Is

The Email adapter is a Platform Layer surface that translates inbound email
messages into Hermes kernel API calls and translates kernel responses into
email reply formats. It is one of the five adapters named in the Platform
Layer architecture (platform.md §1.2).

Per platform.md §17.4, the Email adapter supports two modes:
**IMAP polling** and **SES webhook**. Only one mode may be active at a
time. The mode is selected at initialization based on configuration.

### 1.2 Responsibilities

| Responsibility | Mechanism |
| --- | --- |
| Receive inbound email messages | IMAP polling or SES webhook |
| Authenticate inbound messages | SES SNS notification signing (webhook) or IMAP connection credentials (polling) |
| Parse subject-line commands | Extract command and arguments from email subject |
| Authorize callers | Sender email allow-list mapped to admin/viewer roles per §11.7 |
| Translate to Hermes API calls | Map parsed commands to `hermes.start()`, `hermes.stop()`, etc. |
| Translate responses | Convert `Result<T>` into email reply text |
| Emit structured logs | Log every inbound message, outbound reply, and error with request ID |
| Report adapter health | Report whether the IMAP connection or webhook endpoint is functional |
| Respect lifecycle | Refuse operations illegal in the current Hermes phase per §4.5 |

### 1.3 Non-Goals

- The Email adapter does **not** implement business logic, agent
  orchestration, or model routing. Those are Hermes-registered modules.
- The Email adapter does **not** own the Hermes lifecycle. It calls
  `hermes.start()` and `hermes.stop()`; it does not manage the phase state
  machine.
- The Email adapter does **not** implement email composition, threading,
  or attachment handling. It processes subject-line commands only.
- The Email adapter does **not** manage email account provisioning, IMAP
  server setup, or SES configuration. Those are operator concerns outside
  the adapter boundary.

---

## 2. Scope

### 2.1 In Scope

- IMAP polling mode: periodic connection to an IMAP server to fetch new
  messages.
- SES webhook mode: HTTP endpoint receiving SNS notification payloads.
- Subject-line command parsing from inbound email subjects.
- Sender email allow-list for caller authorization.
- Mapping of parsed commands to Hermes API calls.
- Translation of Hermes responses into email reply text.
- Adapter health reporting (IMAP connection status or webhook endpoint
  reachability).
- Structured logging with request IDs and correlation IDs.
- Phase gating per §4.5.

### 2.2 Out of Scope

- Email composition beyond simple text replies.
- Email threading (In-Reply-To / References headers).
- Attachment handling (incoming or outgoing).
- HTML email rendering (text-only replies).
- Email account provisioning or IMAP server management.
- SES topic subscription management.

---

## 3. Architecture Overview

### 3.1 Component Position

```
                    ┌──────────────────────────────────────────┐
   External         │           Platform Layer                  │
                    │                                          │
   IMAP Server ──►  │  EmailAdapter                            │
   (polling)        │    ├── IMAP connection (mode: polling)    │
                    │    ├── OR                                 │
   AWS SES ───────► │    ├── Webhook endpoint (mode: webhook)   │
   (SNS webhook)    │    ├── Signature validator (webhook)      │
                    │    ├── Subject-line command parser        │
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

### 3.2 Dual-Mode Architecture

The Email adapter operates in exactly one of two modes, selected at
`initialize()` time:

| Mode | Mechanism | When to use |
| --- | --- | --- |
| **IMAP Polling** | Adapter connects to an IMAP server on a timer, fetches new messages, parses subject-line commands | Self-hosted or development environments; no webhook infrastructure required |
| **SES Webhook** | AWS SES publishes inbound email notifications to an SNS topic; the adapter receives POST at a registered endpoint | Production on AWS; requires SNS/SES configuration |

Only one mode may be active at a time. The mode is selected based on
whether `EMAIL_SES_WEBHOOK_ENABLED` is configured.

### 3.3 Request Flow (IMAP Polling)

```
Timer triggers poll
    │
    ▼
Connect to IMAP server
    │
    ├── fail → mark health degraded, retry on next interval
    │
Fetch new messages from INBOX
    │
    ├── no new messages → return (no action)
    │
For each new message:
    │
    ├── Extract sender email from From: header
    │     └── fail → skip message, log warning
    │
    ├── Extract subject line
    │     └── fail → skip message, log warning
    │
    ├── Parse subject-line command
    │     └── fail → skip message (no recognizable command)
    │
    ├── Resolve sender role via email allow-list
    │     └── fail → skip message, log warning
    │
    ├── Check phase gating for the operation
    │     └── fail → skip message, log warning
    │
    ├── Check role authorization
    │     └── fail → skip message, log warning
    │
    ├── Call Hermes API
    │     └── fail → map to AdapterErrorCode, log error
    │
    ├── Translate Result<T> to email reply text
    │
    └── Send reply email via IMAP (or SMTP)
          └── fail → log error, message may be lost
```

### 3.4 Request Flow (SES Webhook)

```
AWS SES → SNS → POST to webhook endpoint
    │
    ▼
Validate SNS notification signature
    │
    ├── fail → 403 (signature invalid)
    │
Parse SNS notification envelope
    │
    ├── fail → 400 (malformed payload)
    │
Extract inbound email from SNS message
    │
    ├── fail → 400 (no email content)
    │
Extract sender email from From: header
    │
    ├── fail → skip message, log warning
    │
Extract subject line
    │
    ├── fail → skip message, log warning
    │
Parse subject-line command
    │
    ├── fail → skip message (no recognizable command)
    │
Resolve sender role via email allow-list
    │
    ├── fail → skip message, log warning
    │
Check phase gating and authorization
    │
    ├── fail → skip message, log warning
    │
Call Hermes API
    │
    ├── fail → map to AdapterErrorCode, log error
    │
Translate Result<T> to email reply text
    │
Send reply email via SES
    │
    └── fail → log error, reply may be lost
```

### 3.5 Data Flow Summary

1. An inbound email arrives (via IMAP polling or SES webhook).
2. The adapter authenticates the source (IMAP credentials or SNS
   signature).
3. The adapter extracts the sender email address and subject line.
4. The adapter resolves the sender's role (admin / viewer) via the email
   allow-list.
5. The adapter parses the subject line to extract a command and arguments.
6. The adapter checks phase gating for the requested operation.
7. The adapter authorizes the operation against the caller's role.
8. The adapter translates the command into a Hermes API call.
9. Hermes executes the call and returns a `Result<T>`.
10. The adapter translates the result into email reply text.
11. The adapter sends the reply email.

---

## 4. Layer Placement

The Email adapter occupies **Layer 4 (Surfaces)** in the layered
package graph (ADR-003, dependency-rules.md).

| Component | Layer |
| --- | --- |
| `packages/adapters-email` | 4 — Surfaces |

### 4.1 Allowed Dependencies (§19.1)

| Package | May depend on |
| --- | --- |
| `@agent-os/adapters-email` | `@agent-os/hermes` (public API only), `@agent-os/core`, `@agent-os/observability` |

### 4.2 Forbidden Dependencies (§19.2)

| Package | Must NOT depend on |
| --- | --- |
| `@agent-os/adapters-email` | `@agent-os/runtime`, `@agent-os/event-bus`, `@agent-os/agents`, `@agent-os/memory`, `@agent-os/workflow`, `@agent-os/adapters` |

### 4.3 Rationale

The Email adapter depends on `@agent-os/hermes` because Hermes is the
sole entry point for kernel operations. It must not depend on
`@agent-os/runtime` or `@agent-os/event-bus` directly because those are
internal Hermes dependencies; adapter access goes through the Hermes
public API (§5 of hermes.md). This preserves the dependency inversion
established in ADR-003.

---

## 5. Public API

### 5.1 Exports

The package `@agent-os/adapters-email` exports:

| Export | Type | Description |
| --- | --- | --- |
| `EmailAdapter` | class | The adapter composition root implementing the §4.1 Adapter lifecycle |
| `EmailMetadata` | type | `AdapterMetadata & { readonly transport: 'imap' \| 'ses-webhook'; readonly mode: EmailAdapterMode }` |
| `EmailAdapterHealth` | type | Alias of `AdapterHealth` from `@agent-os/core/adapter-metadata` |
| `EmailAdapterHealthStatus` | type | Alias of `AdapterHealthStatus` from `@agent-os/core/adapter-metadata` |
| `EmailAdapterMode` | type | `'imap-polling' \| 'ses-webhook'` |
| `ADAPTER_NAME` | const | `'@agent-os/adapters-email'` |
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
Command parsed → hermes.<method>() → Result<T> → translate to email reply
```

### 6.2 Error Mapping

| Hermes result | Adapter action |
| --- | --- |
| `Result.ok: true` | Translate value to email reply text |
| `Result.ok: false` with `Error` | Map error to `AdapterErrorCode` via `mapKernelErrorToAdapterError`, translate to error message |
| Phase guard throws | Map to `PHASE_CONFLICT` |
| Module not found | Map to `NOT_FOUND` |
| Unexpected exception | Map to `HERMES_ERROR` |

### 6.3 Best-Effort Events

The adapter does **not** subscribe to EventBus topics. Email is purely
request-response. Event notifications via email would be a future
extension requiring its own architecture specification.

---

## 7. Lifecycle

The adapter implements the five-method lifecycle defined in platform.md
§4.1. Phase gating follows §4.5.

### 7.1 `initialize(config)`

- **Required Hermes phase:** Any (always allowed per §4.5).
- **Behavior:**
  1. Read adapter-specific configuration (IMAP/SES credentials, sender
     allow-list, polling interval, command prefix).
  2. Validate configuration via Zod schema.
  3. Determine operating mode from configuration:
     - If `EMAIL_SES_WEBHOOK_ENABLED` is `true` → SES webhook mode.
     - Otherwise → IMAP polling mode.
  4. Build the command parser table mapping subject-line patterns to
     Hermes API calls.
  5. Build the permission resolver from the sender email allow-list.
  6. Store the `HermesPort` reference for later use.
- **Returns:** `Promise<Result<void>>` — `ok` if config is valid, `err`
  with diagnostic if invalid.
- **Post-condition:** The adapter is initialized and ready for `start()`.

### 7.2 `start()`

- **Required Hermes phase:** `RUNNING` (per §4.5 — return error if Hermes
  is not `RUNNING`).
- **Behavior (IMAP polling mode):**
  1. Establish IMAP connection.
  2. Start the polling timer (configurable interval, default: 60 seconds).
  3. Mark adapter health as `healthy`.
- **Behavior (SES webhook mode):**
  1. Register the webhook endpoint (or signal the host process that the
     endpoint is ready to receive).
  2. Mark adapter health as `healthy`.
- **Returns:** `Promise<Result<void>>`.
- **Post-condition:** The adapter is processing inbound email.

### 7.3 `stop()`

- **Required Hermes phase:** Any non-terminal (always allowed per §4.5).
- **Behavior (IMAP polling mode):**
  1. Stop the polling timer.
  2. Close the IMAP connection.
  3. Drain in-flight message handling.
  4. Mark adapter health as `stopped`.
- **Behavior (SES webhook mode):**
  1. Unregister the webhook endpoint.
  2. Drain in-flight message handling.
  3. Mark adapter health as `stopped`.
- **Returns:** `Promise<Result<void>>`.
- **Post-condition:** No new emails are processed.

### 7.4 `health()`

- **Required Hermes phase:** Any (always allowed per §4.5).
- **Behavior:**
  1. Return the adapter's own health status. Does **NOT** call
     `hermes.health()`.
  2. In IMAP polling mode: reports whether the IMAP connection is alive.
  3. In SES webhook mode: reports whether the webhook endpoint is
     reachable.
- **Returns:** `AdapterHealth` (`{ status, detail?, at }`).

### 7.5 `metadata()`

- **Required Hermes phase:** Any (always allowed per §4.5).
- **Behavior:**
  1. Return adapter identity: name, version, interface type, supported
     operations, transport, mode.
- **Returns:** `EmailMetadata`.

---

## 8. Authentication

### 8.1 IMAP Polling Mode

Authentication is implicit in the IMAP connection:
- The adapter connects to the IMAP server using configured credentials
  (`EMAIL_IMAP_HOST`, `EMAIL_IMAP_USER`, `EMAIL_IMAP_PASSWORD`).
- Connection failure is reported as adapter health degradation.
- No per-message authentication is needed (the connection itself is
  authenticated).

### 8.2 SES Webhook Mode

Per platform.md §17.4, inbound emails arrive via AWS SES → SNS → HTTP
POST. The adapter validates the SNS notification signature:

- **Mechanism:** AWS SNS uses HMAC-SHA256 signatures in the
  `x-amz-sns-signature` header.
- **Validation:** The adapter verifies the signature against the SNS
  message body using the configured SNS signing certificate.
- **Configuration:** The SNS topic ARN and signing certificate are
  provided via adapter configuration.

### 8.3 Signature Failure Behavior

If signature validation fails:
- The adapter returns a rejection (HTTP 403 equivalent for webhook mode).
- The adapter logs the failure with the request ID.
- The adapter does **not** expose internal error details.

---

## 9. Authorization / Permissions

### 9.1 Permission Model

Per platform.md §17.4, the Email adapter uses a **sender email
allow-list** for caller authorization.

| Role | Allowed operations |
| --- | --- |
| `admin` | `start`, `stop`, `status`, `health`, `plugins`, `config`, `version` |
| `viewer` | `status`, `health`, `config`, `version` |

### 9.2 Role Resolution

The adapter maintains a configured list of admin email addresses
(`EMAIL_ADMIN_ADDRESSES`, comma-separated). At message handling time:

1. Extract the sender email address from the `From:` header.
2. Normalize the email address (lowercase, trim whitespace).
3. If the email address is in the admin list, assign role `admin`.
4. Otherwise, assign role `viewer`.

### 9.3 Permission Enforcement

Before calling Hermes, the adapter checks whether the caller's role
permits the requested operation using the `can` predicate from
`@agent-os/core/kernel-permissions`.

| Check | Result on failure |
| --- | --- |
| `can(role, action)` returns `false` | Skip message, log warning (no reply sent for unauthorized commands) |

### 9.4 Mapping to Hermes Permissions

Per platform.md §11.7:

| Authenticated identity | Hermes permission |
| --- | --- |
| Admin sender email | Full access |
| Non-admin sender email | Read-only |

Full access: `start`, `stop`, `status`, `health`, `plugins`, `config`,
`version`.
Read-only: `status`, `health`, `config`, `version`.

---

## 10. Message Flow

### 10.1 Incoming Message Processing

```
1. Inbound email arrives (IMAP poll or SES webhook)
2. Adapter authenticates source (IMAP connection or SNS signature)
3. Adapter extracts: sender email, subject line, date, message ID
4. Adapter resolves sender role (admin / viewer)
5. Adapter parses subject line for command:
   a. Match against command table (e.g. "start" → hermes.start())
   b. Extract arguments (e.g. "--timeout 30000")
   c. If no match → skip message (no response)
6. Adapter checks phase gating for the operation
7. Adapter checks role authorization for the operation
8. Adapter calls Hermes API
9. Adapter translates Result<T> to email reply text
10. Adapter sends reply email
```

### 10.2 Command Table

| Subject-line pattern | Hermes call | Description |
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

- Commands are extracted from the email subject line.
- The subject line is parsed as: `[optional prefix] <command> [arguments]`.
- Commands are case-insensitive.
- If a configurable prefix is set (e.g. `[AgentOS]`), it is stripped
  before command parsing.
- Arguments follow the command, separated by whitespace.
- Unknown commands are silently skipped (no reply sent).
- Empty subject lines are silently skipped.

### 10.4 Reply Format

Replies are plain text emails sent from the adapter. The format follows
the CLI adapter's human-readable output conventions (§5.4 of
platform.md):

| Reply type | Format |
| --- | --- |
| Success | Subject: `Re: <original subject>` — Body: human-readable text |
| Error | Subject: `Re: <original subject>` — Body: error code + message |
| Help | Subject: `Re: <original subject>` — Body: command list |

### 10.5 Reply Headers

Reply emails include:

| Header | Value |
| --- | --- |
| `To:` | Original sender (`From:` address) |
| `Subject:` | `Re: <original subject>` |
| `In-Reply-To:` | Original `Message-ID` (for threading) |
| `References:` | Original `Message-ID` (for threading) |

---

## 11. Error Handling

### 11.1 Error Propagation

Per platform.md §12.1:

```
Hermes Error → Adapter → Email Reply
```

The adapter must never throw. All errors are caught and translated into
email reply text.

### 11.2 Error Categories

| Category | Source | Adapter response |
| --- | --- | --- |
| IMAP connection failure | Cannot connect to IMAP server | Log error; mark health degraded; retry on next poll |
| SNS signature failure | Invalid `x-amz-sns-signature` | Log and reject (no Hermes call) |
| Malformed SNS notification | Unparseable SNS payload | Log and reject |
| No recognizable command | Subject line has no matching command | Skip message (no reply) |
| Permission denied | Sender role insufficient for operation | Skip message, log warning |
| Phase conflict | Operation illegal in current Hermes phase | Skip message, log warning |
| Hermes error | `hermes.<method>()` returns `Result.err` | Log error; reply with error message |
| IMAP send failure | Cannot send reply via IMAP | Log error; reply may be lost |
| SES send failure | Cannot send reply via SES | Log error; reply may be lost |
| Internal error | Unexpected adapter failure | Log with request ID; skip message |

### 11.3 Error Envelope

The adapter maps errors to the shared `AdapterErrorCode` taxonomy from
`@agent-os/core/adapter-errors`:

| Error category | `AdapterErrorCode` |
| --- | --- |
| SNS signature invalid | `AUTH_FORBIDDEN` |
| Malformed payload | `VALIDATION_ERROR` |
| No recognizable command | `VALIDATION_ERROR` |
| Permission denied | `AUTH_FORBIDDEN` |
| Phase conflict | `PHASE_CONFLICT` |
| Hermes error | `HERMES_ERROR` |
| Internal error | `HERMES_ERROR` |

### 11.4 Error Message Convention

Error messages in email replies follow this format:

```
<ERROR_CODE>: <human-readable explanation>
```

Internal error details (stack traces, IMAP diagnostics, Hermes
diagnostics) are logged with the request ID for operator review. They are
**not** exposed in email replies.

### 11.5 IMAP Polling Error Recovery

IMAP connections may drop unexpectedly. The adapter implements
reconnection logic:

| Condition | Behavior |
| --- | ---|
| IMAP connection lost during poll | Mark health degraded; reconnect on next interval |
| IMAP authentication failure | Mark health failed; log error; do not retry until reconfigured |
| IMAP server unreachable | Mark health degraded; retry on next interval with back-off |

---

## 12. Adapter Health Model

### 12.1 Health Reporting

Per platform.md §4.1, the adapter health reports whether the adapter
**itself** is functional — not `hermes.health()`.

| Health status | Meaning |
| --- | --- |
| `healthy` | IMAP connection is alive (polling mode) or webhook endpoint is registered (webhook mode) |
| `degraded` | IMAP connection is experiencing intermittent failures or webhook endpoint has high latency |
| `failed` | IMAP connection is broken or webhook endpoint is not reachable; configuration is invalid |
| `unknown` | Adapter is not yet initialized or not yet started |

### 12.2 Health Check Scope (IMAP Polling Mode)

The health check verifies:
- The IMAP connection is established and authenticated.
- The last poll completed without error.
- The adapter is in the `Started` lifecycle state.

### 12.3 Health Check Scope (SES Webhook Mode)

The health check verifies:
- The webhook endpoint is registered (if the host process manages
  registration).
- The adapter configuration is valid.
- The adapter is in the `Started` lifecycle state.

### 12.4 Health Check Scope (Both Modes)

The health check does **not** verify:
- IMAP server availability beyond the current connection.
- AWS SES or SNS availability (external services are out of adapter
  control).
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
| `adapter` | `'email'` |
| `requestId` | UUID v4, generated at inbound message boundary |
| `correlationId` | From inbound message or generated UUID v4 |
| `traceId` | From OpenTelemetry context (if available) |
| `spanId` | From OpenTelemetry context (if available) |
| `phase` | Current Hermes lifecycle phase |
| `senderEmail` | Sender email address (masked in logs: username partial + domain) |
| `command` | Parsed command name (if recognizable) |
| `mode` | `'imap-polling'` or `'ses-webhook'` |

### 13.2 Request IDs

Every inbound email message is assigned a UUID v4 request ID at the
adapter boundary. The request ID is included in all log entries for that
message. The request ID is **not** included in the email reply.

### 13.3 Correlation IDs

If the inbound email contains a `Message-ID` header, the adapter uses it
as the correlation ID. Otherwise, the adapter generates a UUID v4.

### 13.4 Tracing

The adapter creates an OpenTelemetry span for each inbound email:
- Span name: `email.<command>` (e.g. `email.start`).
- The span inherits trace context from the caller if provided.

---

## 14. Configuration

### 14.1 Required Configuration

| Key | Source | Mode | Description |
| --- | --- | --- | --- |
| `EMAIL_ADMIN_ADDRESSES` | env | Both | Comma-separated list of admin email addresses |
| `EMAIL_COMMAND_PREFIX` | env (optional) | Both | Subject-line prefix to strip (e.g. `[AgentOS]`) |

### 14.2 IMAP Polling Mode Configuration

| Key | Source | Description |
| --- | --- | --- |
| `EMAIL_IMAP_HOST` | env | IMAP server hostname |
| `EMAIL_IMAP_PORT` | env (optional) | IMAP server port (default: 993) |
| `EMAIL_IMAP_USER` | env | IMAP username |
| `EMAIL_IMAP_PASSWORD` | env | IMAP password |
| `EMAIL_IMAP_TLS` | env (optional) | Use TLS (default: `true`) |
| `EMAIL_IMAP_POLL_INTERVAL_MS` | env (optional) | Polling interval in ms (default: 60000) |
| `EMAIL_IMAP_FOLDER` | env (optional) | Folder to poll (default: `INBOX`) |

### 14.3 SES Webhook Mode Configuration

| Key | Source | Description |
| --- | --- | --- |
| `EMAIL_SES_WEBHOOK_ENABLED` | env | Set to `true` to enable SES webhook mode |
| `EMAIL_SES_TOPIC_ARN` | env | SNS topic ARN for inbound email notifications |
| `EMAIL_SES_SIGNING_CERT_URL` | env | URL of the SNS signing certificate |

### 14.4 Configuration Validation

All configuration is validated at `initialize()` time via Zod schema.
Invalid configuration causes `initialize()` to return `Result.err`.

### 14.5 Configuration Scope

Configuration is read from environment variables at `initialize()` time
and frozen. No configuration mutations after initialization.

### 14.6 Mode Selection Logic

```
if EMAIL_SES_WEBHOOK_ENABLED == "true":
    mode = ses-webhook
    require: EMAIL_SES_TOPIC_ARN, EMAIL_SES_SIGNING_CERT_URL
else:
    mode = imap-polling
    require: EMAIL_IMAP_HOST, EMAIL_IMAP_USER, EMAIL_IMAP_PASSWORD
```

---

## 15. Security Considerations

### 15.1 Trust Boundary

```
┌──────────────────────────────────────────────────────────┐
│  Untrusted Zone                                           │
│  Inbound emails (IMAP or SES webhook)                     │
└──────────────────────┬───────────────────────────────────┘
                       │  Authentication + sender allow-list
                       ▼
┌──────────────────────────────────────────────────────────┐
│  Platform Layer (Email Adapter)                           │
│  Input validation, auth enforcement                       │
└──────────────────────┬───────────────────────────────────┘
                       │  Typed Hermes API calls
                       ▼
┌──────────────────────────────────────────────────────────┐
│  Trusted Zone                                             │
│  Hermes Kernel, Runtime, EventBus, Core, Observability    │
└──────────────────────────────────────────────────────────┘
```

### 15.2 Credential Protection

- IMAP credentials (`EMAIL_IMAP_PASSWORD`) are never logged, never
  included in responses, and never exposed through any endpoint.
- SNS signing certificates are fetched over HTTPS only.
- All secrets are read from environment variables at `initialize()` time.

### 15.3 Email Address Masking

Sender email addresses are masked in log output (username partial +
domain) to reduce PII leakage into structured logs.

### 15.4 Input Validation

All email subject lines are validated before command parsing:
- Maximum subject length enforced.
- Control characters stripped.
- No user-supplied data is passed to Hermes without validation.

### 15.5 Rate Limiting

Per platform.md §15.2, rate limiting is enforced per adapter, per
authenticated identity. The Email adapter applies rate limiting to
inbound email processing. Default: 60 commands per minute per sender
email address.

### 15.6 IMAP Security

- IMAP connections use TLS by default.
- Plaintext IMAP is allowed only with explicit `EMAIL_IMAP_TLS=false`
  configuration (for development environments).
- IMAP credentials are never stored on disk by the adapter.

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
| --- | --- |
| Subject-line parser | Parse valid commands, handle unknown commands, handle empty subjects, handle prefix stripping, handle argument extraction |
| Permission resolver | Admin emails resolve to `admin`, non-admin resolve to `viewer`, unknown resolve to `viewer`, normalization (case, whitespace) |
| Signature validator (webhook mode) | Valid SNS signature passes, invalid signature fails, missing header fails, tampered body fails |
| Error mapping | Each error category maps to the correct `AdapterErrorCode` |
| Configuration validation | Valid config passes, missing required keys fail, invalid values fail, mode selection logic correct |
| IMAP reconnection | Connection lost → health degraded → reconnect on next interval |

### 17.2 Integration Tests

| Test | What it verifies |
| --- | --- |
| Full lifecycle (IMAP mode) | `initialize()` → `start()` → poll cycle → `stop()` in sequence |
| Full lifecycle (webhook mode) | `initialize()` → `start()` → receive webhook → `stop()` in sequence |
| Hermes interaction | Subject-line parsing → Hermes call → reply translation |
| Phase gating | Operations rejected when Hermes is not in the expected phase |
| Permission enforcement | Admin-only operations rejected for viewer role |
| Health reporting | `health()` returns adapter status independent of Hermes health |
| Mode isolation | Only one mode active at a time; configuration determines mode |

### 17.3 Test Conventions

- All tests use `vitest`.
- Hermes is mocked via `HermesPort` (hand-constructed test doubles).
- IMAP and SES are mocked (no external connections in tests).
- No environment variable reads in tests (config is injected).

---

## 18. Future Extensions

The following extensions are **reserved** — they are named here so the
architecture can accommodate them, but they are **not implemented** and
must not appear in the source tree until their own specifications are
written and approved.

### 18.1 Email Threading

- **Purpose:** Maintain email conversation threads using `In-Reply-To`
  and `References` headers for conversational continuity.
- **Priority:** Post-Phase 5.

### 18.2 Attachment Handling

- **Purpose:** Process incoming attachments (e.g. configuration files,
  data payloads) and map them to Hermes operations.
- **Priority:** Post-Phase 5.

### 18.3 HTML Email Support

- **Purpose:** Parse HTML email bodies for commands and render HTML
  replies for richer output.
- **Priority:** Post-Phase 5.

### 18.4 Event-Driven Email Notifications

- **Purpose:** Send email notifications on Hermes lifecycle events
  (e.g. `hermes.failed` → email admin).
- **Priority:** Post-Phase 5. Requires own architecture specification
  per §17 preamble.

---

## 19. Risks

| Risk | Severity | Mitigation |
| --- | ---| --- |
| IMAP servers may have strict connection limits or rate limits | Medium | Respect server rate limits; implement exponential back-off on connection failures |
| SES webhook mode depends on AWS infrastructure availability | Medium | Adapter health degrades if SNS delivery fails; operator monitoring required |
| Email subject-line parsing is inherently ambiguous (Re:, Fwd:, prefixes) | Medium | Strip common email prefixes before command parsing; configurable prefix |
| IMAP polling introduces latency (up to poll interval delay) | Low | Configurable poll interval; webhook mode avoids this for production |
| Email reply delivery may fail silently (bounce, spam filter) | Low | Log reply send failures; operator monitoring required |
| IMAP IDLE support would improve real-time response but adds complexity | Low | Out of scope for Phase 5; reserved as future extension |

---

## 20. Open Questions

| # | Question | Impact | Required for |
| --- | --- | --- | --- |
| 1 | Should the adapter support IMIDLE for real-time email detection, or only timed polling? | Latency vs complexity | Spec approval |
| 2 | Should the adapter strip `Re:`, `Fwd:`, and other email prefixes automatically, or require explicit configuration? | Command parsing robustness | Spec approval |
| 3 | Should unauthorized commands silently skip (no reply), or should they receive a "Permission denied" reply? | User experience | Spec approval |
| 4 | Should the adapter send replies via the same channel they arrived on (IMAP reply vs SES send), or always use a configured outbound channel? | Deployment flexibility | Spec approval |
| 5 | What is the maximum subject line length the adapter should accept? | Input validation | Implementation |
| 6 | Should the adapter support multiple IMAP accounts, or only one? | Multi-tenant support | Spec approval |
| 7 | Should the adapter expose the webhook endpoint through the existing `apps/api` Fastify server, or through a standalone process? | Deployment model | Implementation |

---

## Revision History

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| 1.0.0 | 2026-06-29 | Agent OS Maintainers | Phase 5.1 — Email adapter architecture specification |
