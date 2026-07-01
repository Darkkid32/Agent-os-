/**
 * Memory context for planner integration.
 *
 * Provides the planner with a structured view of relevant memories
 * without exposing storage internals.
 *
 * Layer: 2 (Platform)
 */

import type { MemoryRecord, MemoryScore, MemoryRetrievalContext } from './MemoryTypes.js';

// ---------------------------------------------------------------------------
// MemoryContext
// ---------------------------------------------------------------------------

/**
 * Context object that provides the planner with memory-augmented awareness.
 * The planner never queries storage directly — it receives this context.
 */
export class MemoryContext {
  private context: MemoryRetrievalContext;

  constructor(query: string, scores: readonly MemoryScore[], durationMs: number) {
    this.context = {
      memories: scores.map((s) => s.record),
      scores,
      query,
      durationMs,
    };
  }

  /**
   * Get all retrieved memories.
   */
  public getMemories(): readonly MemoryRecord[] {
    return this.context.memories;
  }

  /**
   * Get ranked scores.
   */
  public getScores(): readonly MemoryScore[] {
    return this.context.scores;
  }

  /**
   * Get the original query.
   */
  public getQuery(): string {
    return this.context.query;
  }

  /**
   * Get retrieval duration in ms.
   */
  public getDurationMs(): number {
    return this.context.durationMs;
  }

  /**
   * Get top N memories by score.
   */
  public getTopMemories(n: number): readonly MemoryRecord[] {
    return this.context.scores.slice(0, n).map((s) => s.record);
  }

  /**
   * Get memories filtered by scope.
   */
  public getMemoriesByScope(scope: string): readonly MemoryRecord[] {
    return this.context.memories.filter((m) => m.scope === scope);
  }

  /**
   * Get memories filtered by plugin.
   */
  public getMemoriesByPlugin(pluginId: string): readonly MemoryRecord[] {
    return this.context.memories.filter((m) => m.source.pluginId === pluginId);
  }

  /**
   * Get a summary of the context.
   */
  public getSummary(): {
    readonly query: string;
    readonly totalMemories: number;
    readonly durationMs: number;
    readonly topScore: number | undefined;
    readonly scopes: readonly string[];
  } {
    const scopes = [...new Set(this.context.memories.map((m) => m.scope))];
    return {
      query: this.context.query,
      totalMemories: this.context.memories.length,
      durationMs: this.context.durationMs,
      topScore: this.context.scores[0]?.score,
      scopes,
    };
  }

  /**
   * Convert to the raw retrieval context.
   */
  public toRetrievalContext(): MemoryRetrievalContext {
    return this.context;
  }

  /**
   * Create an empty context.
   */
  public static empty(query: string): MemoryContext {
    return new MemoryContext(query, [], 0);
  }
}
