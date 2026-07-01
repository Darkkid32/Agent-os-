/**
 * Execution checkpoint management.
 *
 * Creates and manages checkpoints after every completed step.
 *
 * Layer: 4 (Application)
 */

import type {
  ExecutionIds,
  ExecutionCheckpoint,
  ExecutionStepResult,
  ExecutionStatistics,
  ExecutionStatus,
} from './ExecutionTypes.js';

// ---------------------------------------------------------------------------
// Checkpoint ID generator
// ---------------------------------------------------------------------------

let checkpointCounter = 0;

const generateCheckpointId = (): string => {
  checkpointCounter += 1;
  return `ckpt_${Date.now()}_${checkpointCounter}`;
};

// ---------------------------------------------------------------------------
// Create checkpoint
// ---------------------------------------------------------------------------

/**
 * Create a checkpoint from the current execution state.
 */
export const createCheckpoint = (
  ids: ExecutionIds,
  currentStepId: string,
  completedStepIds: readonly string[],
  remainingStepIds: readonly string[],
  status: ExecutionStatus,
  stepResults: readonly ExecutionStepResult[],
  statistics: ExecutionStatistics,
): ExecutionCheckpoint => ({
  id: generateCheckpointId(),
  ids,
  currentStepId,
  completedStepIds,
  remainingStepIds,
  status,
  stepResults,
  statistics,
  timestamp: new Date().toISOString(),
});

// ---------------------------------------------------------------------------
// Checkpoint validation
// ---------------------------------------------------------------------------

/**
 * Validate a checkpoint's integrity.
 */
export const validateCheckpoint = (
  checkpoint: ExecutionCheckpoint,
): {
  readonly valid: boolean;
  readonly errors: readonly string[];
} => {
  const errors: string[] = [];

  if (checkpoint.id.length === 0) {
    errors.push('Checkpoint ID is required');
  }

  if (checkpoint.currentStepId.length === 0) {
    errors.push('Current step ID is required');
  }

  if (checkpoint.completedStepIds.includes(checkpoint.currentStepId)) {
    errors.push('Current step is already in completed list');
  }

  if (checkpoint.statistics.stepsCompleted !== checkpoint.completedStepIds.length) {
    errors.push('Statistics stepsCompleted does not match completedStepIds count');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ---------------------------------------------------------------------------
// Checkpoint utilities
// ---------------------------------------------------------------------------

/**
 * Get progress from a checkpoint.
 */
export const getCheckpointProgress = (
  checkpoint: ExecutionCheckpoint,
): {
  readonly completed: number;
  readonly remaining: number;
  readonly total: number;
  readonly percentage: number;
} => {
  const completed = checkpoint.completedStepIds.length;
  const remaining = checkpoint.remainingStepIds.length;
  const total = completed + remaining + 1; // +1 for current step
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, remaining, total, percentage };
};

/**
 * Create initial checkpoint for a new execution.
 */
export const createInitialCheckpoint = (
  ids: ExecutionIds,
  stepIds: readonly string[],
): ExecutionCheckpoint => {
  const [first, ...rest] = stepIds;
  return createCheckpoint(ids, first ?? '', [], rest, 'pending', [], {
    stepsCompleted: 0,
    stepsFailed: 0,
    stepsSkipped: 0,
    retryAttempts: 0,
    durationMs: 0,
    stepDurations: {},
  });
};
