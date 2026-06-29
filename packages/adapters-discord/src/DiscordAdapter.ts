/**
 * DiscordAdapter — composition root for the Discord surface.
 *
 * Per docs/architecture/platform.md §7 the adapter is a presentation
 * adapter only. It owns no business logic; it owns only the Discord
 * connection, command parsing, permission checks, and response
 * formatting. Hermes remains the sole owner of lifecycle, module
 * inventory, health aggregation, and configuration.
 *
 * The adapter is stateless across interactions: every command handler
 * calls Hermes fresh. No caching.
 *
 * The router is a Map<string, DiscordCommand> populated by `start()`
 * (which also registers the slash commands with Discord). The router
 * is the single dispatch point.
 *
 * Flow per interaction:
 *   DiscordInteraction
 *     → permission check (roleFor + can)
 *     → command.handler(ctx)
 *     → DiscordMessage
 *     → discord.js InteractionReplyOptions
 *     → Discord reply
 */
import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type InteractionReplyOptions,
} from 'discord.js';
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
  type DiscordCommand,
  type DiscordContext,
  type DiscordInitConfig,
  type DiscordMessage,
  type DiscordMetadata,
  type DiscordAdapterHealth,
} from './types.js';
import { PermissionError, can, roleFor } from './permissions.js';
import { formatErrorMessage, formatPermissionMessage, formatUnknownMessage } from './formats.js';

import { startCommand } from './commands/StartCommand.js';
import { stopCommand } from './commands/StopCommand.js';
import { statusCommand } from './commands/StatusCommand.js';
import { healthCommand } from './commands/HealthCommand.js';
import { modulesCommand } from './commands/ModulesCommand.js';
import { configCommand } from './commands/ConfigCommand.js';
import { versionCommand } from './commands/VersionCommand.js';

export const DISCORD_PACKAGE_NAME = '@agent-os/adapters-discord' as const;
export const DISCORD_PACKAGE_VERSION = '0.1.0' as const;

interface RuntimeState {
  readonly hermes: HermesPort;
  readonly adminUserIds: readonly string[];
  readonly botToken: string;
  readonly guildId: string;
  readonly client: Client<true>;
  readonly commands: ReadonlyMap<string, DiscordCommand>;
  readonly logger: Logger;
  readonly metrics: AdapterMetrics;
}

export interface DiscordAdapter {
  readonly initialize: (config: DiscordInitConfig, hermes: HermesPort) => Promise<void>;
  readonly start: () => Promise<void>;
  readonly stop: () => Promise<void>;
  readonly health: () => Promise<DiscordAdapterHealth>;
  readonly metadata: () => DiscordMetadata;
  readonly commands: () => readonly DiscordCommand[];
}

const toInteractionReplyOptions = (msg: DiscordMessage): InteractionReplyOptions => {
  const embeds = (msg.embeds ?? []).map((e) => {
    const builder = new EmbedBuilder().setColor(e.color ?? null);
    if (e.title !== undefined) builder.setTitle(e.title);
    if (e.description !== undefined) builder.setDescription(e.description);
    if (e.footer !== undefined) builder.setFooter({ text: e.footer });
    if (e.timestamp !== undefined) builder.setTimestamp(new Date(e.timestamp));
    if (e.fields && e.fields.length > 0) {
      builder.addFields(
        e.fields.map((f) => ({
          name: f.name,
          value: f.value,
          inline: f.inline ?? false,
        })),
      );
    }
    return builder;
  });
  const result: { content?: string; embeds?: typeof embeds; ephemeral: boolean } = {
    ephemeral: msg.ephemeral ?? false,
  };
  if (msg.content !== undefined) result.content = msg.content;
  if (embeds.length > 0) result.embeds = embeds;
  return result as unknown as InteractionReplyOptions;
};

