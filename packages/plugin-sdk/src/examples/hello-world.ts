/**
 * Hello World Example Plugin.
 *
 * A minimal example plugin that demonstrates basic plugin structure,
 * lifecycle hooks, and configuration usage.
 *
 * Layer: 3 (SDK)
 * Dependencies: @agent-os/plugins (types)
 */

import { ok, type Result } from '@agent-os/core';
import type { AgentPlugin, PluginContext } from '@agent-os/plugins';

export interface HelloWorldPluginOptions {
  readonly greeting?: string;
}

/**
 * Create a Hello World plugin.
 *
 * @example
 * ```ts
 * import { createHelloWorldPlugin } from '@agent-os/plugin-sdk/examples';
 *
 * const plugin = createHelloWorldPlugin({ greeting: 'Hola' });
 * // Register with plugin registry...
 * ```
 */
export const createHelloWorldPlugin = (options: HelloWorldPluginOptions = {}): AgentPlugin => {
  const { greeting = 'Hello' } = options;
  let context: PluginContext | undefined;

  return {
    manifest: {
      id: 'hello-world',
      name: 'Hello World Plugin',
      version: '1.0.0',
      author: 'Agent OS',
      description: 'A simple hello world plugin demonstrating basic plugin structure',
      capabilities: ['greeting'],
      dependencies: [],
      minimumAgentOSVersion: '0.1.0',
      configSchema: {
        greeting: {
          type: 'string',
          default: 'Hello',
          description: 'The greeting to use',
        },
      },
    },

    initialize: async (ctx: PluginContext): Promise<Result<void>> => {
      context = ctx;
      const configuredGreeting = ctx.config.get<string>('greeting') ?? greeting;
      ctx.logger.info('Hello World plugin initialized', {
        greeting: configuredGreeting,
      });
      return ok(undefined);
    },

    start: async (): Promise<Result<void>> => {
      if (context != null) {
        const configuredGreeting = context.config.get<string>('greeting') ?? greeting;
        context.logger.info(`${configuredGreeting}, World!`);
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void>> => {
      if (context != null) {
        context.logger.info('Hello World plugin stopped');
      }
      return ok(undefined);
    },

    dispose: async (): Promise<Result<void>> => {
      context = undefined;
      return ok(undefined);
    },
  };
};
