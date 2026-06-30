/**
 * Public exports for @agent-os/adapters-whatsapp (Phase 5).
 *
 * The adapter is a presentation layer only. Consumers (apps/api,
 * apps/cli) own lifecycle, transport wiring, and secret management.
 */
export {
  WhatsAppAdapter,
  ADAPTER_NAME,
  ADAPTER_VERSION,
  WEBHOOK_PATH,
  SUPPORTED_OPERATIONS,
} from './WhatsAppAdapter.js';
export { PACKAGE_NAME, PACKAGE_VERSION } from './constants.js';
export type {
  CommandError,
  WhatsAppAdapterHealth,
  WhatsAppCommand,
  WhatsAppCommandArgs,
  WhatsAppContext,
  WhatsAppInitConfig,
  WhatsAppMessage,
  WhatsAppMetadata,
} from './types.js';
export { PermissionError, roleFor, can, requireRole } from './permissions.js';
export type { WhatsAppAction, WhatsAppRole } from './permissions.js';
