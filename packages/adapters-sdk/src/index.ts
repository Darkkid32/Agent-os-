/**
 * @agent-os/adapters-sdk
 *
 * SDK surface that third-party authors use to integrate with Agent OS.
 * Phase 1.1 exports the contract only.
 */

import type { Identifier, Result } from '@agent-os/core';

export const PACKAGE_NAME = '@agent-os/adapters-sdk' as const;
export const PACKAGE_VERSION = '0.1.0' as const;

export type AdapterId = Identifier<'AdapterId'>;

export interface AdapterContext {
  readonly adapterId: AdapterId;
  readonly config: Record<string, unknown>;
}

export interface AdapterLifecycle {
  readonly init: (ctx: AdapterContext) => Promise<Result<void>>;
  readonly shutdown: (ctx: AdapterContext) => Promise<Result<void>>;
  readonly healthcheck: (ctx: AdapterContext) => Promise<Result<true>>;
}
