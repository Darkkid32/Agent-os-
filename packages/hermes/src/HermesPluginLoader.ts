import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import type { Result } from '@agent-os/core';
import type { Logger } from '@agent-os/observability';
import type { HermesConfig } from './HermesConfig.js';
import type { HermesModuleRegistry, HermesModuleSpec } from './HermesModuleRegistry.js';

/**
 * Hermes Plugin Loader (Phase 2.7).
 *
 * Per docs/architecture/hermes.md §2.8 and §7, this module discovers,
 * validates, and registers plugins. It does NOT execute plugin business
 * logic, does NOT own lifecycle state, does NOT own registry state, and
 * does NOT manage health or events.
 *
 * Conformance notes:
 *   - §1.4: the only Hermes module permitted to use Node.js-specific
 *     `fs` APIs is this one (filesystem scan). All other modules are
 *     platform-agnostic.
 *   - §2.8: scan `HERMES_MODULES_DIR`, validate uniqueness via the
 *     registry, load in filesystem sort order, defer-and-retry once for
 *     unresolved declared dependencies.
 *   - §7.2: the loader invokes each entry's `register(hermes)` export
 *     with the §7.3 scoped facade. Plugins use the facade to register
 *     their own specs.
 *   - §7.3: the facade exposes ONLY registerModule, resolve, config,
 *     emit, on. Plugins cannot reach start/stop/health/unregisterModule
 *     through it.
 *   - §7.4: cyclic module deps are rejected by construction because
 *     the registry requires declared deps to already exist at registration.
 */

export type PluginEntryExtension = '.ts' | '.js' | '.mjs' | '.cjs';

export interface PluginEntrySource {
  readonly path: string;
  readonly content: string;
}

export interface HermesFileSystem {
  readonly list: (dir: string) => readonly string[];
  readonly isFile: (path: string) => boolean;
  readonly read: (path: string) => string;
}

export interface PluginDynamicImport {
  readonly import: (path: string, content: string) => Promise<unknown>;
}

export interface PluginLogger {
  readonly warn: (message: string) => void;
}

/**
 * Adapter that wraps an observability Logger to satisfy the PluginLogger
 * interface. The PluginLoader only calls `.warn()`.
 */
const toPluginLogger = (logger: Logger): PluginLogger => ({
  warn: (message: string): void => logger.warn(message),
});

export interface PluginFacadeOptions {
  readonly container: PluginContainerPort;
  readonly dispatcher: PluginDispatcherPort;
  readonly registry: HermesModuleRegistry;
  readonly config: HermesConfig;
}

export interface PluginContainerPort {
  readonly resolve: <T = unknown>(name: string) => T;
  readonly has: (name: string) => boolean;
}

export interface PluginDispatcherPort {
  readonly emit: (topic: string, payload: unknown) => Promise<void> | void;
  readonly on: (topic: string, handler: (payload: unknown) => void) => () => void;
}

export interface PluginModuleFacade {
  readonly registerModule: (spec: HermesModuleSpec) => Result<void>;
  readonly resolve: <T = unknown>(name: string) => T;
  readonly config: HermesConfig;
  readonly emit: (topic: string, payload: unknown) => Promise<void> | void;
  readonly on: (topic: string, handler: (payload: unknown) => void) => () => void;
}

/**
 * Per-plugin load outcome. The architecture (§2.8) does NOT require the
 * loader to return the registered HermesModuleSpec; the registry owns
 * the inventory (§2.5). This outcome type exposes the truthful result:
 * a name on success, a tagged "no spec" when a plugin's `register`
 * ran but did not produce a registration.
 */
export type PluginLoadOutcome =
  { readonly kind: 'registered'; readonly name: string } | { readonly kind: 'no_spec' };

/**
 * Batch load summary. Lists registered module names by name, plus the
 * list of entry paths skipped on the single-pass retry (§2.8). Full
 * specs are available from the Module Registry after a successful load.
 */
