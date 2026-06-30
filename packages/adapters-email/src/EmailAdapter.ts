/**
 * Email adapter.
 *
 * Composition root for the eight commands in `commands/`. Per
 * docs/architecture/platform.md §17.4 the adapter supports two modes:
 * IMAP polling and SES webhook. Only one mode may be active at a time.
 * The adapter is a presentation adapter only — it owns no business logic.
 *
 * The Email adapter reads Hermes through HermesPort, never directly, and
 * only knows:
 *   - the eight text commands,
 *   - the role taxonomy,
 *   - the local transport DTO (EmailMessage).
 *
 * No caching. No mutable global state. No adapter-to-adapter links.
 *
 * IMAP mode: the adapter provides the composition root. The host process
 * (typically apps/api) owns the IMAP connection lifecycle and timer.
 * The adapter exposes `handleMessage` for the host to invoke with a
 * parsed inbound email.
 *
 * SES webhook mode: the host process owns the HTTP endpoint, SNS
 * signature verification, and request routing. The adapter exposes
 * `handleMessage` for the host to invoke with the sender email and
 * subject line.
 */
import type { HermesPort } from '@agent-os/hermes';
import { now as coreNow } from '@agent-os/core';
import {
  type Logger,
  createLogger,
  withSpan,
  createMetricRegistry,
  createAdapterMetrics,
  type AdapterMetrics,
} from '@agent-os/observability';

import {
  type CommandError,
  type EmailAdapterHealth,
  type EmailCommand,
  type EmailContext,
  type EmailInitConfig,
  type EmailMessage,
  type EmailMetadata,
} from './types.js';
import { roleFor, requireRole } from './permissions.js';
import {
  PermissionError as KernelPermissionError,
  type PermissionError as KernelPermissionErrorType,
} from '@agent-os/core/kernel-permissions';
import { formatErrorMessage, formatPermissionMessage } from './formats.js';
import { parseEmailSubject, isKnownCommand } from './parseCommand.js';

import { startCommand } from './commands/StartCommand.js';
import { stopCommand } from './commands/StopCommand.js';
import { statusCommand } from './commands/StatusCommand.js';
import { healthCommand } from './commands/HealthCommand.js';
import { modulesCommand } from './commands/ModulesCommand.js';
import { configCommand } from './commands/ConfigCommand.js';
import { versionCommand } from './commands/VersionCommand.js';
import { helpCommand } from './commands/HelpCommand.js';

export const ADAPTER_NAME = '@agent-os/adapters-email';
export const ADAPTER_VERSION = '1.0.0';
export const WEBHOOK_PATH = '/v1/adapters/email/webhook';
export const SUPPORTED_OPERATIONS: readonly string[] = [
  'start',
  'stop',
  'status',
  'health',
  'modules',
  'config',
  'version',
  'help',
];

const COMMANDS: readonly EmailCommand[] = [
  startCommand,
  stopCommand,
  statusCommand,
  healthCommand,
  modulesCommand,
  configCommand,
  versionCommand,
  helpCommand,
];

const isPermissionError = (e: unknown): e is KernelPermissionErrorType =>
  e instanceof KernelPermissionError;

const toCommandError = (e: unknown): CommandError => {
  if (e instanceof Error) {
    return { code: 'UNEXPECTED', message: e.message };
  }
  return { code: 'UNEXPECTED', message: 'Unexpected error.' };
};

const replyWithMessage = (message: EmailMessage): EmailMessage => message;

const replyWithError = (err: CommandError): EmailMessage =>
  replyWithMessage(formatErrorMessage(err.message));

const replyWithPermission = (action: string): EmailMessage =>
  replyWithMessage(formatPermissionMessage(action));

export class EmailAdapter {
  private readonly metadata: EmailMetadata;
  private readonly hermes: HermesPort;
  private readonly initConfig: EmailInitConfig;
  private readonly commands: readonly EmailCommand[];
  private readonly logger: Logger;
  private readonly metrics: AdapterMetrics;

  private started: boolean;
  private lastError: string | undefined;
  private resolvedAdminEmails: readonly string[];

  public constructor(hermes: HermesPort, init: EmailInitConfig) {
    this.hermes = hermes;
    this.initConfig = init;
    this.resolvedAdminEmails = init.adminEmails;
    this.commands = COMMANDS;
    this.logger = (init.logger ?? createLogger()).child('email');
    this.metrics = createAdapterMetrics(init.metricRegistry ?? createMetricRegistry(), 'email');
    this.metadata = {
      name: ADAPTER_NAME,
      version: ADAPTER_VERSION,
      interfaceType: 'email',
      supportedOperations: SUPPORTED_OPERATIONS,
      transport: init.mode === 'imap-polling' ? 'imap' : 'ses-webhook',
      mode: init.mode,
    };
    this.started = false;
  }

  public getMetadata(): EmailMetadata {
    return this.metadata;
  }

