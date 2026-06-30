/**
 * Command Plugin Template.
 *
 * A template for creating plugins that handle commands. Includes command
 * registration, parsing, and execution patterns.
 *
 * Layer: 3 (SDK)
 * Dependencies: @agent-os/core (Result, ok), @agent-os/plugins (types)
 */

import { ok, type Result } from '@agent-os/core';
import type { AgentPlugin, PluginContext } from '@agent-os/plugins';
import type { CommandHandler } from '../types.js';

export interface CommandPluginOptions {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly author: string;
  readonly description: string;
  readonly commands: readonly CommandHandler[];
}

/**
 * Create a command-handling plugin.
 *
 * @example
 * ```ts
 * const plugin = createCommandPlugin({
 *   id: 'greeting',
 *   name: 'Greeting Plugin',
 *   version: '1.0.0',
 *   author: 'Developer',
 *   description: 'Responds to greeting commands',
 *   commands: [
 *     {
 *       name: 'hello',
 *       description: 'Say hello',
 *       execute: async (args, ctx) => {
 *         return `Hello, ${args[0] ?? 'World'}!`;
 *       },
 *     },
 *   ],
 * });
 * ```
 */
export const createCommandPlugin = (options: CommandPluginOptions): AgentPlugin => {
  const { id, name, version, author, description, commands } = options;

  return {
    manifest: {
      id,
      name,
      version,
      author,
      description,
      capabilities: commands.map((cmd) => `command:${cmd.name}`),
      dependencies: [],
      minimumAgentOSVersion: '1.0.0',
    },

    initialize: async (context: PluginContext): Promise<Result<void>> => {
      context.logger.info('Command plugin initialized', {
        commands: commands.map((c) => c.name),
      });
      return ok(undefined);
    },

    start: async (): Promise<Result<void>> => {
      return ok(undefined);
    },

    stop: async (): Promise<Result<void>> => {
      return ok(undefined);
    },

    dispose: async (): Promise<Result<void>> => {
      return ok(undefined);
    },
  };
};

/**
 * Execute a command by name.
 */
export const executeCommand = async (
  commands: readonly CommandHandler[],
  commandName: string,
  args: string[],
  context: PluginContext,
): Promise<string> => {
  const command = commands.find((cmd) => cmd.name === commandName);
  if (command == null) {
    return `Unknown command: ${commandName}`;
  }
  return command.execute(args, context);
};