export const createDiscordAdapter = (): DiscordAdapter => {
  let state: RuntimeState | undefined;

  const buildCommandList = (): ReadonlyMap<string, DiscordCommand> => {
    const list: readonly DiscordCommand[] = [
      startCommand,
      stopCommand,
      statusCommand,
      healthCommand,
      modulesCommand,
      configCommand,
      versionCommand,
    ];
    return new Map(list.map((c) => [c.name, c]));
  };

  const buildContext = (
    hermes: HermesPort,
    userId: string,
    adminUserIds: readonly string[],
  ): DiscordContext => ({
    hermes,
    userId,
    role: roleFor(userId, adminUserIds),
    now: () => coreNow(),
  });

  const dispatchInteraction = async (
    interaction: ChatInputCommandInteraction,
    s: RuntimeState,
  ): Promise<void> => {
    return withSpan(`discord.${interaction.commandName}`, async (span) => {
      const startMs = performance.now();
      const commandName = interaction.commandName;
      const command = s.commands.get(commandName);
      span.setAttribute('command', commandName);
      span.setAttribute('user_id', interaction.user.id);
      s.metrics.requestsTotal.inc();
      s.metrics.activeRequests.set(s.metrics.activeRequests.getValue() + 1);

      if (!command) {
        span.setAttribute('success', 'false');
        s.metrics.activeRequests.set(Math.max(0, s.metrics.activeRequests.getValue() - 1));
        s.logger.warn('unknown command', { command: commandName });
        await interaction.reply(toInteractionReplyOptions(formatUnknownMessage(commandName)));
        return;
      }

      const ctx = buildContext(s.hermes, interaction.user.id, s.adminUserIds);

      if (!can(ctx.role, command.requires)) {
        span.setAttribute('success', 'false');
        s.metrics.activeRequests.set(Math.max(0, s.metrics.activeRequests.getValue() - 1));
        s.metrics.errorsTotal.inc();
        s.logger.warn('permission denied', { command: commandName, userId: interaction.user.id });
        await interaction.reply(
          toInteractionReplyOptions(formatPermissionMessage(command.requires)),
        );
        return;
      }

      const args = {
        options: interaction.options as unknown as Readonly<
          Record<string, string | number | boolean>
        >,
      };

      s.metrics.activeCommands.set(s.metrics.activeCommands.getValue() + 1);
      s.logger.info('command start', { command: commandName, userId: interaction.user.id });

      try {
        const reply = await command.handler(ctx, args);
        await interaction.reply(toInteractionReplyOptions(reply));
        span.setAttribute('success', 'true');
        s.logger.info('command end', { command: commandName, success: true });
      } catch (e) {
        const message =
          e instanceof PermissionError
            ? `Permission denied for action "${e.action}".`
            : e instanceof Error
              ? e.message
              : String(e);
        span.setAttribute('success', 'false');
        s.metrics.errorsTotal.inc();
        s.logger.error('command failed', { command: commandName, error: message });
        const errorReply = toInteractionReplyOptions(formatErrorMessage(message));
        if (interaction.deferred || interaction.replied) {
          const editOptions: { content?: string; embeds?: typeof errorReply.embeds } = {};
          if (errorReply.content !== undefined && errorReply.content !== null) {
            editOptions.content = errorReply.content;
          }
          if (errorReply.embeds !== undefined) {
            editOptions.embeds = errorReply.embeds;
          }
          await interaction.editReply(editOptions);
        } else {
          await interaction.reply(errorReply);
        }
      } finally {
        s.metrics.activeCommands.set(Math.max(0, s.metrics.activeCommands.getValue() - 1));
        s.metrics.activeRequests.set(Math.max(0, s.metrics.activeRequests.getValue() - 1));
        s.metrics.commandsTotal.inc();
        s.metrics.commandDurationMs.observe(performance.now() - startMs);
      }
    });
  };

  return {
    initialize: async (config: DiscordInitConfig, hermes: HermesPort): Promise<void> => {
      if (state) return;

      const adapterLogger = (config.logger ?? createLogger()).child('discord');

      const client = new Client({
        intents: [GatewayIntentBits.Guilds],
      });

      const commands = buildCommandList();

      // Build discord.js SlashCommandBuilder payloads from our router.
      const slashPayloads = Array.from(commands.values()).map((c) =>
        new SlashCommandBuilder().setName(c.name).setDescription(c.description).toJSON(),
      );

      client.once('ready', (readyClient) => {
        const rest = new REST({ version: '10' }).setToken(config.botToken);
        void rest.put(Routes.applicationGuildCommands(readyClient.user.id, config.guildId), {
          body: slashPayloads,
        });
        adapterLogger.info('slash commands registered');
      });

      client.on('interactionCreate', (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        if (!state) return;
        void dispatchInteraction(interaction, state);
      });

      state = {
        hermes,
        adminUserIds: config.adminUserIds,
        botToken: config.botToken,
        guildId: config.guildId,
        client: client as unknown as Client<true>,
        commands,
        logger: adapterLogger,
        metrics: createAdapterMetrics(config.metricRegistry ?? createMetricRegistry(), 'discord'),
      };

      adapterLogger.info('initialized');
    },

    start: async (): Promise<void> => {
      if (!state) throw new Error('DiscordAdapter: not initialized.');
      state.logger.info('starting');
      await state.client.login(state.botToken);
      state.logger.info('started');
    },

    stop: async (): Promise<void> => {
      if (!state) return;
      state.logger.info('stopping');
      await state.client.destroy();
      state.logger.info('stopped');
      state = undefined;
    },

    health: async (): Promise<DiscordAdapterHealth> => {
      const at = coreNow();
      if (!state) {
        return { status: 'unknown', detail: 'adapter not initialized', at };
      }
      if (state.client.isReady()) {
        return { status: 'healthy', at };
      }
      return { status: 'degraded', detail: 'gateway not ready', at };
    },

    metadata: (): DiscordMetadata => ({
      name: DISCORD_PACKAGE_NAME,
      version: DISCORD_PACKAGE_VERSION,
      interfaceType: 'discord',
      supportedOperations: state ? Array.from(state.commands.keys()) : [],
    }),

    commands: (): readonly DiscordCommand[] => (state ? Array.from(state.commands.values()) : []),
  };
};
