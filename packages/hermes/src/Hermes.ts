import { err, now as timestampNow, type Result, type Timestamp } from '@agent-os/core';
import type { EventBus } from '@agent-os/event-bus';
import type { HermesConfig } from './HermesConfig.js';
import {
  createHermesLifecycle,
  type HermesLifecycle,
  type HermesLifecyclePhase,
} from './HermesLifecycle.js';
import {
  createHermesModuleRegistry,
  type HermesModuleHealth,
  type HermesModuleRecord,
  type HermesModuleRegistry,
  type HermesModuleSpec,
} from './HermesModuleRegistry.js';
import {
  createHermesHealthMonitor,
  type HermesHealthDetail,
  type HermesHealthMonitor,
  type HermesHealthMonitorReport,
} from './HermesHealthMonitor.js';
import {
  createHermesEventDispatcher,
  type HermesEventDispatcher,
} from './HermesEventDispatcher.js';
import {
  createHermesPluginLoader,
  type HermesPluginLoader,
  type PluginDynamicImport,
} from './HermesPluginLoader.js';

/**
 * Hermes public façade (Phase 2.8 — Kernel Integration).
 *
 * Per docs/architecture/hermes.md §5, this is the operator-facing surface.
 * It is an orchestrator only. Every responsibility below is delegated
 * to the owning component:
 *
 *   - Phase value .............. HermesLifecycle (§2.4)
 *   - Module inventory ......... HermesModuleRegistry (§2.5)
 *   - Lifecycle events ......... HermesEventDispatcher (§2.6)
 *   - Health aggregation ....... HermesHealthMonitor (§2.7)
 *   - Plugin discovery+register  HermesPluginLoader (§2.8)
 *   - DI wiring ................ HermesContainer (§2.3, future)
 *
 * Hermes.ts owns NO domain state. The only derivation it holds is the
 * `startedAt` timestamp captured on the `STARTING → RUNNING` transition
 * so that `status().uptime` can be reported; this is a read-only
 * projection of phase changes, not a duplicate of any sibling state.
 */

// Re-export the canonical types so consumers can keep importing from
// '@agent-os/hermes' regardless of which module owns them today.
export type { HermesLifecyclePhase } from './HermesLifecycle.js';
export type {
  HermesModuleSpec,
  HermesModuleRecord,
  HermesModuleHealth,
} from './HermesModuleRegistry.js';
export type { HermesHealthDetail, HermesHealthMonitorReport } from './HermesHealthMonitor.js';

/**
 * Status shape (§5.3). `modules` is the live registry count; `uptime`
 * is the milliseconds since the most recent STARTING → RUNNING transition.
 */
export interface HermesStatus {
  readonly phase: HermesLifecyclePhase;
  readonly uptime: Timestamp;
  readonly modules: number;
}

/**
 * Backward-compatibility aliases from the Phase 2.1 public surface.
 * `ModuleSpec` is structurally identical to `HermesModuleSpec`;
 * `ModuleHealthStatus` to `HermesModuleHealth`; `HermesHealthReport` to
 * `HermesHealthMonitorReport`. New code should import the canonical
 * names directly.
 */
export type ModuleSpec = HermesModuleSpec;
export type ModuleHealthStatus = HermesModuleHealth;
export type HermesHealthReport = HermesHealthMonitorReport;
export type { HermesHealthDetail as ModuleHealthDetail };

export interface Hermes {
  readonly start: () => Promise<Result<void>>;
  readonly stop: () => Promise<Result<void>>;
  readonly status: () => HermesStatus;
  readonly registerModule: (spec: HermesModuleSpec) => Result<void>;
  readonly unregisterModule: (name: string) => Result<void>;
  readonly health: () => Promise<HermesHealthMonitorReport>;
  readonly config: HermesConfig;
}

/**
 * Optional kernel wiring. Sibling components are created with defaults
 * if not provided; the Event Dispatcher is wired only when `eventBus`
 * is supplied; the Plugin Loader is wired only when both `modulesDir`
 * and `dynamicImport` are supplied.
 */
export interface HermesKernelOptions {
  readonly eventBus?: EventBus;
  readonly modulesDir?: string;
  readonly dynamicImport?: PluginDynamicImport;
  readonly lifecycle?: HermesLifecycle;
  readonly registry?: HermesModuleRegistry;
  readonly healthMonitor?: HermesHealthMonitor;
}

/**
 * Container port used by HermesPluginLoader (§7.3 `resolve`). In Phase
 * 2.8 the DI container is not yet wired end-to-end; a future Bootstrap
 * integration step will pass the actual HermesContainer here.
 */
interface ContainerPort {
  readonly resolve: <T = unknown>(name: string) => T;
  readonly has: (name: string) => boolean;
}

const noopContainer: ContainerPort = {
  resolve: <T = unknown>(_name: string): T => {
    throw new Error('HermesKernel: DI container not wired. Use HermesKernelOptions to inject one.');
  },
  has: (_name: string): boolean => false,
};

