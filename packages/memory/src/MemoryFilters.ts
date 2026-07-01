/**
 * Filter functions for memory records.
 *
 * Layer: 2 (Platform)
 */

import type { MemoryRecord, MemoryScope, MemoryFilter, MemoryQuery } from './MemoryTypes.js';

// ---------------------------------------------------------------------------
// Predicate-based filters
// ---------------------------------------------------------------------------

/**
 * Filter records matching a predicate.
 */
export const filterByPredicate = (
  records: readonly MemoryRecord[],
  predicate: (record: MemoryRecord) => boolean,
): readonly MemoryRecord[] => records.filter(predicate);

/**
 * Filter by scope.
 */
export const filterByScope = (
  records: readonly MemoryRecord[],
  scopes: readonly MemoryScope[],
): readonly MemoryRecord[] => {
  if (scopes.length === 0) return records;
  const scopeSet = new Set(scopes);
  return records.filter((r) => scopeSet.has(r.scope));
};

/**
 * Filter by plugin ID.
 */
export const filterByPluginId = (
  records: readonly MemoryRecord[],
  pluginIds: readonly string[],
): readonly MemoryRecord[] => {
  if (pluginIds.length === 0) return records;
  const pluginSet = new Set(pluginIds);
  return records.filter((r) => pluginSet.has(r.source.pluginId));
};

/**
 * Filter by user ID.
 */
export const filterByUserId = (
  records: readonly MemoryRecord[],
  userId: string,
): readonly MemoryRecord[] => records.filter((r) => r.userId === userId);

/**
 * Filter by project ID.
 */
export const filterByProjectId = (
  records: readonly MemoryRecord[],
  projectId: string,
): readonly MemoryRecord[] => records.filter((r) => r.projectId === projectId);

/**
 * Filter by tags.
 */
export const filterByTags = (
  records: readonly MemoryRecord[],
  tags: readonly string[],
): readonly MemoryRecord[] => {
  if (tags.length === 0) return records;
  const tagSet = new Set(tags);
  return records.filter((r) => r.tags.some((t) => tagSet.has(t)));
};

/**
 * Filter by minimum importance.
 */
export const filterByImportance = (
  records: readonly MemoryRecord[],
  minImportance: number,
): readonly MemoryRecord[] => records.filter((r) => r.importance >= minImportance);

/**
 * Filter out read-only records.
 */
export const excludeReadOnly = (records: readonly MemoryRecord[]): readonly MemoryRecord[] =>
  records.filter((r) => !r.readOnly);

/**
 * Filter by metadata.
 */
export const filterByMetadata = (
  records: readonly MemoryRecord[],
  key: string,
  value: unknown,
): readonly MemoryRecord[] => records.filter((r) => r.metadata[key] === value);

// ---------------------------------------------------------------------------
// Compound filter
// ---------------------------------------------------------------------------

/**
 * Apply a full filter object to a set of records.
 */
export const applyFilter = (
  records: readonly MemoryRecord[],
  filter: MemoryFilter,
): readonly MemoryRecord[] => {
  let result = records;

  if (filter.scopes !== undefined) {
    result = filterByScope(result, filter.scopes);
  }

  if (filter.pluginIds !== undefined) {
    result = filterByPluginId(result, filter.pluginIds);
  }

  if (filter.userId !== undefined) {
    result = filterByUserId(result, filter.userId);
  }

  if (filter.projectId !== undefined) {
    result = filterByProjectId(result, filter.projectId);
  }

  if (filter.tags !== undefined) {
    result = filterByTags(result, filter.tags);
  }

  if (filter.minImportance !== undefined) {
    result = filterByImportance(result, filter.minImportance);
  }

  if (filter.includeReadOnly !== true) {
    result = excludeReadOnly(result);
  }

  return result;
};

/**
 * Build a MemoryFilter from a MemoryQuery.
 */
export const queryToFilter = (query: MemoryQuery): MemoryFilter => ({
  query: query.text,
  ...(query.scopes !== undefined ? { scopes: query.scopes } : {}),
  ...(query.pluginIds !== undefined ? { pluginIds: query.pluginIds } : {}),
  ...(query.userId !== undefined ? { userId: query.userId } : {}),
  ...(query.projectId !== undefined ? { projectId: query.projectId } : {}),
  ...(query.tags !== undefined ? { tags: query.tags } : {}),
  ...(query.minImportance !== undefined ? { minImportance: query.minImportance } : {}),
  ...(query.includeReadOnly !== undefined ? { includeReadOnly: query.includeReadOnly } : {}),
});
