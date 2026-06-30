/**
 * Public exports for @agent-os/adapters-email (Phase 5).
 *
 * The adapter is a presentation layer only. Consumers (apps/api,
 * apps/cli) own lifecycle, transport wiring, and secret management.
 */
export {
  EmailAdapter,
  ADAPTER_NAME,
  ADAPTER_VERSION,
  WEBHOOK_PATH,
  SUPPORTED_OPERATIONS,
} from './EmailAdapter.js';
export { PACKAGE_NAME, PACKAGE_VERSION } from './constants.js';
export type {
  CommandError,
  EmailAdapterHealth,
  EmailAdapterHealthStatus,
  EmailAdapterMode,
  EmailCommand,
  EmailCommandArgs,
  EmailContext,
  EmailImapConfig,
  EmailInitConfig,
  EmailMessage,
  EmailMetadata,
  EmailSesConfig,
} from './types.js';
export { PermissionError, roleFor, can, requireRole } from './permissions.js';
export type { EmailAction, EmailRole } from './permissions.js';
export { parseEmailSubject, isKnownCommand, KNOWN_COMMANDS } from './parseCommand.js';
export type { ParsedCommand } from './parseCommand.js';
