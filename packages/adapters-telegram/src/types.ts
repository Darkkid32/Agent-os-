/**
 * Telegram adapter types.
 *
 * Per docs/architecture/platform.md §8 the Telegram adapter is a
 * presentation adapter only. It owns no business logic. Every command
 * receives a TelegramContext, calls Hermes through HermesPort, and
 * returns a Result<TelegramMessage, CommandError>. The dispatcher
 * translates the Result into a Telegram reply. Unexpected failures
 * (SDK / network) are caught by the dispatcher and translated into a
 * generic user-facing message.
 */
import type {
  AdapterHealth,
  AdapterHealthStatus,
  AdapterMetadata,
} from '@agent-os/core/adapter-metadata';
import type { HermesPort } from '@agent-os/hermes';
import type { Result } from '@agent-os/core';
import type { Logger } from '@agent-os/observability';
import type { TelegramAction, TelegramRole } from './permissions.js';

/**
 * Adapter-side transport DTO. Converted to a grammY `ctx.reply(text, ...)`
 * payload at the Telegram boundary. Telegram is text-first; embeds are
 * not a first-class surface, so the DTO is intentionally minimal.
 */
export interface TelegramMessage {
  readonly text: string;
  readonly parseMode?: 'HTML' | 'MarkdownV2';
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

export interface TelegramContext {
  readonly hermes: HermesPort;
  readonly userId: string;
  readonly chatId: number;
  readonly role: TelegramRole;
  readonly now: () => number;
}

/**
 * Per-command arguments. Telegram slash commands in scope (Phase 3.5)
 * take no arguments; the field is reserved for future commands.
 */
export interface TelegramCommandArgs {
  readonly options: Readonly<Record<string, string>>;
}

export interface TelegramCommand {
  readonly name: string;
  readonly description: string;
  readonly requires: TelegramAction;
  readonly handler: (
    ctx: TelegramContext,
    args: TelegramCommandArgs,
  ) => Promise<Result<TelegramMessage, CommandError>>;
}

export interface TelegramInitConfig {
  readonly botToken: string;
  readonly adminUserIds: readonly string[];
  readonly webhookUrl?: string;
  readonly logger?: Logger;
}

export type TelegramTransport = 'polling' | 'webhook';

export type TelegramMetadata = AdapterMetadata & {
  readonly transport: TelegramTransport;
};

export type TelegramAdapterHealthStatus = AdapterHealthStatus;
export type TelegramAdapterHealth = AdapterHealth;
