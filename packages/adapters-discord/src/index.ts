/**
 * Public API for `@agent-os/adapters-discord`.
 */
export { createDiscordAdapter } from './DiscordAdapter.js';
export {
  DISCORD_PACKAGE_NAME,
  DISCORD_PACKAGE_VERSION,
  type DiscordAdapter,
} from './DiscordAdapter.js';

export type {
  DiscordCommand,
  DiscordCommandArgs,
  DiscordContext,
  DiscordEmbed,
  DiscordEmbedField,
  DiscordInitConfig,
  DiscordMessage,
  DiscordMetadata,
  DiscordAdapterHealth,
  DiscordAdapterHealthStatus,
} from './types.js';

export {
  type DiscordRole,
  type DiscordAction,
  PermissionError,
  can,
  roleFor,
  requireRole,
} from './permissions.js';

export {
  formatStatusMessage,
  formatHealthMessage,
  formatVersionMessage,
  formatConfigMessage,
  formatModulesMessage,
  formatStartedMessage,
  formatStoppedMessage,
  formatErrorMessage,
  formatPermissionMessage,
  formatUnknownMessage,
  phaseColorOf,
  healthColorOf,
} from './formats.js';

export { startCommand } from './commands/StartCommand.js';
export { stopCommand } from './commands/StopCommand.js';
export { statusCommand } from './commands/StatusCommand.js';
export { healthCommand } from './commands/HealthCommand.js';
export { modulesCommand } from './commands/ModulesCommand.js';
export { configCommand } from './commands/ConfigCommand.js';
export { versionCommand } from './commands/VersionCommand.js';
