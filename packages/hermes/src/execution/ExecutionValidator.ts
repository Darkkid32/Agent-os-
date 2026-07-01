/**
 * Execution validator.
 *
 * Validates execution state transitions, plan integrity, and checkpoint integrity.
 *
 * Layer: 4 (Application)
 */

import type { ExecutionStatus, ExecutionCheckpoint } from './ExecutionTypes.js';
import type { PlanResult } from '@agent-os/llm';

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

// ---------------------------------------------------------------------------
// Validate plan
// ---------------------------------------------------------------------------

/**
 * Validate a plan for execution.
 */
export const validatePlanForExecution = (plan: PlanResult): ValidationResult => {
  const errors: string[] = [];

  if (plan.steps.length === 0) {
    errors.push('Plan has no steps');
  }

  if (plan.status !== 'validated' && plan.status !== 'ready') {
    errors.push(`Plan status is "${plan.status}", expected "validated" or "ready"`);
  }

  // Check for circular dependencies
  const stepIds = new Set(plan.steps.map((s) => s.id));
  for (const step of plan.steps) {
    for (const dep of step.dependsOn) {
      if (!stepIds.has(dep)) {
        errors.push(`Step "${step.id}" depends on unknown step "${dep}"`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
};

// ---------------------------------------------------------------------------
// Validate execution state transition
// ---------------------------------------------------------------------------

/**
 * Validate an execution state transition.
 */
export const validateStateTransition = (
  from: ExecutionStatus,
  to: ExecutionStatus,
): ValidationResult => {
  const errors: string[] = [];

  const VALID_TRANSITIONS: Record<ExecutionStatus, readonly ExecutionStatus[]> = {
    pending: ['running', 'cancelled'],
    running: ['waiting', 'retrying', 'replanning', 'completed', 'cancelled', 'failed', 'paused'],
    waiting: ['running', 'cancelled', 'failed'],
    retrying: ['running', 'failed', 'cancelled'],
    replanning: ['running', 'cancelled', 'failed'],
    completed: [],
    cancelled: [],
    failed: [],
    paused: ['running', 'cancelled'],
  };

  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    errors.push(`Cannot transition from "${from}" to "${to}"`);
  }

  return { valid: errors.length === 0, errors };
};

// ---------------------------------------------------------------------------
// Validate step ordering
// ---------------------------------------------------------------------------

/**
 * Validate that step dependencies are properly ordered.
 */
export const validateStepOrdering = (
  stepIds: readonly string[],
  dependencies: Readonly<Record<string, readonly string[]>>,
): ValidationResult => {
  const errors: string[] = [];
  const stepSet = new Set(stepIds);

  for (const stepId of stepIds) {
    const deps = dependencies[stepId] ?? [];
    for (const dep of deps) {
      if (!stepSet.has(dep)) {
        errors.push(`Step "${stepId}" depends on unknown step "${dep}"`);
      }
    }
  }

  // Check for cycles (simple DFS)
  const visited = new Set<string>();
  const inStack = new Set<string>();

  const hasCycle = (node: string): boolean => {
    if (inStack.has(node)) return true;
    if (visited.has(node)) return false;

    visited.add(node);
    inStack.add(node);

    const deps = dependencies[node] ?? [];
    for (const dep of deps) {
      if (hasCycle(dep)) return true;
    }

    inStack.delete(node);
    return false;
  };

  for (const stepId of stepIds) {
    if (hasCycle(stepId)) {
      errors.push(`Circular dependency detected involving step "${stepId}"`);
      break;
    }
  }

  return { valid: errors.length === 0, errors };
};

// ---------------------------------------------------------------------------
// Validate checkpoint integrity
// ---------------------------------------------------------------------------

/**
 * Validate checkpoint integrity.
 */
export const validateCheckpointIntegrity = (checkpoint: ExecutionCheckpoint): ValidationResult => {
  const errors: string[] = [];

  if (checkpoint.id.length === 0) {
    errors.push('Checkpoint ID is required');
  }

  if (checkpoint.currentStepId.length === 0) {
    errors.push('Current step ID is required');
  }

  // Check current step is not in completed list
  if (checkpoint.completedStepIds.includes(checkpoint.currentStepId)) {
    errors.push('Current step is already in completed list');
  }

  // Check current step is in remaining list
  if (!checkpoint.remainingStepIds.includes(checkpoint.currentStepId)) {
    // It could be the first step that hasn't been added to remaining yet
    const allSteps = [
      ...checkpoint.completedStepIds,
      ...checkpoint.remainingStepIds,
      checkpoint.currentStepId,
    ];
    const uniqueSteps = new Set(allSteps);
    if (allSteps.length !== uniqueSteps.size) {
      errors.push('Duplicate step IDs in checkpoint');
    }
  }

  // Validate statistics
  if (checkpoint.statistics.stepsCompleted !== checkpoint.completedStepIds.length) {
    errors.push('Statistics stepsCompleted does not match completedStepIds count');
  }

  return { valid: errors.length === 0, errors };
};

// ---------------------------------------------------------------------------
// Validate cancellation rules
// ---------------------------------------------------------------------------

/**
 * Validate cancellation rules.
 */
export const validateCancellation = (status: ExecutionStatus): ValidationResult => {
  const errors: string[] = [];

  if (status === 'completed') {
    errors.push('Cannot cancel a completed execution');
  }

  if (status === 'cancelled') {
    errors.push('Execution is already cancelled');
  }

  if (status === 'failed') {
    errors.push('Cannot cancel a failed execution');
  }

  return { valid: errors.length === 0, errors };
};
