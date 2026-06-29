/**
 * Test-only utilities for @agent-os/core.
 *
 * Importable via `import { ... } from '@agent-os/core/test-utils'`.
 * These are pure-test helpers. They are not part of the runtime
 * surface. They never appear in compiled `dist/index.*`.
 *
 * Conventions:
 *   - Result helpers (`expectOk`, `expectErr`) throw with rich context
 *     on mismatch, so a single failing assertion tells the whole story.
 *   - `createDeferred` produces a `Promise<T>` with `resolve`/`reject`
 *     exposed for orchestrating concurrent flows without timers.
 */
import type { Result } from './index.js';

export const okOf = <T>(value: T): Result<T> => ({
  ok: true,
  value,
});

export const errOf = (message: string): Result<never> => ({
  ok: false,
  error: new Error(message),
});

export const expectOk = <T>(result: Result<T>): T => {
  if (!result.ok) {
    throw new Error(`expectOk: result was err: ${result.error.message}`);
  }
  return result.value;
};

export const expectErr = <T>(result: Result<T>): Error => {
  if (result.ok) {
    throw new Error(`expectErr: result was ok: ${JSON.stringify(result.value)}`);
  }
  return result.error;
};

export const tapOk = async <T>(
  result: Result<T>,
  fn: (value: T) => Promise<void> | void,
): Promise<void> => {
  if (result.ok) await fn(result.value);
};

export interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

export const createDeferred = <T = void>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