export interface PluginLoadSummary {
  readonly registered: readonly string[];
  readonly skipped: readonly string[];
}

/**
 * Discovers plugins and coordinates registration through the registry.
 *
 * The loader is independent: it does not import HermesLifecycle,
 * HermesEventDispatcher, or HermesHealthMonitor. The dispatcher and
 * container ports are supplied by the orchestrator at construction.
 */
export interface HermesPluginLoader {
  readonly discoverPlugins: () => Promise<readonly PluginEntrySource[]>;
  readonly validatePlugin: (entry: PluginEntrySource) => Result<PluginEntryModule, string>;
  readonly loadPlugin: (entry: PluginEntrySource) => Promise<Result<PluginLoadOutcome, string>>;
  readonly loadPlugins: () => Promise<Result<PluginLoadSummary, string>>;
  readonly unloadPlugin: (name: string) => Result<void>;
}

export interface PluginEntryModule {
  readonly register: (facade: PluginModuleFacade) => void | Promise<void>;
  readonly sourcePath: string;
}

const SUPPORTED_EXTENSIONS: readonly PluginEntryExtension[] = ['.ts', '.js', '.mjs', '.cjs'];

const nodeFileSystem = (): HermesFileSystem => ({
  list: (dir: string): readonly string[] => {
    try {
      return readdirSync(dir) as readonly string[];
    } catch {
      return [];
    }
  },
  isFile: (path: string): boolean => {
    try {
      return statSync(path).isFile();
    } catch {
      return false;
    }
  },
  read: (path: string): string => readFileSync(path, 'utf8'),
});

/**
 * Validates that a discovered entry has a non-empty path and content.
 * Does not invoke the register function; that is loadPlugin()'s job.
 */
export const validatePlugin = (entry: PluginEntrySource): Result<PluginEntryModule, string> => {
  if (entry.path.length === 0) {
    return { ok: false, error: 'Plugin entry path is empty.' };
  }
  if (entry.content.length === 0) {
    return { ok: false, error: `Plugin entry "${entry.path}" has empty content.` };
  }
  return { ok: true, value: { register: () => undefined, sourcePath: entry.path } };
};

const buildFacade = (options: PluginFacadeOptions): PluginModuleFacade => ({
  registerModule: (spec: HermesModuleSpec): Result<void> => options.registry.registerModule(spec),
  resolve: <T = unknown>(name: string): T => options.container.resolve<T>(name),
  config: options.config,
  emit: (topic: string, payload: unknown) => options.dispatcher.emit(topic, payload),
  on: (topic: string, handler: (payload: unknown) => void) => options.dispatcher.on(topic, handler),
});

export interface HermesPluginLoaderOptions {
  readonly modulesDir: string;
  readonly registry: HermesModuleRegistry;
  readonly config: HermesConfig;
  readonly container: PluginContainerPort;
  readonly dispatcher: PluginDispatcherPort;
  readonly fileSystem?: HermesFileSystem;
  readonly dynamicImport?: PluginDynamicImport;
  readonly logger?: PluginLogger | Logger;
}

