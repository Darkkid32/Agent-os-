/**
 * Telegram adapter.
 *
 * Composition root for the seven commands in `commands/`. Per
 * docs/architecture/platform.md §8 the adapter is a presentation
 * adapter only. It owns no business logic. It reads Hermes through
 * HermesPort, never directly, and only knows:
 *
 *   - the seven slash commands,
 *   - the role taxonomy,
 *   - the local transport DTO (TelegramMessage).
 *
 * No caching. No mutable global state. No adapter-to-adapter links.
 *
 * Modes
 * -----
 *   - `polling` (default): start() drives `bot.start()`. The Promise
 *     returned by `bot.start()` resolves when long polling is active.
 *     stop() calls `bot.stop()`.
 *   - `webhook` (when `webhookUrl` is set): start() verifies identity
 *     via `bot.init()` and exposes a request handler. The consumer
 *     (typically apps/api) wires the handler into a Fastify route.
 *     Secret-token verification is the consumer's responsibility per
 *     platform.md §8.1.
 *
 * The same `Bot` instance is reused across modes. The choice is made
 * at initialize() time and is immutable.
 */
import { Bot, webhookCallback, type Context } from 'grammy';
import type { HermesPort } from '@agent-os/hermes';
import { now as coreNow } from '@agent-os/core';
import { type Logger, createLogger, withSpan } from '@agent-os/observability';

import {
  type CommandError,
  type TelegramAdapterHealth,
  type TelegramCommand,
  type TelegramContext,
  type TelegramInitConfig,
  type TelegramMessage,
  type TelegramMetadata,
  type TelegramTransport,
} from './types.js';
import { PermissionError as TelegramPermissionError, roleFor, requireRole } from './permissions.js';
import { formatErrorMessage, formatPermissionMessage } from './formats.js';

import { startCommand } from './commands/StartCommand.js';
import { stopCommand } from './commands/StopCommand.js';
import { statusCommand } from './commands/StatusCommand.js';
import { healthCommand } from './commands/HealthCommand.js';
import { modulesCommand } from './commands/ModulesCommand.js';
import { configCommand } from './commands/ConfigCommand.js';
import { versionCommand } from './commands/VersionCommand.js';

export const ADAPTER_NAME = '@agent-os/adapters-telegram';
export const ADAPTER_VERSION = '0.1.0';
export const SUPPORTED_OPERATIONS: readonly string[] = [
  'start',
  'stop',
  'status',
  'health',
  'modules',
  'config',
  'version',
];

const COMMANDS: readonly TelegramCommand[] = [
  startCommand,
  stopCommand,
  statusCommand,
  healthCommand,
  modulesCommand,
  configCommand,
  versionCommand,
];

const isPermissionError = (e: unknown): e is TelegramPermissionError =>
  e instanceof TelegramPermissionError;

const toCommandError = (e: unknown): CommandError => {
  if (e instanceof Error) {
    return { code: 'UNEXPECTED', message: e.message };
  }
  return { code: 'UNEXPECTED', message: 'Unexpected error.' };
};

const replyWithMessage = async (ctx: Context, message: TelegramMessage): Promise<void> => {
  if (message.parseMode) {
    await ctx.reply(message.text, { parse_mode: message.parseMode });
    return;
  }
  await ctx.reply(message.text);
};

const replyWithError = (ctx: Context, err: CommandError): Promise<void> =>
  replyWithMessage(ctx, formatErrorMessage(err.message));

const replyWithPermission = (ctx: Context, action: string): Promise<void> =>
  replyWithMessage(ctx, formatPermissionMessage(action));

const userIdOf = (ctx: Context): string => {
  const from = ctx.from;
  if (from && typeof from.id === 'number') return String(from.id);
  return 'unknown';
};

const chatIdOf = (ctx: Context): number => {
  const id = ctx.chat?.id;
  return typeof id === 'number' ? id : 0;
};

export class TelegramAdapter {
  private readonly metadata: TelegramMetadata;
  private readonly hermes: HermesPort;
  private readonly initConfig: TelegramInitConfig;
  private readonly transport: TelegramTransport;
  private readonly commands: readonly TelegramCommand[];
  private readonly logger: Logger;

  private bot: Bot | undefined;
  private started: boolean;
  private lastError: string | undefined;
  private webhookInitialized: boolean;
  private resolvedAdminUserIds: readonly string[];

  public constructor(hermes: HermesPort, init: TelegramInitConfig) {
    this.hermes = hermes;
    this.initConfig = init;
    this.transport = init.webhookUrl ? 'webhook' : 'polling';
    this.resolvedAdminUserIds = init.adminUserIds;
    this.commands = COMMANDS;
    this.logger = (init.logger ?? createLogger()).child('telegram');
    this.metadata = {
      name: ADAPTER_NAME,
      version: ADAPTER_VERSION,
      interfaceType: 'telegram',
      supportedOperations: SUPPORTED_OPERATIONS,
      transport: this.transport,
    };
    this.started = false;
    this.webhookInitialized = false;
  }

