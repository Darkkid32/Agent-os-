/**
 * Execution retry logic.
 *
 * Manages retry attempts for failed steps.
 *
 * Layer: 4 (Application)
 */

import type { RetryPolicy } from './ExecutionTypes.js';
import { isRetryable, calculateRetryDelay } from './ExecutionPolicy.js';

// ---------------------------------------------------------------------------
// Retry state
// ---------------------------------------------------------------------------

export interface RetryState {
  /** Step ID */
  readonly stepId: string;

  /** Current attempt number */
  readonly attempt: number;

  /** Maximum attempts */
  readonly maxAttempts: number;

  /** Whether retry is exhausted */
  readonly exhausted: boolean;

  /** Next retry delay in ms */
  readonly nextDelayMs: number;
}

// ---------------------------------------------------------------------------
// Retry manager
// ---------------------------------------------------------------------------

/**
 * Manages retry attempts for failed steps.
 */
export class RetryManager {
  private readonly retryStates = new Map<string, RetryState>();
  private readonly retryPolicy: RetryPolicy;

  constructor(retryPolicy: RetryPolicy) {
    this.retryPolicy = retryPolicy;
  }

  /**
   * Check if a failed step should be retried.
   */
  public shouldRetry(stepId: string, errorCode: string | undefined): boolean {
    if (this.retryPolicy.strategy === 'none') return false;

    const state = this.retryStates.get(stepId);
    const attempt = (state?.attempt ?? 0) + 1;

    if (attempt > this.retryPolicy.maxAttempts) return false;

    return isRetryable(errorCode, this.retryPolicy);
  }

  /**
   * Record a retry attempt and get the delay.
   */
  public recordAttempt(stepId: string): {
    readonly delayMs: number;
    readonly attempt: number;
    readonly exhausted: boolean;
  } {
    const state = this.retryStates.get(stepId);
    const attempt = (state?.attempt ?? 0) + 1;
    const exhausted = attempt >= this.retryPolicy.maxAttempts;
    const delayMs = calculateRetryDelay(attempt, this.retryPolicy);

    const newState: RetryState = {
      stepId,
      attempt,
      maxAttempts: this.retryPolicy.maxAttempts,
      exhausted,
      nextDelayMs: calculateRetryDelay(attempt + 1, this.retryPolicy),
    };

    this.retryStates.set(stepId, newState);

    return { delayMs, attempt, exhausted };
  }

  /**
   * Get the retry state for a step.
   */
  public getState(stepId: string): RetryState | undefined {
    return this.retryStates.get(stepId);
  }

  /**
   * Get the retry policy.
   */
  public getPolicy(): RetryPolicy {
    return this.retryPolicy;
  }

  /**
   * Reset retry state for a step.
   */
  public reset(stepId: string): void {
    this.retryStates.delete(stepId);
  }

  /**
   * Reset all retry states.
   */
  public resetAll(): void {
    this.retryStates.clear();
  }

  /**
   * Get total retry attempts across all steps.
   */
  public getTotalAttempts(): number {
    let total = 0;
    for (const state of this.retryStates.values()) {
      total += state.attempt;
    }
    return total;
  }
}