  /**
   * Validate configuration and prepare the command table. Does not
   * establish IMAP connections or register HTTP endpoints — that is
   * the host process's responsibility.
   */
  public async initialize(): Promise<void> {
    if (this.initConfig.mode === 'imap-polling') {
      if (!this.initConfig.imap) {
        throw new Error(`${ADAPTER_NAME}: IMAP configuration is required for imap-polling mode.`);
      }
      if (this.initConfig.imap.host.length === 0) {
        throw new Error(`${ADAPTER_NAME}: EMAIL_IMAP_HOST is required.`);
      }
      if (this.initConfig.imap.user.length === 0) {
        throw new Error(`${ADAPTER_NAME}: EMAIL_IMAP_USER is required.`);
      }
      if (this.initConfig.imap.password.length === 0) {
        throw new Error(`${ADAPTER_NAME}: EMAIL_IMAP_PASSWORD is required.`);
      }
    }
    if (this.initConfig.mode === 'ses-webhook') {
      if (!this.initConfig.ses) {
        throw new Error(`${ADAPTER_NAME}: SES configuration is required for ses-webhook mode.`);
      }
      if (this.initConfig.ses.topicArn.length === 0) {
        throw new Error(`${ADAPTER_NAME}: EMAIL_SES_TOPIC_ARN is required.`);
      }
      if (this.initConfig.ses.signingCertUrl.length === 0) {
        throw new Error(`${ADAPTER_NAME}: EMAIL_SES_SIGNING_CERT_URL is required.`);
      }
    }
    this.resolvedAdminEmails = this.initConfig.adminEmails;
    this.logger.info('initialized', { mode: this.initConfig.mode });
  }

  /**
   * Start the adapter. Marks the adapter as ready to receive messages.
   * The host process owns the IMAP connection or HTTP endpoint lifecycle.
   */
  public async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.lastError = undefined;
    this.logger.info('started');
  }

  public async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    this.logger.info('stopped');
  }

  public health(): EmailAdapterHealth {
    if (!this.started) {
      return { status: 'degraded', detail: 'not started', at: coreNow() };
    }
    if (this.lastError) {
      return { status: 'failed', detail: this.lastError, at: coreNow() };
    }
    return { status: 'healthy', at: coreNow() };
  }

  /**
   * Entry point for inbound email messages. The host process wires this
   * into either:
   *   - an IMAP polling loop (poll → parse → handleMessage)
   *   - an SES webhook route (receive → verify → handleMessage)
   *
   * The adapter returns an EmailMessage that the host sends back via
   * the appropriate channel (IMAP reply or SES send).
   */
  public async handleMessage(senderEmail: string, subject: string): Promise<EmailMessage> {
    return withSpan('email.handleMessage', async (span) => {
      span.setAttribute('sender_email', senderEmail);
      this.metrics.requestsTotal.inc();
      this.metrics.activeRequests.set(this.metrics.activeRequests.getValue() + 1);
      const startMs = performance.now();

      if (!this.started) {
        this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
        this.metrics.errorsTotal.inc();
        return replyWithError({ code: 'INTERNAL', message: 'Adapter not started.' });
      }

      const role = roleFor(senderEmail, this.resolvedAdminEmails);
      const parsed = parseEmailSubject(subject, this.initConfig.commandPrefix);

      if (!parsed || !isKnownCommand(parsed.command)) {
        span.setAttribute('success', 'false');
        this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
        this.metrics.errorsTotal.inc();
        this.logger.warn('unknown command', { senderEmail });
        return replyWithError({
          code: 'VALIDATION',
          message: 'Unknown command. Send "help" for a list of commands.',
        });
      }

      const cmd = this.commands.find((c) => c.name === parsed.command);
      if (!cmd) {
        span.setAttribute('success', 'false');
        this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
        this.metrics.errorsTotal.inc();
        this.logger.warn('unknown command', { command: parsed.command, senderEmail });
        return replyWithError({
          code: 'VALIDATION',
          message: 'Unknown command. Send "help" for a list of commands.',
        });
      }

      span.setAttribute('command', cmd.name);
      this.logger.info('command start', { command: cmd.name, senderEmail });

      const ectx: EmailContext = {
        hermes: this.hermes,
        senderEmail,
        role,
        now: coreNow,
      };

      try {
        requireRole(role, cmd.requires);
      } catch (err) {
        if (isPermissionError(err)) {
          span.setAttribute('success', 'false');
          this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
          this.metrics.errorsTotal.inc();
          this.logger.warn('permission denied', { command: cmd.name, senderEmail });
          return replyWithPermission(cmd.name);
        }
        span.setAttribute('success', 'false');
        this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
        this.metrics.errorsTotal.inc();
        return replyWithError(toCommandError(err));
      }

      const args = { options: parsed.args };
      let result;
      try {
        result = await cmd.handler(ectx, args);
      } catch (err) {
        this.lastError = err instanceof Error ? err.message : String(err);
        span.setAttribute('success', 'false');
        this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
        this.metrics.errorsTotal.inc();
        this.logger.error('command failed', { command: cmd.name, error: this.lastError });
        return replyWithError(toCommandError(err));
      }

      if (result.ok) {
        span.setAttribute('success', 'true');
        this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
        this.metrics.commandsTotal.inc();
        this.metrics.commandDurationMs.observe(performance.now() - startMs);
        this.logger.info('command end', { command: cmd.name, success: true });
        return replyWithMessage(result.value);
      }
      span.setAttribute('success', 'false');
      this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
      this.metrics.errorsTotal.inc();
      this.logger.info('command end', { command: cmd.name, success: false });
      return replyWithError(result.error);
    });
  }
}
