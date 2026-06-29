/**
 * Mock Hermes factory for tests.
 *
 * Returns a structurally-correct `Hermes` instance whose methods are
 * deterministic and user-controllable. Defaults are:
 *
 *   - phase: 'stopped'
 *   - uptime: 0
 *   - modules: 0
 *   - health aggregate: 'healthy'
 *   - start / stop / health:   ok
 *   - register / unregister:   ok
 *
 * Pass an `overrides` object to flip a specific method to return an
 * `err` Result, throw, or replace behaviour entirely. The factory is
 * side-effect-free: tests can construct fresh mocks per case without
 * cross-pollution.
 */
import { err, now as tsNow, ok, type Result, type Timestamp } from '@agent-os/core';
import {
  type Hermes,
  type HermesHealthMonitorReport,
  type HermesStatus,
  type HermesLifecyclePhase,
} from '../Hermes.js';
import { type HermesConfig, validateConfig } from '../HermesConfig.js';
import type { HermesModuleSpec } from '../HermesModuleRegistry.js';

export interface MockHermesOptions {
  readonly phase?: HermesLifecyclePhase;
  readonly uptime?: Timestamp;
  readonly modules?: number;
  readonly health?: Partial<HermesHealthMonitorReport>;
  readonly config?: Partial<HermesConfig>;
  readonly startResult?: (() => Promise<Result<void>>) | Result<void>;
  readonly stopResult?: (() => Promise<Result<void>>) | Result<void>;
  readonly healthResult?:
    (() => Promise<Result<HermesHealthMonitorReport>>) | Result<HermesHealthMonitorReport>;
  readonly registerResult?: ((spec: HermesModuleSpec) => Result<void>) | Result<void>;
  readonly unregisterResult?: ((name: string) => Result<void>) | Result<void>;
}

const resolveAsync = <T>(value: (() => Promise<T>) | T): Promise<T> =>
  typeof value === 'function' ? (value as () => Promise<T>)() : Promise.resolve(value);

const okVoid: Result<void> = ok(undefined);

export const createMockHermes = (options: MockHermesOptions = {}): Hermes => {
  const status = (): HermesStatus => ({
    phase: options.phase ?? 'STOPPED',
    uptime: (options.uptime ?? 0) as Timestamp,
    modules: options.modules ?? 0,
  });

  const configOverride = options.config ?? {};
  const validated = validateConfig({
    OPENROUTER_API_KEY: 'test',
    DATABASE_URL: 'test',
    REDIS_URL: 'test',
  });
  if (!validated.ok) {
    throw new Error('createMockHermes: validateConfig unexpected err');
  }
  const config: HermesConfig = Object.freeze({ ...validated.value, ...configOverride });

  const startImpl: () => Promise<Result<void>> =
    typeof options.startResult === 'function'
      ? (options.startResult as () => Promise<Result<void>>)
      : options.startResult
        ? () => resolveAsync(options.startResult as Result<void>)
        : async () => okVoid;

  const stopImpl: () => Promise<Result<void>> =
    typeof options.stopResult === 'function'
      ? (options.stopResult as () => Promise<Result<void>>)
      : options.stopResult
        ? () => resolveAsync(options.stopResult as Result<void>)
        : async () => okVoid;

  const healthImpl: () => Promise<Result<HermesHealthMonitorReport>> =
    typeof options.healthResult === 'function'
      ? (options.healthResult as () => Promise<Result<HermesHealthMonitorReport>>)
      : options.healthResult
        ? () => resolveAsync(options.healthResult as Result<HermesHealthMonitorReport>)
        : async () =>
            ok({
              status: 'healthy',
              modules: [],
              at: tsNow(),
              ...(options.health ?? {}),
            });

  const registerImpl: (spec: HermesModuleSpec) => Result<void> =
    typeof options.registerResult === 'function'
      ? (options.registerResult as (spec: HermesModuleSpec) => Result<void>)
      : options.registerResult
        ? () => options.registerResult as Result<void>
        : () => okVoid;

  const unregisterImpl: (name: string) => Result<void> =
    typeof options.unregisterResult === 'function'
      ? (options.unregisterResult as (name: string) => Result<void>)
      : options.unregisterResult
        ? () => options.unregisterResult as Result<void>
        : () => okVoid;

  return {
    start: startImpl,
    stop: stopImpl,
    status,
    registerModule: registerImpl,
    unregisterModule: unregisterImpl,
    health: () =>
      healthImpl().then((r) =>
        r.ok
          ? r.value
          : {
              status: 'unknown',
              modules: [],
              at: tsNow(),
            },
      ),
    config,
  };
};

export const failingHermes = (message: string): Hermes =>
  createMockHermes({
    startResult: async () => err(new Error(message)),
    stopResult: async () => err(new Error(message)),
  });
