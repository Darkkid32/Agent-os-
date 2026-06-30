import { ok, type Result } from '@agent-os/core';
import type { AgentPlugin, PluginContext } from '@agent-os/plugins';
import type { PluginDefinition } from './types.js';

export const definePlugin = <TConfig extends Record<string, unknown> = Record<string, unknown>>(
  definition: PluginDefinition<TConfig>,
): AgentPlugin => {
  const { manifest, initialize, start, stop, dispose } = definition;

  return {
    manifest,

    initialize: async (context: PluginContext): Promise<Result<void>> => {
      try {
        await initialize(context);
        return ok(undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, error: new Error(message) };
      }
    },

    start: async (): Promise<Result<void>> => {
      if (start == null) return ok(undefined);
      try {
        await start();
        return ok(undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, error: new Error(message) };
      }
    },

    stop: async (): Promise<Result<void>> => {
      if (stop == null) return ok(undefined);
      try {
        await stop();
        return ok(undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, error: new Error(message) };
      }
    },

    dispose: async (): Promise<Result<void>> => {
      if (dispose == null) return ok(undefined);
      try {
        await dispose();
        return ok(undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, error: new Error(message) };
      }
    },
  };
};