  public getMetadata(): TelegramMetadata {
    return this.metadata;
  }

  /**
   * Build the grammY Bot, register every command, and pre-validate
   * the token. Does not begin polling or contact the webhook endpoint
   * with side effects.
   */
  public async initialize(): Promise<void> {
    if (this.bot) return;
    const init = this.initConfig;
    const bot = new Bot(init.botToken);
    for (const cmd of this.commands) {
      bot.command(cmd.name, (ctx) => this.dispatchCommand(ctx, cmd));
    }
    this.bot = bot;
    this.resolvedAdminUserIds = init.adminUserIds;
    try {
      await bot.init();
      this.logger.info('initialized');
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      this.logger.error('initialize failed', { error: this.lastError });
      throw err;
    }
  }

  public async start(): Promise<void> {
    if (!this.bot) {
      throw new Error(`${ADAPTER_NAME}: initialize() must be called before start().`);
    }
    if (this.started) return;
    this.logger.info('starting');
    if (this.transport === 'polling') {
      await this.bot.start({
        onStart: (info) => {
          this.started = true;
          this.lastError = undefined;
          this.logBotIdentity(info.username);
        },
      });
      return;
    }
    this.webhookInitialized = true;
    this.started = true;
    this.logger.info('started');
  }

  public async stop(): Promise<void> {
    if (!this.bot) return;
    if (!this.started) return;
    this.logger.info('stopping');
    if (this.transport === 'polling') {
      await this.bot.stop();
    }
    this.webhookInitialized = false;
    this.started = false;
    this.logger.info('stopped');
  }

  public health(): TelegramAdapterHealth {
    if (!this.bot) {
      return { status: 'unknown', detail: 'not initialized', at: coreNow() };
    }
    if (this.lastError) {
      return { status: 'failed', detail: this.lastError, at: coreNow() };
    }
    if (!this.started) {
      return { status: 'degraded', detail: 'initialized but not started', at: coreNow() };
    }
    if (this.transport === 'webhook' && !this.webhookInitialized) {
      return { status: 'degraded', detail: 'webhook not initialized', at: coreNow() };
    }
    return { status: 'healthy', at: coreNow() };
  }

  /**
   * Webhook-mode entry point. The consumer (typically apps/api) wires
   * this into a Fastify route. The grammY `webhookCallback(bot, 'std/http')`
   * adapter returns a Fetch API (Request, Response) handler — the
   * consumer reads the body, builds a `Request`, and converts the
   * `Response` into a Fastify reply. The consumer is responsible for
   * secret-token verification per platform.md §8.1.
   */
  public handleUpdate(): (req: Request) => Promise<Response> {
    const bot = this.bot;
    if (!bot) {
      throw new Error(`${ADAPTER_NAME}: initialize() must be called before handleUpdate().`);
    }
    return webhookCallback(bot, 'std/http');
  }

  private async dispatchCommand(ctx: Context, cmd: TelegramCommand): Promise<void> {
    return withSpan(`telegram.${cmd.name}`, async (span) => {
      const userId = userIdOf(ctx);
      const role = roleFor(userId, this.resolvedAdminUserIds);
      span.setAttribute('command', cmd.name);
      span.setAttribute('user_id', userId);
      this.logger.info('command start', { command: cmd.name, userId });
      const tctx: TelegramContext = {
        hermes: this.hermes,
        userId,
        chatId: chatIdOf(ctx),
        role,
        now: coreNow,
      };

      try {
        requireRole(role, cmd.requires);
      } catch (err) {
        if (isPermissionError(err)) {
          this.logger.warn('permission denied', { command: cmd.name, userId });
          await replyWithPermission(ctx, cmd.name);
          return;
        }
        await replyWithError(ctx, toCommandError(err));
        return;
      }

      const args = { options: {} as Record<string, string> };
      let result;
      try {
        result = await cmd.handler(tctx, args);
      } catch (err) {
        this.lastError = err instanceof Error ? err.message : String(err);
        this.logger.error('command failed', { command: cmd.name, error: this.lastError });
        await replyWithError(ctx, toCommandError(err));
        return;
      }

      if (result.ok) {
        this.logger.info('command end', { command: cmd.name, success: true });
        await replyWithMessage(ctx, result.value);
        return;
      }
      this.logger.info('command end', { command: cmd.name, success: false });
      await replyWithError(ctx, result.error);
    });
  }

  private logBotIdentity(username: string | undefined): void {
    if (username) {
      this.logger.info('polling started', { username });
    }
  }
}