export const createHermes = (config: HermesConfig, options: HermesKernelOptions = {}): Hermes => {
  const lifecycle: HermesLifecycle = options.lifecycle ?? createHermesLifecycle();
  const registry: HermesModuleRegistry = options.registry ?? createHermesModuleRegistry();
  const healthMonitor: HermesHealthMonitor =
    options.healthMonitor ??
    createHermesHealthMonitor(registry, {
      isInitializing: () => lifecycle.currentPhase() === 'INITIALIZING',
    });

  // Wire the Event Dispatcher only when an EventBus is supplied.
  // Otherwise dispatcher stays undefined and emits nothing.
  const dispatcher: HermesEventDispatcher | undefined = options.eventBus
    ? createHermesEventDispatcher(lifecycle, options.eventBus, {
        reasonForStopping: () => 'operator stop',
        reasonForFailure: () => '',
        getModuleCount: () => registry.moduleCount(),
      })
    : undefined;

  // Wire the Plugin Loader only when both modulesDir and dynamicImport
  // are supplied. The dispatcher port is a no-op if no EventBus.
  const dispatcherPort = options.eventBus
    ? {
        emit: (topic: string, payload: unknown): void => {
          void options.eventBus?.publish(topic as never, payload as never);
        },
        on: (): (() => void) => () => undefined,
      }
    : { emit: (): void => undefined, on: (): (() => void) => () => undefined };

  const pluginLoader: HermesPluginLoader | undefined =
    options.modulesDir && options.dynamicImport
      ? createHermesPluginLoader({
          modulesDir: options.modulesDir,
          registry,
          config,
          container: noopContainer as ContainerPort,
          dispatcher: dispatcherPort,
          dynamicImport: options.dynamicImport,
        })
      : undefined;

  // ----- Uptime derivation (read-only projection of the phase) -----
  let startedAt: Timestamp | undefined;
  lifecycle.onTransition((_from, to) => {
    if (to === 'RUNNING') startedAt = timestampNow();
  });

  // ----- Phase-gated mutators -----
  const assertPhase = (...allowed: HermesLifecyclePhase[]): void => {
    const current = lifecycle.currentPhase();
    if (!allowed.includes(current)) {
      throw new Error(
        `Hermes: operation not allowed in phase ${current}. Expected one of: ${allowed.join(', ')}`,
      );
    }
  };

  const computeUptime = (): Timestamp => {
    if (startedAt === undefined) return 0 as Timestamp;
    return (timestampNow() - startedAt) as Timestamp;
  };

  // ----- Module drain (shutdown sequence, §3.2 STOPPING and §7.5) -----
  const drainModules = async (): Promise<void> => {
    const records = registry.list();
    const moduleCount = records.length;
    const deadlineMs =
      moduleCount > 0
        ? Math.floor(config.hermesShutdownTimeoutMs / moduleCount)
        : config.hermesShutdownTimeoutMs;
    let anyDrainThrew = false;

    for (let i = records.length - 1; i >= 0; i -= 1) {
      const record: HermesModuleRecord | undefined = records[i];
      if (!record) continue;
      try {
        await Promise.race([
          record.shutdown(deadlineMs),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(new Error(`Module ${record.name} drain timed out after ${deadlineMs}ms`)),
              deadlineMs,
            ),
          ),
        ]);
      } catch {
        anyDrainThrew = true;
      }
    }

    if (anyDrainThrew && moduleCount > 0) {
      try {
        lifecycle.transition('FAILED');
      } catch {
        lifecycle.transition('STOPPED');
      }
    } else {
      lifecycle.transition('STOPPED');
    }
  };

  const hermes: Hermes = {
    config,

    start: async (): Promise<Result<void>> => {
      if (lifecycle.currentPhase() === 'RUNNING') return { ok: true, value: undefined };

      if (lifecycle.isTerminal()) {
        return err(
          new Error(
            `Hermes: cannot start from terminal phase ${lifecycle.currentPhase()}. Create a new instance.`,
          ),
        );
      }

      try {
        lifecycle.transition('STARTING');
      } catch (e) {
        return err(e instanceof Error ? e : new Error(String(e)));
      }

      return { ok: true, value: undefined };
    },

    stop: async (): Promise<Result<void>> => {
      if (lifecycle.currentPhase() === 'STOPPED') return { ok: true, value: undefined };
      if (lifecycle.currentPhase() === 'FAILED') {
        return err(new Error(`Hermes: cannot stop from FAILED state.`));
      }

      try {
        lifecycle.transition('STOPPING');
        await drainModules();
      } catch (e) {
        try {
          lifecycle.transition('FAILED');
        } catch {
          // already terminal
        }
        return err(e instanceof Error ? e : new Error(String(e)));
      }

      return { ok: true, value: undefined };
    },

    status: (): HermesStatus => ({
      phase: lifecycle.currentPhase(),
      uptime: computeUptime(),
      modules: registry.moduleCount(),
    }),

    registerModule: (spec: HermesModuleSpec): Result<void> => {
      try {
        assertPhase('STARTING');
      } catch (e) {
        if (spec.required) {
          try {
            lifecycle.transition('FAILED');
          } catch {
            // already terminal
          }
        }
        return err(e instanceof Error ? e : new Error(String(e)));
      }
      // §5.4: failure of a required module transitions Hermes to FAILED.
      const result = registry.registerModule(spec);
      if (!result.ok && spec.required) {
        try {
          lifecycle.transition('FAILED');
        } catch {
          // already terminal
        }
      }
      return result;
    },

    unregisterModule: (name: string): Result<void> => {
      try {
        assertPhase('RUNNING', 'STOPPING');
      } catch (e) {
        return err(e instanceof Error ? e : new Error(String(e)));
      }
      return registry.unregisterModule(name);
    },

    health: async (): Promise<HermesHealthMonitorReport> => healthMonitor.health(),
  };

  // Plugin Loader and Event Dispatcher are wired for future Bootstrap
  // integration; their subscriptions/handlers are kept alive by closure
  // references held here. Phase 2.8 does not auto-load plugins.
  void pluginLoader;
  void dispatcher;

  return hermes;
};
