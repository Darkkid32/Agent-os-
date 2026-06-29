/**
 * Plugin Lifecycle Manager.
 *
 * Orchestrates plugin initialization, startup, shutdown, and disposal.
 * Validates phase transitions and propagates errors. Provides bulk
 * operations for managing all registered plugins.
 *
 * Layer: 2 (Platform)
 * Dependencies: @agent-os/core (Result), PluginRegistry, types
 */

import { ok, err } from '@agent-os/core';
import type { Logger } from '@agent-os/observability';
import {
  PLUGIN_VALID_TRANSITIONS,
  PLUGIN_TERMINAL_PHASES,
  type PluginLifecycleManager,
  type PluginLifecyclePhase,
  type PluginLifecycleTransitionHandler,
  type PluginHealthReport,
  type PluginRegistry,
  type PluginRecord,
} from './types.js';

export interface PluginLifecycleManagerOptions {
  readonly registry: PluginRegistry;
  readonly logger: Logger;
}

const canTransition = (from: PluginLifecyclePhase, to: PluginLifecyclePhase): boolean => {
  const allowed = PLUGIN_VALID_TRANSITIONS[from];
  return allowed.includes(to);
};

const phaseForAction = (
  action: 'initialize' | 'startup' | 'shutdown' | 'dispose',
  _record: PluginRecord,
): {
  targetPhase: PluginLifecyclePhase;
  intermediatePhase: PluginLifecyclePhase;
  expectedCurrent: PluginLifecyclePhase;
} => {
  switch (action) {
    case 'initialize':
      return {
        expectedCurrent: 'REGISTERED',
        intermediatePhase: 'INITIALIZING',
        targetPhase: 'INITIALIZED',
      };
    case 'startup':
      return {
        expectedCurrent: 'INITIALIZED',
        intermediatePhase: 'STARTING',
        targetPhase: 'RUNNING',
      };
    case 'shutdown':
      return { expectedCurrent: 'RUNNING', intermediatePhase: 'STOPPING', targetPhase: 'STOPPED' };
    case 'dispose':
      return { expectedCurrent: 'STOPPED', intermediatePhase: 'DISPOSED', targetPhase: 'DISPOSED' };
  }
};

export const createPluginLifecycleManager = (
  options: PluginLifecycleManagerOptions,
): PluginLifecycleManager => {
  const { registry, logger } = options;
  const transitionHandlers = new Set<PluginLifecycleTransitionHandler>();

  const notifyTransition = (
    pluginId: string,
    from: PluginLifecyclePhase,
    to: PluginLifecyclePhase,
  ): void => {
    for (const handler of transitionHandlers) {
      handler(pluginId, from, to);
    }
  };

  const executeTransition = async (
    pluginId: string,
    action: 'initialize' | 'startup' | 'shutdown' | 'dispose',
    fn: () => Promise<void>,
  ) => {
    const record = registry.get(pluginId);
    if (record == null) {
      return err(new Error(`Plugin "${pluginId}" is not registered`));
    }

    const { expectedCurrent, intermediatePhase, targetPhase } = phaseForAction(action, record);
    if (record.phase !== expectedCurrent) {
      return err(
        new Error(
          `Cannot ${action} plugin "${pluginId}": expected ${expectedCurrent}, got ${record.phase}`,
        ),
      );
    }

    if (!canTransition(record.phase, intermediatePhase)) {
      return err(
        new Error(
          `Cannot transition plugin "${pluginId}" from ${record.phase} to ${intermediatePhase}`,
        ),
      );
    }

    registry.updatePhase(pluginId, intermediatePhase);
    notifyTransition(pluginId, record.phase, intermediatePhase);
    logger.debug(`plugin lifecycle transition`, {
      pluginId,
      from: record.phase,
      to: intermediatePhase,
    });

    try {
      await fn();
      registry.updatePhase(pluginId, targetPhase);
      notifyTransition(pluginId, intermediatePhase, targetPhase);
      logger.debug(`plugin lifecycle transition`, {
        pluginId,
        from: intermediatePhase,
        to: targetPhase,
      });
      return ok(undefined);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      registry.updateError(pluginId, message);
      notifyTransition(pluginId, intermediatePhase, 'FAILED');
      logger.error(`plugin lifecycle action failed`, {
        pluginId,
        phase: intermediatePhase,
        error: message,
      });
      return err(new Error(message));
    }
  };

  const doForMatching = async (
    predicate: (record: PluginRecord) => boolean,
    action: 'initialize' | 'startup' | 'shutdown' | 'dispose',
    fn: (record: PluginRecord) => Promise<void>,
  ): Promise<readonly string[]> => {
    const results: string[] = [];
    for (const record of registry.list()) {
      if (predicate(record)) {
        const result = await executeTransition(record.plugin.manifest.id, action, async () => {
          await fn(record);
        });
        if (result.ok) {
          results.push(record.plugin.manifest.id);
        }
      }
    }
    return results;
  };

  const lifecycle: PluginLifecycleManager = {
    initialize: async (pluginId) => {
      return executeTransition(pluginId, 'initialize', async () => {
        const record = registry.get(pluginId);
        if (record != null) {
          // Plugin will be initialized when startAll is called with context
        }
      });
    },

    startup: async (pluginId) => {
      return executeTransition(pluginId, 'startup', async () => {
        const record = registry.get(pluginId);
        if (record != null) {
          await record.plugin.start();
        }
      });
    },

    shutdown: async (pluginId) => {
      return executeTransition(pluginId, 'shutdown', async () => {
        const record = registry.get(pluginId);
        if (record != null) {
          await record.plugin.stop();
        }
      });
    },

    dispose: async (pluginId) => {
      return executeTransition(pluginId, 'dispose', async () => {
        const record = registry.get(pluginId);
        if (record != null) {
          await record.plugin.dispose();
        }
      });
    },

    health: async (pluginId: string): Promise<PluginHealthReport> => {
      const record = registry.get(pluginId);
      if (record == null) {
        return {
          pluginId,
          phase: 'FAILED',
          healthy: false,
          error: `Plugin "${pluginId}" is not registered`,
          uptimeMs: undefined,
        };
      }
      const isTerminal = PLUGIN_TERMINAL_PHASES.includes(record.phase);
      const uptimeMs =
        record.startedAt != null ? (record.stoppedAt ?? Date.now()) - record.startedAt : undefined;
      return {
        pluginId,
        phase: record.phase,
        healthy: !isTerminal && record.error == null,
        error: record.error,
        uptimeMs,
      };
    },

    initializeAll: async (): Promise<readonly string[]> =>
      doForMatching(
        (r) => r.phase === 'REGISTERED',
        'initialize',
        async () => {},
      ),

    startupAll: async (): Promise<readonly string[]> =>
      doForMatching(
        (r) => r.phase === 'INITIALIZED',
        'startup',
        async (r) => {
          await r.plugin.start();
        },
      ),

    shutdownAll: async (): Promise<readonly string[]> =>
      doForMatching(
        (r) => r.phase === 'RUNNING',
        'shutdown',
        async (r) => {
          await r.plugin.stop();
        },
      ),

    disposeAll: async (): Promise<readonly string[]> =>
      doForMatching(
        (r) => r.phase === 'STOPPED',
        'dispose',
        async (r) => {
          await r.plugin.dispose();
        },
      ),

    onTransition: (handler: PluginLifecycleTransitionHandler): (() => void) => {
      transitionHandlers.add(handler);
      return () => {
        transitionHandlers.delete(handler);
      };
    },
  };

  return lifecycle;
};
