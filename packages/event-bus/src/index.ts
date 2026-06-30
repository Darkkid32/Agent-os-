/**
 * @agent-os/event-bus
 *
 * Event bus contracts. No transport implementation in Phase 1.1.
 */

import type { Identifier, Timestamp } from '@agent-os/core';

export const PACKAGE_NAME = '@agent-os/event-bus' as const;
export const PACKAGE_VERSION = '1.0.0' as const;

export type Topic = Identifier<'Topic'>;
export type SubscriptionId = Identifier<'SubscriptionId'>;

export interface Envelope<T = unknown> {
  readonly topic: Topic;
  readonly payload: T;
  readonly emittedAt: Timestamp;
}

export interface EventBus {
  readonly publish: <T>(topic: Topic, payload: T) => Promise<void>;
  readonly subscribe: <T>(topic: Topic, handler: (env: Envelope<T>) => void) => SubscriptionId;
  readonly unsubscribe: (id: SubscriptionId) => Promise<void>;
}
