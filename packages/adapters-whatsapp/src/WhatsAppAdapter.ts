/**
 * WhatsApp adapter.
 *
 * Composition root for the seven commands in `commands/`. Per
 * docs/architecture/platform.md §17.3 the adapter is a presentation
 * adapter only. It owns no business logic. It reads Hermes through
 * HermesPort, never directly, and only knows:
 *
 *   - the seven text commands,
 *   - the role taxonomy,
 *   - the local transport DTO (WhatsAppMessage).
 *
 * No caching. No mutable global state. No adapter-to-adapter links.
 *
 * The WhatsApp adapter is webhook-only. The consumer (typically apps/api)
 * owns the HTTP endpoint, signature verification (X-Hub-Signature-256),
 * and request routing. The adapter exposes `handleMessage` for the
 * consumer to invoke with a parsed, authenticated inbound message.
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
  type WhatsAppAdapterHealth,
  type WhatsAppCommand,
  type WhatsAppContext,
  type WhatsAppInitConfig,
  type WhatsAppMessage,
  type WhatsAppMetadata,
} from './types.js';
import { PermissionError as WhatsAppPermissionError, roleFor, requireRole } from './permissions.js';
import { formatErrorMessage, formatPermissionMessage } from './formats.js';

import { startCommand } from './commands/StartCommand.js';
import { stopCommand } from './commands/StopCommand.js';
import { statusCommand } from './commands/StatusCommand.js';
import { healthCommand } from './commands/HealthCommand.js';
import { modulesCommand } from './commands/ModulesCommand.js';
import { configCommand } from './commands/ConfigCommand.js';
import { versionCommand } from './commands/VersionCommand.js';

export const ADAPTER_NAME = '@agent-os/adapters-whatsapp';
export const ADAPTER_VERSION = '0.1.0';
export const WEBHOOK_PATH = '/v1/adapters/whatsapp/webhook';
export const SUPPORTED_OPERATIONS: readonly string[] = [
  'start',
  'stop',
  'status',
  'health',
  'modules',
  'config',
  'version',
];

const COMMANDS: readonly WhatsAppCommand[] = [
  startCommand,
  stopCommand,
  statusCommand,
  healthCommand,
  modulesCommand,
  configCommand,
  versionCommand,
];

const isPermissionError = (e: unknown): e is WhatsAppPermissionError =>
  e instanceof WhatsAppPermissionError;

const toCommandError = (e: unknown): CommandError => {
  if (e instanceof Error) {
    return { code: 'UNEXPECTED', message: e.message };
  }
  return { code: 'UNEXPECTED', message: 'Unexpected error.' };
};

const replyWithMessage = (message: WhatsAppMessage): WhatsAppMessage => message;

const replyWithError = (err: CommandError): WhatsAppMessage =>
  replyWithMessage(formatErrorMessage(err.message));

const replyWithPermission = (action: string): WhatsAppMessage =>
  replyWithMessage(formatPermissionMessage(action));

export class WhatsAppAdapter {
  private readonly metadata: WhatsAppMetadata;
  private readonly hermes: HermesPort;
  private readonly initConfig: WhatsAppInitConfig;
  private readonly commands: readonly WhatsAppCommand[];
  private readonly logger: Logger;
  private readonly metrics: AdapterMetrics;

  private started: boolean;
  private lastError: string | undefined;
  private resolvedAdminPhones: readonly string[];

  public constructor(hermes: HermesPort, init: WhatsAppInitConfig) {
    this.hermes = hermes;
    this.initConfig = init;
    this.resolvedAdminPhones = init.adminPhoneNumbers;
    this.commands = COMMANDS;
    this.logger = (init.logger ?? createLogger()).child('whatsapp');
    this.metrics = createAdapterMetrics(init.metricRegistry ?? createMetricRegistry(), 'whatsapp');
    this.metadata = {
      name: ADAPTER_NAME,
      version: ADAPTER_VERSION,
      interfaceType: 'whatsapp',
      supportedOperations: SUPPORTED_OPERATIONS,
      transport: 'webhook',
      webhookPath: WEBHOOK_PATH,
    };
    this.started = false;
  }

  public getMetadata(): WhatsAppMetadata {
    return this.metadata;
  }

  /**
   * Validate configuration and prepare the command table. Does not
   * register any HTTP endpoints — that is the consumer's responsibility.
   */
  public async initialize(): Promise<void> {
    if (this.initConfig.webhookSecret.length === 0) {
      throw new Error(`${ADAPTER_NAME}: webhookSecret is required.`);
    }
    this.resolvedAdminPhones = this.initConfig.adminPhoneNumbers;
    this.logger.info('initialized');
  }

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

  public health(): WhatsAppAdapterHealth {
    if (!this.started) {
      return { status: 'degraded', detail: 'not started', at: coreNow() };
    }
    if (this.lastError) {
      return { status: 'failed', detail: this.lastError, at: coreNow() };
    }
    return { status: 'healthy', at: coreNow() };
  }

  /**
   * Webhook-mode entry point. The consumer (typically apps/api) wires
   * this into a Fastify route. The consumer is responsible for:
   *
   *   1. Validating X-Hub-Signature-256 against the raw body.
   *   2. Parsing the WhatsApp message payload.
   *   3. Calling `handleMessage` with the sender phone and message text.
   *
   * The adapter returns a WhatsAppMessage that the consumer sends back
   * via the WhatsApp Business API.
   */
  public async handleMessage(senderPhone: string, messageText: string): Promise<WhatsAppMessage> {
    return withSpan('whatsapp.handleMessage', async (span) => {
      span.setAttribute('sender_phone', senderPhone);
      this.metrics.requestsTotal.inc();
      this.metrics.activeRequests.set(this.metrics.activeRequests.getValue() + 1);
      const startMs = performance.now();

      if (!this.started) {
        this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
        this.metrics.errorsTotal.inc();
        return replyWithError({ code: 'INTERNAL', message: 'Adapter not started.' });
      }

      const role = roleFor(senderPhone, this.resolvedAdminPhones);

      const commandName = this.parseCommand(messageText);
      if (!commandName) {
        span.setAttribute('success', 'false');
        this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
        this.metrics.errorsTotal.inc();
        this.logger.warn('unknown command', { senderPhone });
        return replyWithError({
          code: 'VALIDATION',
          message: 'Unknown command. Send "help" for a list of commands.',
        });
      }

      span.setAttribute('command', commandName);

      const cmd = this.commands.find((c) => c.name === commandName);
      if (!cmd) {
        span.setAttribute('success', 'false');
        this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
        this.metrics.errorsTotal.inc();
        this.logger.warn('unknown command', { command: commandName, senderPhone });
        return replyWithError({
          code: 'VALIDATION',
          message: 'Unknown command. Send "help" for a list of commands.',
        });
      }

      this.logger.info('command start', { command: commandName, senderPhone });

      const wctx: WhatsAppContext = {
        hermes: this.hermes,
        senderPhone,
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
          this.logger.warn('permission denied', { command: commandName, senderPhone });
          return replyWithPermission(cmd.name);
        }
        span.setAttribute('success', 'false');
        this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
        this.metrics.errorsTotal.inc();
        return replyWithError(toCommandError(err));
      }

      const args = { options: {} as Record<string, string> };
      let result;
      try {
        result = await cmd.handler(wctx, args);
      } catch (err) {
        this.lastError = err instanceof Error ? err.message : String(err);
        span.setAttribute('success', 'false');
        this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
        this.metrics.errorsTotal.inc();
        this.logger.error('command failed', { command: commandName, error: this.lastError });
        return replyWithError(toCommandError(err));
      }

      if (result.ok) {
        span.setAttribute('success', 'true');
        this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
        this.metrics.commandsTotal.inc();
        this.metrics.commandDurationMs.observe(performance.now() - startMs);
        this.logger.info('command end', { command: commandName, success: true });
        return replyWithMessage(result.value);
      }
      span.setAttribute('success', 'false');
      this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
      this.metrics.errorsTotal.inc();
      this.logger.info('command end', { command: commandName, success: false });
      return replyWithError(result.error);
    });
  }

  private parseCommand(text: string): string | null {
    const trimmed = text.trim().toLowerCase();
    if (trimmed.length === 0) return null;
    const parts = trimmed.split(/\s+/);
    return parts[0] ?? null;
  }
}
