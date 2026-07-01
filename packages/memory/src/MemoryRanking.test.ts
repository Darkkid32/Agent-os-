import { describe, it, expect } from 'vitest';
import {
  rankMemories,
  cosineSimilarity,
  deduplicateScores,
  calculateRelevance,
  calculateImportance,
  calculateRecency,
  calculateSourcePriority,
} from './MemoryRanking.js';
import type { MemoryRecord } from './MemoryTypes.js';

const makeRecord = (overrides: Partial<MemoryRecord> = {}): MemoryRecord => {
  const base: MemoryRecord = {
    id: overrides.id ?? 'r1',
    scope: overrides.scope ?? 'conversation',
    content: 'test',
    source: { pluginId: 'p1', label: 'Test' },
    tags: [],
    importance: overrides.importance ?? 0.5,
    metadata: {},
    createdAt: overrides.createdAt ?? '2025-01-01T00:00:00Z',
    lastAccessedAt: overrides.lastAccessedAt ?? '2025-01-01T00:00:00Z',
    accessCount: 0,
    readOnly: false,
    visibility: 'private',
  };
  return {
    ...base,
    ...(overrides.embedding !== undefined ? { embedding: overrides.embedding } : {}),
  };
};

describe('cosineSimilarity', () => {
  it('identical vectors = 1', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
  });

  it('orthogonal vectors = 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it('opposite vectors = -1', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBe(-1);
  });

  it('dimension mismatch throws', () => {
    expect(() => cosineSimilarity([1], [1, 2])).toThrow('mismatch');
  });

  it('zero vectors = 0', () => {
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  it('empty vectors = 0', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });
});

describe('calculateRelevance', () => {
  it('no embeddings returns 0.5', () => {
    expect(calculateRelevance(makeRecord())).toBe(0.5);
  });

  it('with embeddings returns cosine similarity', () => {
    const r = makeRecord({ embedding: [1, 0] });
    expect(calculateRelevance(r, [1, 0])).toBe(1);
  });
});

describe('calculateImportance', () => {
  it('returns clamped importance', () => {
    expect(calculateImportance(makeRecord({ importance: 0.7 }))).toBe(0.7);
  });
});

describe('calculateRecency', () => {
  it('recent record has high score', () => {
    const now = new Date('2025-01-01T00:00:00Z');
    const r = makeRecord({ lastAccessedAt: '2025-01-01T00:00:00Z' });
    expect(calculateRecency(r, now)).toBe(1.0);
  });

  it('old record has low score', () => {
    const now = new Date('2025-02-01T00:00:00Z');
    const r = makeRecord({ lastAccessedAt: '2025-01-01T00:00:00Z' });
    expect(calculateRecency(r, now)).toBeLessThan(1.0);
  });
});

describe('calculateSourcePriority', () => {
  it('execution has highest priority', () => {
    expect(calculateSourcePriority(makeRecord({ scope: 'execution' }))).toBe(0.9);
  });

  it('system has lowest priority', () => {
    expect(calculateSourcePriority(makeRecord({ scope: 'system' }))).toBe(0.3);
  });

  it('unknown scope returns 0.5', () => {
    const r = { ...makeRecord(), scope: 'unknown' as MemoryRecord['scope'] };
    expect(calculateSourcePriority(r)).toBe(0.5);
  });
});

describe('rankMemories', () => {
  it('returns empty for empty input', () => {
    expect(rankMemories([])).toHaveLength(0);
  });

  it('ranks by importance', () => {
    const records = [
      makeRecord({ id: 'r1', importance: 0.3 }),
      makeRecord({ id: 'r2', importance: 0.9 }),
    ];
    const scores = rankMemories(records);
    expect(scores[0]?.record.id).toBe('r2');
  });

  it('respects maxResults', () => {
    const records = Array.from({ length: 5 }, (_, i) =>
      makeRecord({ id: `r${i}`, importance: i * 0.2 }),
    );
    const scores = rankMemories(records, { maxResults: 2 });
    expect(scores).toHaveLength(2);
  });

  it('filters by minScore', () => {
    const records = [makeRecord({ id: 'r1', importance: 0.1 })];
    const scores = rankMemories(records, { minScore: 0.9 });
    expect(scores).toHaveLength(0);
  });
});

describe('deduplicateScores', () => {
  it('keeps higher score', () => {
    const r = makeRecord({ id: 'r1' });
    const scores = [
      {
        record: r,
        score: 0.3,
        components: { relevance: 0, importance: 0, recency: 0, sourcePriority: 0 },
      },
      {
        record: r,
        score: 0.8,
        components: { relevance: 0, importance: 0, recency: 0, sourcePriority: 0 },
      },
    ];
    const result = deduplicateScores(scores);
    expect(result).toHaveLength(1);
    expect(result[0]?.score).toBe(0.8);
  });
});
