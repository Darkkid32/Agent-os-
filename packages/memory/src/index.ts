/**
 * @agent-os/memory
 *
 * Memory store contracts. Phase 1.1 ships the interface only.
 */

import type { Identifier, Result, Timestamp } from '@agent-os/core';

export const PACKAGE_NAME = '@agent-os/memory' as const;
export const PACKAGE_VERSION = '0.1.0' as const;

export type MemoryId = Identifier<'MemoryId'>;

export interface MemoryRecord {
  readonly id: MemoryId;
  readonly namespace: string;
  readonly key: string;
  readonly value: unknown;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface MemoryStore {
  readonly get: (namespace: string, key: string) => Promise<Result<MemoryRecord | null>>;
  readonly put: (record: MemoryRecord) => Promise<Result<void>>;
  readonly delete: (namespace: string, key: string) => Promise<Result<void>>;
}
