import { describe, it, expect } from 'vitest';
import { MemoryContext } from './MemoryContext.js';
import type { MemoryScore, MemoryRecord } from './MemoryTypes.js';

const makeRecord = (id: string, scope: string = 'conversation'): MemoryRecord => ({
  id,
  scope: scope as MemoryRecord['scope'],
  content: `Content for ${id}`,
  source: { pluginId: 'p1', label: 'Test' },
  tags: [],
  importance: 0.5,
  metadata: {},
  createdAt: '2025-01-01T00:00:00Z',
  lastAccessedAt: '2025-01-01T00:00:00Z',
  accessCount: 0,
  readOnly: false,
  visibility: 'private',
});

const makeScores = (): MemoryScore[] => [
  {
    record: makeRecord('r1'),
    score: 0.9,
    components: { relevance: 0.9, importance: 0.5, recency: 0.5, sourcePriority: 0.5 },
  },
  {
    record: makeRecord('r2', 'project'),
    score: 0.7,
    components: { relevance: 0.7, importance: 0.5, recency: 0.5, sourcePriority: 0.5 },
  },
];

describe('MemoryContext', () => {
  it('getMemories', () => {
    const ctx = new MemoryContext('query', makeScores(), 100);
    expect(ctx.getMemories()).toHaveLength(2);
  });

  it('getScores', () => {
    const ctx = new MemoryContext('query', makeScores(), 100);
    expect(ctx.getScores()).toHaveLength(2);
  });

  it('getQuery', () => {
    const ctx = new MemoryContext('hello', [], 0);
    expect(ctx.getQuery()).toBe('hello');
  });

  it('getDurationMs', () => {
    const ctx = new MemoryContext('q', [], 42);
    expect(ctx.getDurationMs()).toBe(42);
  });

  it('getTopMemories', () => {
    const ctx = new MemoryContext('q', makeScores(), 0);
    expect(ctx.getTopMemories(1)).toHaveLength(1);
  });

  it('getMemoriesByScope', () => {
    const ctx = new MemoryContext('q', makeScores(), 0);
    expect(ctx.getMemoriesByScope('conversation')).toHaveLength(1);
  });

  it('getMemoriesByPlugin', () => {
    const ctx = new MemoryContext('q', makeScores(), 0);
    expect(ctx.getMemoriesByPlugin('p1')).toHaveLength(2);
  });

  it('getSummary', () => {
    const ctx = new MemoryContext('q', makeScores(), 100);
    const s = ctx.getSummary();
    expect(s.query).toBe('q');
    expect(s.totalMemories).toBe(2);
    expect(s.durationMs).toBe(100);
    expect(s.topScore).toBe(0.9);
    expect(s.scopes).toContain('conversation');
  });

  it('toRetrievalContext', () => {
    const ctx = new MemoryContext('q', makeScores(), 100);
    const rc = ctx.toRetrievalContext();
    expect(rc.query).toBe('q');
    expect(rc.memories).toHaveLength(2);
  });

  it('empty context', () => {
    const ctx = MemoryContext.empty('q');
    expect(ctx.getMemories()).toHaveLength(0);
    expect(ctx.getScores()).toHaveLength(0);
  });
});
