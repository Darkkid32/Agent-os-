/**
 * @agent-os/core
 *
 * Foundational primitives shared by every Agent OS package and application.
 * This package MUST remain dependency-free of other @agent-os/* packages so it
 * can sit at the bottom of the dependency graph without producing cycles.
 *
 * Phase 1.1 deliberately ships NO business logic. Only type/contract shells.
 */

export const PACKAGE_NAME = '@agent-os/core' as const;
export const PACKAGE_VERSION = '0.1.0' as const;

export type Result<T, E = Error> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export type Brand<T, B extends string> = T & { readonly __brand: B };

export type Identifier<B extends string> = Brand<string, B>;

export const createIdentifier = <B extends string>(value: string): Identifier<B> =>
  value as Identifier<B>;

export type Timestamp = Brand<number, 'Timestamp'>;

export const now = (): Timestamp => Date.now() as Timestamp;
