/**
 * Public API for `@agent-os/adapters-cli`.
 */
export { createCliAdapter } from './services/CliAdapter.js';
export type {
  CliAdapter,
  CliAdapterHealth,
  CliAdapterHealthStatus,
  CliDispatchResult,
  CliInitConfig,
  CliMetadata,
} from './services/CliAdapter.js';
export { CLI_PACKAGE_NAME, CLI_PACKAGE_VERSION } from './services/CliAdapter.js';

export type { HermesPort } from '@agent-os/hermes';
export type { Command, CommandArgs, CommandAction } from './interfaces/Command.js';
export type { CommandRegistry } from './services/CommandRegistry.js';
export { createCommandRegistry } from './services/CommandRegistry.js';

export type { CliContext, OutputMode } from './types/CliContext.js';
export type { CliRole, PermissionService } from './services/Permissions.js';
export { createPermissionService } from './services/Permissions.js';

export type { CommandError } from './errors/CommandError.js';
export type { CliErrorCode } from './errors/CliErrorCode.js';
export { PermissionError } from './errors/PermissionError.js';

export { parseArgs } from './services/ArgvParser.js';
export type { ParsedArgs } from './services/ArgvParser.js';
export { renderResult } from './services/Renderer.js';
export type { RenderedResult } from './services/Renderer.js';

export { startCommand } from './commands/StartCommand.js';
export { stopCommand } from './commands/StopCommand.js';
export { statusCommand } from './commands/StatusCommand.js';
export { healthCommand } from './commands/HealthCommand.js';
export { pluginsCommand } from './commands/PluginsCommand.js';
export { configCommand } from './commands/ConfigCommand.js';
export { versionCommand } from './commands/VersionCommand.js';
export type { VersionInfo } from './commands/VersionCommand.js';
export type { RedactedConfig } from './commands/ConfigCommand.js';
export type {
  PluginsResult,
  PluginsListResult,
  PluginsUnloadResult,
  PluginsLoadNotSupportedResult,
} from './commands/PluginsCommand.js';
