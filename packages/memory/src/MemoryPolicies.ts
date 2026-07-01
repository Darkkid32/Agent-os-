/**
 * Memory policies — control lifecycle, retention, and behavior.
 *
 * Layer: 2 (Platform)
 */

import type { MemoryRecord, MemoryPolicy, MemoryScope } from './MemoryTypes.js';

// ---------------------------------------------------------------------------
// Default policies
// ---------------------------------------------------------------------------

/**
 * Default policy map keyed by scope.
 */
export const DEFAULT_POLICIES: Readonly<Record<MemoryScope, MemoryPolicy>> = {
  conversation: {
    id: 'conversation-default',
    description: 'Conversation memories — medium retention, medium importance',
    ttlMs: 3600000, // 1 hour
    maxCount: 1000,
    pinned: false,
    defaultImportance: 0.5,
    defaultVisibility: 'private',
  },
  project: {
    id: 'project-default',
    description: 'Project memories — long retention, high importance',
    ttlMs: 86400000 * 7, // 7 days
    maxCount: 5000,
    pinned: false,
    defaultImportance: 0.7,
    defaultVisibility: 'shared',
  },
  execution: {
    id: 'execution-default',
    description: 'Execution memories — short retention, high importance',
    ttlMs: 3600000, // 1 hour
    maxCount: 500,
    pinned: false,
    defaultImportance: 0.8,
    defaultVisibility: 'private',
  },
  plugin: {
    id: 'plugin-default',
    description: 'Plugin memories — long retention, medium importance',
    ttlMs: 86400000 * 30, // 30 days
    maxCount: 2000,
    pinned: false,
    defaultImportance: 0.6,
    defaultVisibility: 'shared',
  },
  user: {
    id: 'user-default',
    description: 'User memories — persistent, high importance',
    ttlMs: 86400000 * 365, // 1 year
    maxCount: 10000,
    pinned: false,
    defaultImportance: 0.9,
    defaultVisibility: 'private',
  },
  knowledge: {
    id: 'knowledge-default',
    description: 'Knowledge base memories — very long retention',
    ttlMs: 86400000 * 365, // 1 year
    maxCount: 50000,
    pinned: false,
    defaultImportance: 0.8,
    defaultVisibility: 'public',
  },
  system: {
    id: 'system-default',
    description: 'System memories — persistent, highest importance',
    maxCount: 1000,
    pinned: true,
    defaultImportance: 1.0,
    defaultVisibility: 'shared',
  },
};

// ---------------------------------------------------------------------------
// Policy functions
// ---------------------------------------------------------------------------

/**
 * Get the default policy for a scope.
 */
export const getDefaultPolicy = (scope: MemoryScope): MemoryPolicy => DEFAULT_POLICIES[scope];

/**
 * Check if a record has expired based on its TTL.
 */
export const isExpired = (record: MemoryRecord, now: Date = new Date()): boolean => {
  if (record.ttlMs === undefined) return false;
  const created = new Date(record.createdAt).getTime();
  return now.getTime() - created > record.ttlMs;
};

/**
 * Filter expired records.
 */
export const filterExpired = (
  records: readonly MemoryRecord[],
  now: Date = new Date(),
): readonly MemoryRecord[] => records.filter((r) => !isExpired(r, now));

/**
 * Check if a record is pinned.
 */
export const isPinned = (record: MemoryRecord): boolean => record.readOnly;

/**
 * Calculate retention size for a scope given a policy.
 * Returns the number of records to evict if over limit.
 */
export const calculateEvictionCount = (
  records: readonly MemoryRecord[],
  policy: MemoryPolicy,
): number => {
  if (policy.maxCount === undefined) return 0;
  return Math.max(0, records.length - policy.maxCount);
};

/**
 * Select records to evict (least important, then oldest).
 */
export const selectEvictionCandidates = (
  records: readonly MemoryRecord[],
  count: number,
): readonly MemoryRecord[] => {
  if (count <= 0) return [];

  // Pinned records are never evicted
  const evictable = records.filter((r) => !isPinned(r));

  return evictable
    .sort((a, b) => {
      // Least important first
      const impDiff = a.importance - b.importance;
      if (impDiff !== 0) return impDiff;
      // Oldest first
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .slice(0, count);
};

/**
 * Apply a policy to determine if a record can be created.
 */
export const canCreate = (
  record: Partial<MemoryRecord>,
  policy: MemoryPolicy,
): { allowed: boolean; reason?: string } => {
  if (policy.maxSizeBytes !== undefined && record.content !== undefined) {
    const size = new TextEncoder().encode(record.content).length;
    if (size > policy.maxSizeBytes) {
      return {
        allowed: false,
        reason: `Content size ${size} exceeds limit ${policy.maxSizeBytes}`,
      };
    }
  }
  return { allowed: true };
};
