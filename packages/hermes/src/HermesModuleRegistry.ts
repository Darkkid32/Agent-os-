import type { Result } from '@agent-os/core';

/**
 * Hermes Module Registry (Phase 2.5).
 *
 * Per docs/architecture/hermes.md §2.5, this module is the inventory of
 * what is registered. It does NOT execute modules. It does NOT manage
 * lifecycle. It does NOT own the lifecycle phase.
 *
 * Conformance notes:
 *   - §2.5: maintains an ordered list of modules, validates name
 *     uniqueness, validates declared dependencies are already registered.
 *   - §2.5: orders by insertion; shutdown drain runs in reverse. The
 *     registry itself does NOT call shutdown — that's a Bootstrap concern.
 *   - §5.4 + §5.5: returns `Result<void>` for mutators. Phase guards
 *     (only callable during STARTING, etc.) are the orchestrator's
 *     concern (§5.4 line 399); this registry is phase-agnostic.
 *   - §6.2: module events (`hermes.module.registered`, etc.) are NOT
 *     emitted by this module. An extension-point callback is provided
 *     (onModuleRegistered / onModuleUnregistered) for a future Bootstrap
 *     integration to bridge into the existing HermesEventDispatcher.
 *   - §7.4: cyclic module dependencies are rejected by construction
 *     because each registration requires its declared dependencies to
 *     already exist in the registry. A defensive self-dependency check
 *     is also performed.
 */

export interface HermesModuleSpec {
  readonly name: string;
  readonly version: string;
  readonly dependencies: readonly string[];
  readonly required: boolean;
  readonly healthCheck: () => HermesModuleHealth | Promise<HermesModuleHealth>;
  readonly shutdown: (deadlineMs: number) => Promise<void>;
}

export type HermesModuleHealth = 'healthy' | 'degraded' | 'failed' | 'unknown';

export interface HermesModuleRecord {
  readonly name: string;
  readonly version: string;
  readonly dependencies: readonly string[];
  readonly required: boolean;
  readonly healthCheck: HermesModuleSpec['healthCheck'];
  readonly shutdown: HermesModuleSpec['shutdown'];
  readonly registeredAt: number;
  readonly healthStatus: HermesModuleHealth;
}

export interface HermesModuleRegistry {
  readonly registerModule: (spec: HermesModuleSpec) => Result<void>;
  readonly unregisterModule: (name: string) => Result<void>;
  readonly hasModule: (name: string) => boolean;
  readonly getModule: (name: string) => HermesModuleRecord | undefined;
  readonly getModules: () => readonly HermesModuleRecord[];
  readonly list: () => readonly HermesModuleRecord[];
  readonly get: (name: string) => HermesModuleRecord | undefined;
  readonly moduleCount: () => number;
  readonly clear: () => void;
  /** Extension point — future Bootstrap may bridge into HermesEventDispatcher. */
  readonly onModuleRegistered: (handler: ModuleRegisteredHandler) => () => void;
  /** Extension point — future Bootstrap may bridge into HermesEventDispatcher. */
  readonly onModuleUnregistered: (handler: ModuleUnregisteredHandler) => () => void;
}

export type ModuleRegisteredHandler = (record: HermesModuleRecord) => void;
export type ModuleUnregisteredHandler = (name: string) => void;

const assertName = (name: string): void => {
  if (name.length === 0) {
    throw new Error('HermesModuleRegistry: module name must be a non-empty string.');
  }
};

const assertSpec = (spec: HermesModuleSpec): void => {
  assertName(spec.name);
  if (typeof spec.healthCheck !== 'function') {
    throw new Error(`HermesModuleRegistry: spec "${spec.name}" is missing healthCheck.`);
  }
  if (typeof spec.shutdown !== 'function') {
    throw new Error(`HermesModuleRegistry: spec "${spec.name}" is missing shutdown.`);
  }
};

const cloneRecord = (record: InternalRecord): HermesModuleRecord => ({
  name: record.spec.name,
  version: record.spec.version,
  dependencies: [...record.spec.dependencies],
  required: record.spec.required,
  healthCheck: record.spec.healthCheck,
  shutdown: record.spec.shutdown,
  registeredAt: record.registeredAt,
  healthStatus: record.healthStatus,
});

interface InternalRecord {
  readonly spec: HermesModuleSpec;
  readonly registeredAt: number;
  healthStatus: HermesModuleHealth;
}

