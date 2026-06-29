/**
 * WhatsApp adapter types.
 *
 * Per docs/architecture/platform.md §17.3 the WhatsApp adapter is a
 * presentation adapter only. It owns no business logic. Every command
 * receives a WhatsAppContext, calls Hermes through HermesPort, and
 * returns a Result<WhatsAppMessage, CommandError>. The dispatcher
 * translates the Result into a WhatsApp reply. Unexpected failures
 * (SDK / network) are caught by the dispatcher and translated into a
 * generic user-facing message.
 *
 * The WhatsApp adapter is webhook-only (no polling mode). The consumer
 * (typically apps/api) owns the HTTP endpoint wiring and signature
 * verification per platform.md §17.3.
 */
import type {
  AdapterHealth,
  AdapterHealthStatus,
  AdapterMetadata,
} from '@agent-os/core/adapter-metadata';
import type { HermesPort } from '@agent-os/hermes';
import type { Result } from '@agent-os/core';
import type { WhatsAppAction, WhatsAppRole } from './permissions.js';

/**
 * Adapter-side transport DTO. WhatsApp is text-first; there is no
 * parseMode equivalent — the DTO carries plain text only.
 */
export interface WhatsAppMessage {
  readonly text: string;
}

/**
 * Stable, machine-readable error codes for command failures. Kept
 * adapter-local; the REST envelope (platform.md §6.5) is the canonical
 * shape for cross-adapter errors.
 */
export interface CommandError {
  readonly code: string;
  readonly message: string;
  readonly detail?: unknown;
}

export interface WhatsAppContext {
  readonly hermes: HermesPort;
  readonly senderPhone: string;
  readonly role: WhatsAppRole;
  readonly now: () => number;
}

/**
 * Per-command arguments. WhatsApp text commands in scope (Phase 5)
 * take no arguments; the field is reserved for future commands.
 */
export interface WhatsAppCommandArgs {
  readonly options: Readonly<Record<string, string>>;
}

export interface WhatsAppCommand {
  readonly name: string;
  readonly description: string;
  readonly requires: WhatsAppAction;
  readonly handler: (
    ctx: WhatsAppContext,
    args: WhatsAppCommandArgs,
  ) => Promise<Result<WhatsAppMessage, CommandError>>;
}

export interface WhatsAppInitConfig {
  readonly webhookSecret: string;
  readonly adminPhoneNumbers: readonly string[];
}

export type WhatsAppMetadata = AdapterMetadata & {
  readonly transport: 'webhook';
  readonly webhookPath: string;
};

export type WhatsAppAdapterHealthStatus = AdapterHealthStatus;
export type WhatsAppAdapterHealth = AdapterHealth;
