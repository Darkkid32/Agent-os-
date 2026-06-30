/**
 * Event Listener Plugin Template.
 *
 * A template for creating plugins that listen to and handle events.
 * Includes event subscription, handling, and cleanup patterns.
 *
 * Layer: 3 (SDK)
 * Dependencies: @agent-os/core (Result, ok), @agent-os/plugins (types)
 */

import { ok, type Result } from '@agent-os/core';
import type { AgentPlugin, PluginContext } from '@agent-os/plugins';
import type { EventHandler } from '../types.js';

export interface EventPluginOptions {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly author: string;
  readonly description: string;
  readonly handlers: readonly EventHandler[];
}

/**
 * Create an event-handling plugin.
 *
 * @example
 * ```ts
 * const plugin = createEventPlugin({
 *   id: 'logger',
 *   name: 'Event Logger',
 *   version: '1.0.0',
 *   author: 'Developer',
 *   description: 'Logs all events',
 *   handlers: [
 *     {
 *       event: '*',
 *       handle: async (data, ctx) => {
 *         ctx.logger.info('Event received', { data });
 *       },
 *     },
 *   ],
 * });
 * ```
 */
export const createEventPlugin = (options: EventPluginOptions): AgentPlugin => {
  const { id, name, version, author, description, handlers } = options;
  const unsubscribers: Array<() => void> = [];

  return {
    manifest: {
      id,
      name,
      version,
      author,
      description,
      capabilities: handlers.map((h) => `event:${h.event}`),
      dependencies: [],
      minimumAgentOSVersion: '0.1.0',
    },

    initialize: async (context: PluginContext): Promise<Result<void>> => {
      context.logger.info('Event plugin initialized', {
        handlers: handlers.map((h) => h.event),
      });
      return ok(undefined);
    },

    start: async (): Promise<Result<void>> => {
      return ok(undefined);
    },

    stop: async (): Promise<Result<void>> => {
      for (const unsub of unsubscribers) {
        unsub();
      }
      unsubscribers.length = 0;
      return ok(undefined);
    },

    dispose: async (): Promise<Result<void>> => {
      for (const unsub of unsubscribers) {
        unsub();
      }
      unsubscribers.length = 0;
      return ok(undefined);
    },
  };
};

/**
 * Register an event handler with the event bus.
 */
export const registerEventHandler = (
  _eventBus: { readonly on: (event: string, handler: (data: unknown) => void) => () => void },
  handler: EventHandler,
  unsubscribers: Array<() => void>,
): void => {
  const unsub = _eventBus.on(handler.event, (data: unknown) => {
    void handler.handle(data, {} as PluginContext);
  });
  unsubscribers.push(unsub);
};