export const createHermesModuleRegistry = (): HermesModuleRegistry => {
  const records: InternalRecord[] = [];
  const indexByName = new Map<string, number>();
  const registeredHandlers: ModuleRegisteredHandler[] = [];
  const unregisteredHandlers: ModuleUnregisteredHandler[] = [];

  const fireRegistered = (record: HermesModuleRecord): void => {
    for (const handler of registeredHandlers) {
      try {
        handler(record);
      } catch {
        // Best-effort: handlers are observability hooks; their failure
        // must not corrupt the registry state.
      }
    }
  };

  const fireUnregistered = (name: string): void => {
    for (const handler of unregisteredHandlers) {
      try {
        handler(name);
      } catch {
        // Best-effort.
      }
    }
  };

  return {
    registerModule: (spec: HermesModuleSpec): Result<void> => {
      try {
        assertSpec(spec);

        if (indexByName.has(spec.name)) {
          return {
            ok: false,
            error: new Error(`HermesModuleRegistry: module "${spec.name}" is already registered.`),
          };
        }

        if (spec.dependencies.includes(spec.name)) {
          return {
            ok: false,
            error: new Error(
              `HermesModuleRegistry: module "${spec.name}" cannot depend on itself.`,
            ),
          };
        }

        const missing = spec.dependencies.filter((dep) => !indexByName.has(dep));
        if (missing.length > 0) {
          return {
            ok: false,
            error: new Error(
              `HermesModuleRegistry: module "${spec.name}" has unresolved dependencies: ${missing.join(', ')}`,
            ),
          };
        }

        const record: InternalRecord = {
          spec,
          registeredAt: Date.now(),
          healthStatus: 'unknown',
        };
        indexByName.set(spec.name, records.length);
        records.push(record);

        const snapshot = cloneRecord(record);
        // Fire on next tick so the snapshot is fully visible to handlers
        // even if they call back into the registry synchronously.
        queueMicrotask(() => fireRegistered(snapshot));
        return { ok: true, value: undefined };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e : new Error(String(e)) };
      }
    },

    unregisterModule: (name: string): Result<void> => {
      try {
        assertName(name);
        const idx = indexByName.get(name);
        if (idx === undefined) {
          return {
            ok: false,
            error: new Error(`HermesModuleRegistry: module "${name}" is not registered.`),
          };
        }

        records.splice(idx, 1);
        indexByName.delete(name);
        for (let i = idx; i < records.length; i += 1) {
          const item = records[i];
          if (item) indexByName.set(item.spec.name, i);
        }

        // §5.5 step 2: mark any module that depended on the removed
        // module as degraded.
        for (const record of records) {
          if (record.spec.dependencies.includes(name)) {
            record.healthStatus = 'degraded';
          }
        }

        queueMicrotask(() => fireUnregistered(name));
        return { ok: true, value: undefined };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e : new Error(String(e)) };
      }
    },

    hasModule: (name: string): boolean => {
      assertName(name);
      return indexByName.has(name);
    },

    getModule: (name: string): HermesModuleRecord | undefined => {
      assertName(name);
      const idx = indexByName.get(name);
      if (idx === undefined) return undefined;
      const record = records[idx];
      return record ? cloneRecord(record) : undefined;
    },

    getModules: (): readonly HermesModuleRecord[] => records.map(cloneRecord),

    list: (): readonly HermesModuleRecord[] => records.map(cloneRecord),

    get: (name: string): HermesModuleRecord | undefined => {
      assertName(name);
      const idx = indexByName.get(name);
      if (idx === undefined) return undefined;
      const record = records[idx];
      return record ? cloneRecord(record) : undefined;
    },

    moduleCount: (): number => records.length,

    clear: (): void => {
      records.length = 0;
      indexByName.clear();
    },

    onModuleRegistered: (handler: ModuleRegisteredHandler): (() => void) => {
      registeredHandlers.push(handler);
      return () => {
        const idx = registeredHandlers.indexOf(handler);
        if (idx !== -1) registeredHandlers.splice(idx, 1);
      };
    },

    onModuleUnregistered: (handler: ModuleUnregisteredHandler): (() => void) => {
      unregisteredHandlers.push(handler);
      return () => {
        const idx = unregisteredHandlers.indexOf(handler);
        if (idx !== -1) unregisteredHandlers.splice(idx, 1);
      };
    },
  };
};
