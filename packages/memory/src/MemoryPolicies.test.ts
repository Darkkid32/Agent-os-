import { describe, it, expect } from 'vitest';
import {
  DEFAULT_POLICIES,
  getDefaultPolicy,
  isExpired,
  filterExpired,
  isPinned,
  calculateEvictionCount,
  selectEvictionCandidates,
  canCreate,
} from './MemoryPolicies.js';
import type { MemoryRecord, MemoryPolicy } from './MemoryTypes.js';

const makeRecord = (overrides: Partial<MemoryRecord> = {}): MemoryRecord => ({
  id: overrides.id ?? 'r1',
  scope: overrides.scope ?? 'conversation',
  content: 'test',
  source: { pluginId: 'p1', label: 'Test' },
  tags: [],
  importance: overrides.importance ?? 0.5,
  metadata: {},
  createdAt: overrides.createdAt ?? '2025-01-01T00:00:00Z',
  lastAccessedAt: '2025-01-01T00:00:00Z',
  accessCount: 0,
  readOnly: overrides.readOnly ?? false,
  visibility: 'private',
  ttlMs: overrides.ttlMs,
});

describe('DEFAULT_POLICIES', () => {
  it('has all scopes', () => {
    expect(DEFAULT_POLICIES.conversation).toBeDefined();
    expect(DEFAULT_POLICIES.project).toBeDefined();
    expect(DEFAULT_POLICIES.execution).toBeDefined();
    expect(DEFAULT_POLICIES.plugin).toBeDefined();
    expect(DEFAULT_POLICIES.user).toBeDefined();
    expect(DEFAULT_POLICIES.knowledge).toBeDefined();
    expect(DEFAULT_POLICIES.system).toBeDefined();
  });
});

describe('getDefaultPolicy', () => {
  it('returns correct policy', () => {
    expect(getDefaultPolicy('conversation').id).toBe('conversation-default');
  });
});

describe('isExpired', () => {
  it('no TTL = not expired', () => {
    expect(isExpired(makeRecord())).toBe(false);
  });

  it('expired record', () => {
    const r = makeRecord({
      createdAt: '2025-01-01T00:00:00Z',
      ttlMs: 1000,
    });
    const now = new Date('2025-01-01T00:00:02Z');
    expect(isExpired(r, now)).toBe(true);
  });

  it('not expired record', () => {
    const r = makeRecord({
      createdAt: '2025-01-01T00:00:00Z',
      ttlMs: 5000,
    });
    const now = new Date('2025-01-01T00:00:02Z');
    expect(isExpired(r, now)).toBe(false);
  });
});

describe('filterExpired', () => {
  it('filters expired', () => {
    const records = [
      makeRecord({ id: 'r1', createdAt: '2025-01-01T00:00:00Z', ttlMs: 1000 }),
      makeRecord({ id: 'r2', createdAt: '2025-01-01T00:00:00Z', ttlMs: 5000 }),
    ];
    const now = new Date('2025-01-01T00:00:02Z');
    const result = filterExpired(records, now);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('r2');
  });
});

describe('isPinned', () => {
  it('readOnly = pinned', () => {
    expect(isPinned(makeRecord({ readOnly: true }))).toBe(true);
  });

  it('not readOnly = not pinned', () => {
    expect(isPinned(makeRecord())).toBe(false);
  });
});

describe('calculateEvictionCount', () => {
  it('over limit', () => {
    const records = [makeRecord(), makeRecord(), makeRecord()];
    const policy: MemoryPolicy = {
      id: 'test',
      description: '',
      maxCount: 2,
      pinned: false,
      defaultImportance: 0.5,
      defaultVisibility: 'private',
    };
    expect(calculateEvictionCount(records, policy)).toBe(1);
  });

  it('under limit', () => {
    const records = [makeRecord()];
    const policy: MemoryPolicy = {
      id: 'test',
      description: '',
      maxCount: 5,
      pinned: false,
      defaultImportance: 0.5,
      defaultVisibility: 'private',
    };
    expect(calculateEvictionCount(records, policy)).toBe(0);
  });

  it('no maxCount', () => {
    const policy: MemoryPolicy = {
      id: 'test',
      description: '',
      pinned: false,
      defaultImportance: 0.5,
      defaultVisibility: 'private',
    };
    expect(calculateEvictionCount([makeRecord()], policy)).toBe(0);
  });
});

describe('selectEvictionCandidates', () => {
  it('returns least important', () => {
    const records = [
      makeRecord({ id: 'r1', importance: 0.9 }),
      makeRecord({ id: 'r2', importance: 0.1 }),
    ];
    const candidates = selectEvictionCandidates(records, 1);
    expect(candidates[0]?.id).toBe('r2');
  });

  it('skips pinned records', () => {
    const records = [
      makeRecord({ id: 'r1', readOnly: true, importance: 0.1 }),
      makeRecord({ id: 'r2', importance: 0.5 }),
    ];
    const candidates = selectEvictionCandidates(records, 1);
    expect(candidates[0]?.id).toBe('r2');
  });

  it('returns empty for count 0', () => {
    expect(selectEvictionCandidates([makeRecord()], 0)).toHaveLength(0);
  });
});

describe('canCreate', () => {
  it('allows normal record', () => {
    expect(canCreate({ content: 'hi' }, DEFAULT_POLICIES.conversation).allowed).toBe(true);
  });

  it('rejects oversized content', () => {
    const policy: MemoryPolicy = {
      id: 'test',
      description: '',
      maxSizeBytes: 5,
      pinned: false,
      defaultImportance: 0.5,
      defaultVisibility: 'private',
    };
    const result = canCreate({ content: 'a'.repeat(10) }, policy);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('exceeds');
  });
});
