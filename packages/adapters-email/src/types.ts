/**
 * Email adapter types.
 *
 * Per docs/architecture/platform.md §17.4 the Email adapter supports
 * two modes: IMAP polling and SES webhook. Only one mode may be active
 * at a time. The adapter is a presentation adapter only — it owns no
 * business logic. Every command receives an EmailContext, calls Hermes
 * through HermesPort, and returns a Result<EmailMessage, CommandError>.
 *
 * The Email adapter parses subject-line commands and translates Hermes
 * responses into email reply text.
 */
import type {
  AdapterHealth,
  AdapterHealthStatus,
  AdapterMetadata,
} from '@agent-os/core/adapter-metadata';
import type { HermesPort } from '@agent-os/hermes';
import type { Result } from '@agent-os/core';
import type { Logger } from '@agent-os/observability';
import type { EmailAction, EmailRole } from './permissions.js';

export type EmailAdapterMode = 'imap-polling' | 'ses-webhook';

/**
 * Adapter-side transport DTO. Email is text-first; the DTO carries
 * plain text reply content plus email-specific headers.
 */
export interface EmailMessage {
  readonly text: string;
  readonly subject: string;
  readonly inReplyTo?: string;
  readonly references?: string;
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

export interface EmailContext {
  readonly hermes: HermesPort;
  readonly senderEmail: string;
  readonly role: EmailRole;
  readonly now: () => number;
}

/**
 * Per-command arguments. Email commands in scope (Phase 5) take no
 * arguments; the field is reserved for future commands.
 */
export interface EmailCommandArgs {
  readonly options: Readonly<Record<string, string>>;
}

export interface EmailCommand {
  readonly name: string;
  readonly description: string;
  readonly requires: EmailAction;
  readonly handler: (
    ctx: EmailContext,
    args: EmailCommandArgs,
  ) => Promise<Result<EmailMessage, CommandError>>;
}

/** Base IMAP configuration. */
export interface EmailImapConfig {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;
  readonly tls: boolean;
  readonly pollIntervalMs: number;
  readonly folder: string;
}

/** SES webhook configuration. */
export interface EmailSesConfig {
  readonly enabled: boolean;
  readonly topicArn: string;
  readonly signingCertUrl: string;
}

export interface EmailInitConfig {
  readonly mode: EmailAdapterMode;
  readonly adminEmails: readonly string[];
  readonly commandPrefix: string;
  readonly imap: EmailImapConfig | undefined;
  readonly ses: EmailSesConfig | undefined;
  readonly logger?: Logger;
}

export type EmailMetadata = AdapterMetadata & {
  readonly transport: 'imap' | 'ses-webhook';
  readonly mode: EmailAdapterMode;
};

export type EmailAdapterHealthStatus = AdapterHealthStatus;
export type EmailAdapterHealth = AdapterHealth;
