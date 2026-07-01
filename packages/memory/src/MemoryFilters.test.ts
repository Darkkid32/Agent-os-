import { describe, it, expect } from 'vitest';
import {
  filterByScope,
  filterByPluginId,
  filterByUserId,
  filterByProjectId,
  filterByTags,
  filterByImportance,
  excludeReadOnly,
  filterByMetadata,
  applyFilter,
  queryToFilter,
  filterByPredicate,
} from './MemoryFilters.js';
import type { MemoryRecord } from './MemoryTypes.js';

const makeRecord = (overrides: Partial<MemoryRecord> = {}): MemoryRecord => {
  const base: MemoryRecord = {
    id: overrides.id ?? 'r1',
    scope: overrides.scope ?? 'conversation',
    content: 'test',
    source: { pluginId: overrides.source?.pluginId ?? 'p1', label: 'Test' },
    tags: overrides.tags ?? [],
    importance: overrides.importance ?? 0.5,
    metadata: overrides.metadata ?? {},
    createdAt: '2025-01-01T00:00:00Z',
    lastAccessedAt: '2025-01-01T00:00:00Z',
    accessCount: 0,
    readOnly: overrides.readOnly ?? false,
    visibility: 'private',
  };
  return {
    ...base,
    ...(overrides.userId !== undefined ? { userId: overrides.userId } : {}),
    ...(overrides.projectId !== undefined ? { projectId: overrides.projectId } : {}),
  };
};

const records: MemoryRecord[] = [
  makeRecord({ id: 'r1', scope: 'conversation', tags: ['a'], importance: 0.3, readOnly: false }),
  makeRecord({ id: 'r2', scope: 'project', tags: ['b'], importance: 0.8, readOnly: true }),
  makeRecord({
    id: 'r3',
    scope: 'conversation',
    tags: ['a', 'b'],
    importance: 0.6,
    readOnly: false,
  }),
];

describe('MemoryFilters', () => {
  it('filterByPredicate', () => {
    expect(filterByPredicate(records, (r) => r.id === 'r1')).toHaveLength(1);
  });

  it('filterByScope', () => {
    expect(filterByScope(records, ['project'])).toHaveLength(1);
  });

  it('filterByScope empty returns all', () => {
    expect(filterByScope(records, [])).toHaveLength(3);
  });

  it('filterByPluginId', () => {
    const r = [makeRecord({ source: { pluginId: 'x', label: 'X' } })];
    expect(filterByPluginId(r, ['x'])).toHaveLength(1);
  });

  it('filterByPluginId empty returns all', () => {
    expect(filterByPluginId(records, [])).toHaveLength(3);
  });

  it('filterByUserId', () => {
    const r = [makeRecord({ userId: 'u1' })];
    expect(filterByUserId(r, 'u1')).toHaveLength(1);
  });

  it('filterByProjectId', () => {
    const r = [makeRecord({ projectId: 'p1' })];
    expect(filterByProjectId(r, 'p1')).toHaveLength(1);
  });

  it('filterByTags', () => {
    expect(filterByTags(records, ['a'])).toHaveLength(2);
  });

  it('filterByTags empty returns all', () => {
    expect(filterByTags(records, [])).toHaveLength(3);
  });

  it('filterByImportance', () => {
    expect(filterByImportance(records, 0.5)).toHaveLength(2);
  });

  it('excludeReadOnly', () => {
    expect(excludeReadOnly(records)).toHaveLength(2);
  });

  it('filterByMetadata', () => {
    const r = [makeRecord({ metadata: { key: 'val' } })];
    expect(filterByMetadata(r, 'key', 'val')).toHaveLength(1);
  });

  it('applyFilter', () => {
    expect(applyFilter(records, { scopes: ['conversation'] })).toHaveLength(2);
  });

  it('applyFilter with tags', () => {
    // r2 is readOnly so it's excluded by default
    expect(applyFilter(records, { tags: ['b'] })).toHaveLength(1);
  });

  it('applyFilter with minImportance', () => {
    // r2 has importance 0.8 but is readOnly, so excluded
    expect(applyFilter(records, { minImportance: 0.7 })).toHaveLength(0);
  });

  it('applyFilter excludeReadOnly', () => {
    expect(applyFilter(records, {})).toHaveLength(2);
  });

  it('applyFilter includeReadOnly', () => {
    expect(applyFilter(records, { includeReadOnly: true })).toHaveLength(3);
  });

  it('queryToFilter', () => {
    const filter = queryToFilter({
      text: 'hello',
      scopes: ['project'],
      pluginIds: ['p1'],
      userId: 'u1',
      projectId: 'proj1',
      tags: ['t1'],
      minImportance: 0.5,
      includeReadOnly: true,
    });
    expect(filter.query).toBe('hello');
    expect(filter.scopes).toEqual(['project']);
  });

  it('queryToFilter omits undefined', () => {
    const filter = queryToFilter({ text: 'hi' });
    expect(filter.scopes).toBeUndefined();
  });
});
