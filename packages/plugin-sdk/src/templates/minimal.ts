import type { AgentPlugin, PluginContext } from '@agent-os/plugins';
import { ok, type Result } from '@agent-os/core';

export interface MinimalPluginOptions {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly author: string;
  readonly description: string;
  readonly onInitialize?: (context: PluginContext) => Promise<void>;
  readonly onStart?: () => Promise<void>;
  readonly onStop?: () => Promise<void>;
  readonly onDispose?: () => Promise<void>;
}

export const createMinimalPlugin = (options: MinimalPluginOptions): AgentPlugin => {
  const { id, name, version, author, description, onInitialize, onStart, onStop, onDispose } =
    options;

  return {
    manifest: {
      id,
      name,
      version,
      author,
      description,
      capabilities: [],
      dependencies: [],
      minimumAgentOSVersion: '0.1.0',
    },

    initialize: async (context: PluginContext): Promise<Result<void>> => {
      try {
        if (onInitialize != null) {
          await onInitialize(context);
        }
        return ok(undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, error: new Error(message) };
      }
    },

    start: async (): Promise<Result<void>> => {
      try {
        if (onStart != null) {
          await onStart();
        }
        return ok(undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, error: new Error(message) };
      }
    },

    stop: async (): Promise<Result<void>> => {
      try {
        if (onStop != null) {
          await onStop();
        }
        return ok(undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, error: new Error(message) };
      }
    },

    dispose: async (): Promise<Result<void>> => {
      try {
        if (onDispose != null) {
          await onDispose();
        }
        return ok(undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, error: new Error(message) };
      }
    },
  };
};
