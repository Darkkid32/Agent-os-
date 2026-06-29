/**
 * Tool definitions.
 *
 * One tool per Hermes operation. Each tool takes a `McpToolContext`,
 * calls Hermes through HermesPort, and returns an `McpToolResult`.
 * Expected Hermes failures are translated into `isError: true` results
 * rather than thrown — the MCP SDK itself wraps thrown errors, but
 * explicit translation keeps the contract explicit.
 */
import { PACKAGE_NAME, PACKAGE_VERSION } from '@agent-os/hermes';

import type { McpToolDefinition, McpToolResult } from './types.js';
import {
  formatConfig,
  formatHealth,
  formatHermesError,
  formatModules,
  formatStarted,
  formatStatus,
  formatStopped,
  formatVersion,
} from './formats.js';

export const startTool: McpToolDefinition = {
  name: 'start',
  description: 'Start the Hermes kernel.',
  requires: 'start',
  handler: async (ctx) => {
    const r = await ctx.hermes.start();
    if (!r.ok) return formatHermesError(r.error.message);
    return formatStarted(ctx.hermes.status().phase);
  },
};

export const stopTool: McpToolDefinition = {
  name: 'stop',
  description: 'Stop the Hermes kernel.',
  requires: 'stop',
  handler: async (ctx) => {
    const r = await ctx.hermes.stop();
    if (!r.ok) return formatHermesError(r.error.message);
    return formatStopped(ctx.hermes.status().phase);
  },
};

export const statusTool: McpToolDefinition = {
  name: 'status',
  description: 'Read Hermes kernel status (phase, uptime, module count).',
  requires: 'status',
  handler: async (ctx) => formatStatus(ctx.hermes.status()),
};

export const healthTool: McpToolDefinition = {
  name: 'health',
  description: 'Read Hermes aggregate and per-module health.',
  requires: 'health',
  handler: async (ctx) => formatHealth(await ctx.hermes.health()),
};

export const modulesTool: McpToolDefinition = {
  name: 'modules',
  description: 'Read the count of registered Hermes modules.',
  requires: 'modules',
  handler: async (ctx) => formatModules(ctx.hermes.status().modules),
};

export const configTool: McpToolDefinition = {
  name: 'config',
  description: 'Read active Hermes configuration (secrets redacted).',
  requires: 'config',
  handler: async (ctx) => formatConfig(ctx.hermes.config),
};

export const versionTool: McpToolDefinition = {
  name: 'version',
  description: 'Read Hermes kernel version.',
  requires: 'version',
  handler: async () => formatVersion(PACKAGE_NAME, PACKAGE_VERSION),
};

export const ALL_TOOLS: readonly McpToolDefinition[] = [
  startTool,
  stopTool,
  statusTool,
  healthTool,
  modulesTool,
  configTool,
  versionTool,
];

export type { McpToolResult };
