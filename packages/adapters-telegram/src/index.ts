/**
 * Public exports for @agent-os/adapters-telegram (Phase 3.5).
 *
 * The adapter is a presentation layer only. Consumers (apps/api,
 * apps/cli) own lifecycle, transport wiring, and secret management.
 */
export {
  TelegramAdapter,
  ADAPTER_NAME,
  ADAPTER_VERSION,
  SUPPORTED_OPERATIONS,
} from './TelegramAdapter.js';
export { PACKAGE_NAME, PACKAGE_VERSION } from './constants.js';
export type {
  CommandError,
  TelegramAdapterHealth,
  TelegramAdapterHealthStatus,
  TelegramCommand,
  TelegramCommandArgs,
  TelegramContext,
  TelegramInitConfig,
  TelegramMessage,
  TelegramMetadata,
  TelegramTransport,
} from './types.js';
export { PermissionError, roleFor, can, requireRole } from './permissions.js';
export type { TelegramAction, TelegramRole } from './permissions.js';
