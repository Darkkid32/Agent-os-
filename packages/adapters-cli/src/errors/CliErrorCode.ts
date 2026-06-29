/**
 * CliErrorCode — closed string union of the codes the CLI may produce.
 *
 * The CLI does not invent an HTTP-style envelope; codes here are local
 * strings that the renderer renders. The REST adapter will define its
 * own canonical envelope later (per Phase 3.1 architectural adjustments).
 */
export type CliErrorCode =
  | 'USAGE'
  | 'UNKNOWN_COMMAND'
  | 'PERMISSION'
  | 'PHASE'
  | 'TIMEOUT'
  | 'SIGNAL'
  | 'HERMES'
  | 'INTERNAL';