export const createHermesPluginLoader = (
  options: HermesPluginLoaderOptions,
): HermesPluginLoader => {
  const fs = options.fileSystem ?? nodeFileSystem();
  const logger: PluginLogger =
    options.logger === undefined
      ? { warn: (): void => {} }
      : 'warn' in options.logger
        ? options.logger
        : toPluginLogger(options.logger);
  const facade = buildFacade({
    registry: options.registry,
    config: options.config,
    container: options.container,
    dispatcher: options.dispatcher,
  });

  const entries = (dir: string): readonly PluginEntrySource[] => {
    const names = fs.list(dir);
    const out: PluginEntrySource[] = [];
    for (const name of names) {
      const full = join(dir, name);
      if (!fs.isFile(full)) continue;
      const ext = extname(name).toLowerCase() as PluginEntryExtension;
      if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;
      out.push({ path: full, content: fs.read(full) });
    }
    return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  };

  const importEntry = async (source: PluginEntrySource): Promise<PluginEntryModule> => {
    if (options.dynamicImport) {
      const mod = await options.dynamicImport.import(source.path, source.content);
      const candidate =
        (mod as { register?: unknown })?.register ??
        (mod as { default?: { register?: unknown } })?.default?.register;
      if (typeof candidate !== 'function') {
        throw new Error(`Plugin entry "${source.path}" does not export a register() function.`);
      }
      return {
        register: candidate as PluginEntryModule['register'],
        sourcePath: source.path,
      };
    }
    // Without a dynamic import port, the loader can only validate that
    // the entry has a syntactically plausible shape. Real filesystem
    // loading requires the orchestrator (Bootstrap) to wire a real
    // dynamic import. The loader reports the entry as un-loadable in
    // that case so callers can supply a real import port.
    throw new Error(
      `HermesPluginLoader: dynamic import port not configured. Cannot import "${source.path}".`,
    );
  };

  /**
   * Attempts to invoke a single entry's `register(facade)`. Returns the
   * name of the module that was added to the registry, or `undefined`
   * if the plugin did not register anything. Per §2.5, the registry is
   * the source of truth — we read it back via a single getModules()
   * snapshot.
   */
  const invokeEntry = async (entry: PluginEntrySource): Promise<string | undefined> => {
    const module = await importEntry(entry);
    const moduleCountBefore = options.registry.moduleCount();
    await module.register(facade);
    const moduleCountAfter = options.registry.moduleCount();
    if (moduleCountAfter > moduleCountBefore) {
      const after = options.registry.list();
      const last = after[after.length - 1];
      return last?.name;
    }
    return undefined;
  };

  return {
    discoverPlugins: async (): Promise<readonly PluginEntrySource[]> => entries(options.modulesDir),

    validatePlugin: (entry: PluginEntrySource): Result<PluginEntryModule, string> =>
      validatePlugin(entry),

    loadPlugin: async (entry: PluginEntrySource): Promise<Result<PluginLoadOutcome, string>> => {
      try {
        const name = await invokeEntry(entry);
        if (name) {
          return { ok: true, value: { kind: 'registered', name } };
        }
        return { ok: true, value: { kind: 'no_spec' } };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },

    loadPlugins: async (): Promise<Result<PluginLoadSummary, string>> => {
      const discovered = entries(options.modulesDir);
      const registered: string[] = [];
      const skipped: string[] = [];

      for (const entry of discovered) {
        try {
          const name = await invokeEntry(entry);
          if (name) {
            registered.push(name);
          } else {
            skipped.push(entry.path);
            logger.warn(`HermesPluginLoader: ${entry.path}: no module registered through facade`);
          }
        } catch (error) {
          skipped.push(entry.path);
          logger.warn(
            `HermesPluginLoader: ${entry.path}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // Single-pass retry per §2.8: any entry that previously failed gets
      // one more chance now that the first pass has registered some
      // modules (which may satisfy declared dependencies).
      if (skipped.length > 0) {
        const retrySkips: string[] = [];
        for (const path of skipped) {
          const entry: PluginEntrySource = {
            path,
            content: fs.read(path),
          };
          try {
            const name = await invokeEntry(entry);
            if (name) {
              registered.push(name);
            } else {
              retrySkips.push(path);
              logger.warn(`HermesPluginLoader: retry: ${path}: still no module registered`);
            }
          } catch (error) {
            retrySkips.push(path);
            logger.warn(
              `HermesPluginLoader: retry: ${path}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
        skipped.length = 0;
        skipped.push(...retrySkips);
      }

      return { ok: true, value: { registered, skipped } };
    },

    unloadPlugin: (name: string): Result<void> => options.registry.unregisterModule(name),
  };
};
