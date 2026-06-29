/**
 * CommandError — the error half of a `Result<T, CommandError>` returned
 * from a command handler. The renderer maps this to a human-readable
 * line or to the `error.code` / `error.message` fields in JSON output.
 *
 * `code` is a stable, machine-readable string. The CLI does NOT invent
 * an HTTP-style envelope (per Phase 3.1 architectural adjustments); the
 * REST adapter will define the canonical API envelope later.
 */
export interface CommandError {
  readonly code: string;
  readonly message: string;
  readonly detail?: unknown;
}
