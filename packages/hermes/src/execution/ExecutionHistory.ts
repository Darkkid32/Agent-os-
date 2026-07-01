/**
 * Execution history tracking.
 *
 * Records all execution steps and results for debugging and analysis.
 *
 * Layer: 4 (Application)
 */

import type {
  ExecutionStepResult,
  ExecutionStatistics,
  ExecutionStatus,
} from './ExecutionTypes.js';

// ---------------------------------------------------------------------------
// History entry
// ---------------------------------------------------------------------------

export interface ExecutionHistoryEntry {
  /** Timestamp */
  readonly timestamp: string;

  /** Event type */
  readonly eventType: string;

  /** Step ID (if applicable) */
  readonly stepId?: string;

  /** Data payload */
  readonly data: Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Execution history
// ---------------------------------------------------------------------------

/**
 * Records execution history for debugging and analysis.
 */
export class ExecutionHistory {
  private readonly entries: ExecutionHistoryEntry[] = [];
  private readonly stepResults = new Map<string, ExecutionStepResult>();
  private startTime: number = 0;
  private endTime: number = 0;

  /**
   * Start tracking execution.
   */
  public start(): void {
    this.startTime = Date.now();
    this.addEntry('execution.started', {});
  }

  /**
   * Record a step starting.
   */
  public stepStarted(stepId: string, stepIndex: number): void {
    this.addEntry('step.started', { stepId, stepIndex });
  }

  /**
   * Record a step completing.
   */
  public stepCompleted(result: ExecutionStepResult): void {
    this.stepResults.set(result.stepId, result);
    this.addEntry('step.completed', {
      stepId: result.stepId,
      success: result.success,
      durationMs: result.durationMs,
    });
  }

  /**
   * Record a retry attempt.
   */
  public retryAttempt(stepId: string, attempt: number, delayMs: number): void {
    this.addEntry('retry.attempt', { stepId, attempt, delayMs });
  }

  /**
   * Record execution completion.
   */
  public complete(status: ExecutionStatus, error?: string): void {
    this.endTime = Date.now();
    this.addEntry('execution.completed', { status, error });
  }

  /**
   * Record a replanning request.
   */
  public replanRequested(reason: string): void {
    this.addEntry('execution.replan', { reason });
  }

  /**
   * Get all history entries.
   */
  public getEntries(): readonly ExecutionHistoryEntry[] {
    return this.entries;
  }

  /**
   * Get entries for a specific step.
   */
  public getStepEntries(stepId: string): readonly ExecutionHistoryEntry[] {
    return this.entries.filter((e) => e.data['stepId'] === stepId);
  }

  /**
   * Get step results.
   */
  public getStepResults(): readonly ExecutionStepResult[] {
    return Array.from(this.stepResults.values());
  }

  /**
   * Get step result for a specific step.
   */
  public getStepResult(stepId: string): ExecutionStepResult | undefined {
    return this.stepResults.get(stepId);
  }

  /**
   * Calculate execution statistics.
   */
  public getStatistics(): ExecutionStatistics {
    const results = Array.from(this.stepResults.values());
    const stepDurations: Record<string, number> = {};
    for (const r of results) {
      stepDurations[r.stepId] = r.durationMs;
    }

    return {
      stepsCompleted: results.filter((r) => r.success).length,
      stepsFailed: results.filter((r) => !r.success).length,
      stepsSkipped: 0,
      retryAttempts: results.reduce((sum, r) => sum + r.retryAttempts, 0),
      durationMs: this.endTime > 0 ? this.endTime - this.startTime : Date.now() - this.startTime,
      stepDurations,
    };
  }

  /**
   * Get execution duration in ms.
   */
  public getDurationMs(): number {
    if (this.endTime > 0) return this.endTime - this.startTime;
    return Date.now() - this.startTime;
  }

  /**
   * Clear history.
   */
  public clear(): void {
    this.entries.length = 0;
    this.stepResults.clear();
    this.startTime = 0;
    this.endTime = 0;
  }

  private addEntry(eventType: string, data: Readonly<Record<string, unknown>>): void {
    this.entries.push({
      timestamp: new Date().toISOString(),
      eventType,
      data,
      ...(data['stepId'] !== undefined ? { stepId: data['stepId'] as string } : {}),
    });
  }
}
