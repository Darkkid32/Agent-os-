/**
 * Plugin Registry.
 *
 * In-memory store for registered plugins. Plugins are registered explicitly
 * — no dynamic loading or filesystem scanning. The registry tracks plugin
 * records including lifecycle phase, timestamps, and error state.
 *
 * Duplicate plugin IDs are rejected. The registry fires registered/unregistered
 * handlers to allow lifecycle managers to react to changes.
 *
 * Layer: 2 (Platform)
 * Dependencies: @agent-os/core (Result)
 */

import { ok, err, type Result } from '@agent-os/core';
import type {
  AgentPlugin,
  PluginRecord,
  PluginRegistry,
  PluginRegisteredHandler,
  PluginUnregisteredHandler,
  PluginLifecyclePhase,
} from './types.js';

const createRecord = (plugin: AgentPlugin): PluginRecord => ({
  plugin,
  phase: 'REGISTERED',
  registeredAt: Date.now(),
  startedAt: undefined,
  stoppedAt: undefined,
  error: undefined,
});

export const createPluginRegistry = (): PluginRegistry => {
  const plugins = new Map<string, PluginRecord>();
  const registeredHandlers = new Set<PluginRegisteredHandler>();
  const unregisteredHandlers = new Set<PluginUnregisteredHandler>();

  return {
    register: (plugin: AgentPlugin): Result<void> => {
      const { id } = plugin.manifest;
      if (plugins.has(id)) {
        return err(new Error(`Plugin "${id}" is already registered`));
      }
      const record = createRecord(plugin);
      plugins.set(id, record);
      for (const handler of registeredHandlers) {
        handler(plugin);
      }
      return ok(undefined);
    },

    unregister: (pluginId: string): Result<void> => {
      if (!plugins.has(pluginId)) {
        return err(new Error(`Plugin "${pluginId}" is not registered`));
      }
      plugins.delete(pluginId);
      for (const handler of unregisteredHandlers) {
        handler(pluginId);
      }
      return ok(undefined);
    },

    list: (): readonly PluginRecord[] => Array.from(plugins.values()),

    get: (pluginId: string): PluginRecord | undefined => plugins.get(pluginId),

    has: (pluginId: string): boolean => plugins.has(pluginId),

    count: (): number => plugins.size,

    updatePhase: (pluginId: string, phase: PluginLifecyclePhase): Result<void> => {
      const record = plugins.get(pluginId);
      if (record == null) {
        return err(new Error(`Plugin "${pluginId}" is not registered`));
      }
      const now = Date.now();
      const updated: PluginRecord = {
        ...record,
        phase,
        ...(phase === 'RUNNING' ? { startedAt: now } : {}),
        ...(phase === 'STOPPED' || phase === 'DISPOSED' ? { stoppedAt: now } : {}),
      };
      plugins.set(pluginId, updated);
      return ok(undefined);
    },

    updateError: (pluginId: string, error: string): Result<void> => {
      const record = plugins.get(pluginId);
      if (record == null) {
        return err(new Error(`Plugin "${pluginId}" is not registered`));
      }
      plugins.set(pluginId, {
        ...record,
        phase: 'FAILED',
        error,
      });
      return ok(undefined);
    },

    onRegistered: (handler: PluginRegisteredHandler): (() => void) => {
      registeredHandlers.add(handler);
      return () => {
        registeredHandlers.delete(handler);
      };
    },

    onUnregistered: (handler: PluginUnregisteredHandler): (() => void) => {
      unregisteredHandlers.add(handler);
      return () => {
        unregisteredHandlers.delete(handler);
      };
    },
  };
};
