/**
 * Memory ranking engine.
 *
 * Scores and ranks memory records based on relevance, importance,
 * recency, and source priority.
 *
 * Layer: 2 (Platform)
 */

import type { MemoryRecord, MemoryScore } from './MemoryTypes.js';

// ---------------------------------------------------------------------------
// Ranking options
// ---------------------------------------------------------------------------

export interface RankingOptions {
  /** Weight for relevance (semantic similarity) — default 0.4 */
  readonly relevanceWeight?: number;

  /** Weight for importance — default 0.3 */
  readonly importanceWeight?: number;

  /** Weight for recency — default 0.2 */
  readonly recencyWeight?: number;

  /** Weight for source priority — default 0.1 */
  readonly sourcePriorityWeight?: number;

  /** Maximum number of results — default 10 */
  readonly maxResults?: number;

  /** Minimum score threshold — default 0.0 */
  readonly minScore?: number;

  /** Current timestamp for recency calculation */
  readonly now?: Date;
}

const DEFAULT_OPTIONS: Required<RankingOptions> = {
  relevanceWeight: 0.4,
  importanceWeight: 0.3,
  recencyWeight: 0.2,
  sourcePriorityWeight: 0.1,
  maxResults: 10,
  minScore: 0.0,
  now: new Date(),
};

// ---------------------------------------------------------------------------
// Scoring functions
// ---------------------------------------------------------------------------

/**
 * Calculate relevance score from embedding similarity.
 */
export const calculateRelevance = (
  record: MemoryRecord,
  queryEmbedding?: readonly number[],
): number => {
  if (queryEmbedding === undefined || record.embedding === undefined) {
    return 0.5;
  }
  return cosineSimilarity(record.embedding, queryEmbedding);
};

/**
 * Calculate importance score.
 */
export const calculateImportance = (record: MemoryRecord): number =>
  Math.min(1.0, Math.max(0.0, record.importance));

/**
 * Calculate recency score (decays over time).
 */
export const calculateRecency = (record: MemoryRecord, now: Date): number => {
  const lastAccessed = new Date(record.lastAccessedAt).getTime();
  const elapsedMs = now.getTime() - lastAccessed;
  const dayMs = 86400000;
  const daysSinceAccess = elapsedMs / dayMs;
  return Math.max(0.0, 1.0 - daysSinceAccess / 30);
};

/**
 * Calculate source priority score.
 */
export const calculateSourcePriority = (record: MemoryRecord): number => {
  const priorityMap: Record<string, number> = {
    execution: 0.9,
    conversation: 0.8,
    project: 0.7,
    knowledge: 0.6,
    user: 0.5,
    plugin: 0.4,
    system: 0.3,
  };
  return priorityMap[record.scope] ?? 0.5;
};

// ---------------------------------------------------------------------------
// Main ranking function
// ---------------------------------------------------------------------------

/**
 * Score and rank memory records.
 */
export const rankMemories = (
  records: readonly MemoryRecord[],
  options?: RankingOptions,
): readonly MemoryScore[] => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const scored: MemoryScore[] = records.map((record) => {
    const relevance = calculateRelevance(record);
    const importance = calculateImportance(record);
    const recency = calculateRecency(record, opts.now);
    const sourcePriority = calculateSourcePriority(record);

    const score =
      relevance * opts.relevanceWeight +
      importance * opts.importanceWeight +
      recency * opts.recencyWeight +
      sourcePriority * opts.sourcePriorityWeight;

    return {
      record,
      score,
      components: { relevance, importance, recency, sourcePriority },
    };
  });

  return scored
    .filter((s) => s.score >= (opts.minScore ?? 0))
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.maxResults);
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Cosine similarity between two vectors.
 */
export const cosineSimilarity = (a: readonly number[], b: readonly number[]): number => {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions mismatch: ${a.length} vs ${b.length}`);
  }
  if (a.length === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] as number;
    const bVal = b[i] as number;
    dot += aVal * bVal;
    magA += aVal * aVal;
    magB += bVal * bVal;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
};

/**
 * Deduplicate scores by record ID, keeping the higher score.
 */
export const deduplicateScores = (scores: readonly MemoryScore[]): readonly MemoryScore[] => {
  const seen = new Map<string, MemoryScore>();
  for (const s of scores) {
    const existing = seen.get(s.record.id);
    if (existing === undefined || s.score > existing.score) {
      seen.set(s.record.id, s);
    }
  }
  const result = Array.from(seen.values());
  return result.sort((a, b) => b.score - a.score);
};
