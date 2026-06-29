/**
 * @agent-os/runtime
 *
 * Runtime lifecycle contracts. No implementation in Phase 1.1.
 */

import type { Identifier, Result, Timestamp } from '@agent-os/core';

export const PACKAGE_NAME = '@agent-os/runtime' as const;
export const PACKAGE_VERSION = '0.1.0' as const;

export type RuntimeId = Identifier<'RuntimeId'>;

export type LifecyclePhase = 'init' | 'starting' | 'running' | 'draining' | 'stopped' | 'errored';

export interface RuntimeContext {
  readonly id: RuntimeId;
  readonly startedAt: Timestamp;
  readonly phase: LifecyclePhase;
}

export type LifecycleEvent =
  | { readonly kind: 'phase'; readonly phase: LifecyclePhase; readonly at: Timestamp }
  | { readonly kind: 'shutdown'; readonly reason: string; readonly at: Timestamp };

export interface RuntimePort {
  readonly start: (ctx: RuntimeContext) => Promise<Result<void>>;
  readonly stop: (ctx: RuntimeContext) => Promise<Result<void>>;
}
