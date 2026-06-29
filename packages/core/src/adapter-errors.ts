/**
 * Shared adapter error taxonomy.
 *
 * Per docs/architecture/platform.md §6.5 and §6.6 every response — success
 * or failure — is wrapped in a uniform envelope. The error half of the
 * envelope is a stable, machine-readable code plus a human-readable
 * message. The 8 codes listed in §6.6 are the canonical set:
 *
 *   | HTTP | Code                | When                                    |
 *   |------|---------------------|-----------------------------------------|
 *   | 400  | VALIDATION_ERROR    | Request body / query failed validation  |
 *   | 401  | AUTH_MISSING        | No API key or JWT supplied              |
 *   | 403  | AUTH_FORBIDDEN      | API key or JWT invalid / expired        |
 *   | 404  | NOT_FOUND           | Resource does not exist                 |
 *   | 409  | PHASE_CONFLICT      | Operation not legal in current phase    |
 *   | 429  | RATE_LIMITED        | Caller exceeded rate limit              |
 *   | 500  | HERMES_ERROR        | Hermes returned an error                |
 *   | 503  | SERVICE_UNAVAILABLE | Adapter or Hermes is not RUNNING        |
 *
 * Phase 4.4 lifts the codes, the shape, the constructor, the
 * kernel-error mapper, and the HTTP status map into a single module
 * inside `@agent-os/core`. The shape is a frozen plain object — not a
 * class — so it serialises cleanly to JSON for the REST envelope and is
 * trivial for adapters to compose into their per-surface error format
 * (Discord embed field, Telegram escaped text, MCP `isError: true` tool
 * result, Webhook handler `Result<...>`).
 *
 * The mapper (`mapKernelErrorToAdapterError`) is a *best-effort*
 * translator from the kernel's `unknown` error to a canonical
 * `AdapterErrorShape`. It recognises:
 *   - `PermissionError` from `@agent-os/core/kernel-permissions` →
 *     `AUTH_FORBIDDEN`;
 *   - any error whose message contains "operation not allowed in phase"
 *     (the message format used by `Hermes.assertPhase`) → `PHASE_CONFLICT`;
 *   - everything else → `HERMES_ERROR`.
 * The mapper never throws and never mutates its input.
 */
import { PermissionError } from './kernel-permissions.js';

export type AdapterErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_MISSING'
  | 'AUTH_FORBIDDEN'
  | 'NOT_FOUND'
  | 'PHASE_CONFLICT'
  | 'RATE_LIMITED'
  | 'HERMES_ERROR'
  | 'SERVICE_UNAVAILABLE';

/**
 * Default HTTP status code associated with each adapter error code, per
 * `platform.md` §6.6. The map is the single source of truth — REST route
 * handlers and CLI exit-code mappers both consult it.
 */
export const ADAPTER_ERROR_HTTP_STATUS: Readonly<Record<AdapterErrorCode, number>> = Object.freeze({
  VALIDATION_ERROR: 400,
  AUTH_MISSING: 401,
  AUTH_FORBIDDEN: 403,
  NOT_FOUND: 404,
  PHASE_CONFLICT: 409,
  RATE_LIMITED: 429,
  HERMES_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
});

export interface AdapterErrorShape {
  readonly code: AdapterErrorCode;
  readonly message: string;
  readonly detail?: unknown;
}

/**
 * Build a frozen `AdapterErrorShape`. The shape is a plain object so it
 * can be safely spread into per-adapter error envelopes (the existing
 * `CommandError`, `TelegramMessage`-format error string, Discord embed
 * field, MCP `isError: true` result, Webhook `Result` error half, and
 * REST envelope error half).
 */
export const adapterError = (
  code: AdapterErrorCode,
  message: string,
  detail?: unknown,
): AdapterErrorShape =>
  detail === undefined
    ? Object.freeze({ code, message })
    : Object.freeze({ code, message, detail });

/**
 * Best-effort mapper from a kernel-side `unknown` error to a canonical
 * `AdapterErrorShape`. Never throws. If the input is `null` or
 * `undefined`, returns `HERMES_ERROR` with a generic message.
 */
export const mapKernelErrorToAdapterError = (e: unknown): AdapterErrorShape => {
  if (e === null || e === undefined) {
    return adapterError('HERMES_ERROR', 'Unknown kernel error');
  }

  if (e instanceof PermissionError) {
    return adapterError('AUTH_FORBIDDEN', `Action "${e.action}" denied for role "${e.role}".`, {
      action: e.action,
      role: e.role,
    });
  }

  if (e instanceof Error) {
    const message = e.message;
    if (
      message.includes('operation not allowed in phase') ||
      message.includes('illegal transition') ||
      message.includes('cannot stop from')
    ) {
      return adapterError('PHASE_CONFLICT', message);
    }
    return adapterError('HERMES_ERROR', message);
  }

  return adapterError('HERMES_ERROR', 'Unknown kernel error', { value: e });
};
