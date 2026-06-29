/**
 * Discord adapter types.
 *
 * Per docs/architecture/platform.md §7 the Discord adapter is a
 * presentation adapter only. It owns no business logic. Every command
 * receives a DiscordContext, calls Hermes through HermesPort, and returns
 * a DiscordMessage that the gateway layer formats into a discord.js
 * interaction reply.
 */
import type {
  AdapterHealth,
  AdapterHealthStatus,
  AdapterMetadata,
} from '@agent-os/core/adapter-metadata';
import type { HermesPort } from '@agent-os/hermes';
import type { Logger, MetricRegistry } from '@agent-os/observability';
import type { DiscordAction, DiscordRole } from './permissions.js';

export interface DiscordMessage {
  readonly content?: string;
  readonly embeds?: readonly DiscordEmbed[];
  readonly ephemeral?: boolean;
}

export interface DiscordEmbedField {
  readonly name: string;
  readonly value: string;
  readonly inline?: boolean;
}

export interface DiscordEmbed {
  readonly title?: string;
  readonly description?: string;
  readonly color?: number;
  readonly fields?: readonly DiscordEmbedField[];
  readonly footer?: string;
  readonly timestamp?: string;
}

/**
 * Per-command arguments. Discord slash commands in scope (Phase 3.4) take
 * no arguments; the field is reserved for future commands.
 */
export interface DiscordCommandArgs {
  readonly options: Readonly<Record<string, string | number | boolean>>;
}

/**
 * What every command receives. Each interaction is stateless: the
 * adapter does not cache Hermes responses between calls.
 */
export interface DiscordContext {
  readonly hermes: HermesPort;
  readonly userId: string;
  readonly role: DiscordRole;
  readonly now: () => number;
}

export interface DiscordCommand {
  readonly name: string;
  readonly description: string;
  readonly requires: DiscordAction;
  readonly handler: (ctx: DiscordContext, args: DiscordCommandArgs) => Promise<DiscordMessage>;
}

export interface DiscordInitConfig {
  readonly botToken: string;
  readonly guildId: string;
  readonly adminUserIds: readonly string[];
  readonly logger?: Logger;
  readonly metricRegistry?: MetricRegistry;
}

export type DiscordMetadata = AdapterMetadata;

export type DiscordAdapterHealthStatus = AdapterHealthStatus;
export type DiscordAdapterHealth = AdapterHealth;
