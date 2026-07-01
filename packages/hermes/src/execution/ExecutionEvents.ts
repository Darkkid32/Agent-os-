/**
 * Execution events — publish-subscribe for dashboard integration.
 *
 * Layer: 4 (Application)
 */

import type { ExecutionEvent, ExecutionEventHandler, ExecutionIds } from './ExecutionTypes.js';

// ---------------------------------------------------------------------------
// Event emitter
// ---------------------------------------------------------------------------

/**
 * Emits execution events to registered handlers.
 */
export class ExecutionEventEmitter {
  private readonly handlers: ExecutionEventHandler[] = [];

  /**
   * Subscribe to execution events.
   */
  public on(handler: ExecutionEventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const idx = this.handlers.indexOf(handler);
      if (idx >= 0) this.handlers.splice(idx, 1);
    };
  }

  /**
   * Emit an event to all handlers.
   */
  public emit(event: ExecutionEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors to avoid breaking execution
      }
    }
  }

  /**
   * Get the number of registered handlers.
   */
  public getHandlerCount(): number {
    return this.handlers.length;
  }

  /**
   * Clear all handlers.
   */
  public clear(): void {
    this.handlers.length = 0;
  }
}

// ---------------------------------------------------------------------------
// Event factory
// ---------------------------------------------------------------------------

/**
 * Create event base fields from execution IDs.
 */
const eventBase = (
  ids: ExecutionIds,
  timestamp: string = new Date().toISOString(),
): {
  executionId: string;
  goalId: string;
  planId: string;
  sessionId: string;
  correlationId: string;
  timestamp: string;
} => ({
  executionId: ids.executionId,
  goalId: ids.goalId,
  planId: ids.planId,
  sessionId: ids.sessionId,
  correlationId: ids.correlationId,
  timestamp,
});

/**
 * Create an ExecutionStarted event.
 */
export const executionStarted = (
  ids: ExecutionIds,
  goal: string,
  stepCount: number,
): ExecutionEvent => ({
  type: 'ExecutionStarted',
  ...eventBase(ids),
  goal,
  stepCount,
});

/**
 * Create an ExecutionProgress event.
 */
export const executionProgress = (
  ids: ExecutionIds,
  currentStep: string,
  completedSteps: number,
  totalSteps: number,
): ExecutionEvent => ({
  type: 'ExecutionProgress',
  ...eventBase(ids),
  currentStep,
  completedSteps,
  totalSteps,
});

/**
 * Create an ExecutionPaused event.
 */
export const executionPaused = (ids: ExecutionIds): ExecutionEvent => ({
  type: 'ExecutionPaused',
  ...eventBase(ids),
});

/**
 * Create an ExecutionResumed event.
 */
export const executionResumed = (ids: ExecutionIds): ExecutionEvent => ({
  type: 'ExecutionResumed',
  ...eventBase(ids),
});

/**
 * Create an ExecutionCompleted event.
 */
export const executionCompleted = (
  ids: ExecutionIds,
  durationMs: number,
  stepsCompleted: number,
  totalSteps: number,
  totalRetries: number,
): ExecutionEvent => ({
  type: 'ExecutionCompleted',
  ...eventBase(ids),
  durationMs,
  stepsCompleted,
  totalSteps,
  totalRetries,
});

/**
 * Create an ExecutionFailed event.
 */
export const executionFailed = (
  ids: ExecutionIds,
  error: string,
  durationMs: number,
  failedStep: string,
  errorCode?: string,
): ExecutionEvent => ({
  type: 'ExecutionFailed',
  ...eventBase(ids),
  error,
  durationMs,
  failedStep,
  ...(errorCode !== undefined ? { errorCode } : {}),
});

/**
 * Create an ExecutionCancelled event.
 */
export const executionCancelled = (
  ids: ExecutionIds,
  reason: string,
  stepsCompleted: number,
): ExecutionEvent => ({
  type: 'ExecutionCancelled',
  ...eventBase(ids),
  reason,
  stepsCompleted,
});

/**
 * Create a StepStarted event.
 */
export const stepStarted = (
  ids: ExecutionIds,
  stepId: string,
  stepTitle: string,
  stepIndex: number,
): ExecutionEvent => ({
  type: 'StepStarted',
  ...eventBase(ids),
  stepId,
  stepTitle,
  stepIndex,
});

/**
 * Create a StepCompleted event.
 */
export const stepCompleted = (
  ids: ExecutionIds,
  stepId: string,
  durationMs: number,
  success: boolean,
): ExecutionEvent => ({
  type: 'StepCompleted',
  ...eventBase(ids),
  stepId,
  durationMs,
  success,
});

/**
 * Create a StepFailed event.
 */
export const stepFailed = (
  ids: ExecutionIds,
  stepId: string,
  error: string,
  durationMs: number,
  errorCode?: string,
): ExecutionEvent => ({
  type: 'StepFailed',
  ...eventBase(ids),
  stepId,
  error,
  durationMs,
  ...(errorCode !== undefined ? { errorCode } : {}),
});

/**
 * Create a RetryStarted event.
 */
export const retryStarted = (
  ids: ExecutionIds,
  stepId: string,
  attempt: number,
  maxAttempts: number,
  delayMs: number,
): ExecutionEvent => ({
  type: 'RetryStarted',
  ...eventBase(ids),
  stepId,
  attempt,
  maxAttempts,
  delayMs,
});

/**
 * Create a RetryCompleted event.
 */
export const retryCompleted = (
  ids: ExecutionIds,
  stepId: string,
  attempt: number,
  success: boolean,
): ExecutionEvent => ({
  type: 'RetryCompleted',
  ...eventBase(ids),
  stepId,
  attempt,
  success,
});

/**
 * Create a CheckpointCreated event.
 */
export const checkpointCreated = (
  ids: ExecutionIds,
  checkpointId: string,
  completedSteps: number,
): ExecutionEvent => ({
  type: 'CheckpointCreated',
  ...eventBase(ids),
  checkpointId,
  completedSteps,
});

/**
 * Create a CurrentStepChanged event.
 */
export const currentStepChanged = (
  ids: ExecutionIds,
  previousStepId: string | undefined,
  currentStepId: string,
): ExecutionEvent => ({
  type: 'CurrentStepChanged',
  ...eventBase(ids),
  previousStepId,
  currentStepId,
});
