/**
 * Execution state machine.
 *
 * Manages state transitions and validates transitions.
 *
 * Layer: 4 (Application)
 */

import type { ExecutionStatus, ExecutionStepState } from './ExecutionTypes.js';
import { InvalidStateTransitionError } from './ExecutionErrors.js';

// ---------------------------------------------------------------------------
// Valid transitions
// ---------------------------------------------------------------------------

/**
 * Valid state transitions for execution.
 */
const VALID_EXECUTION_TRANSITIONS: Readonly<Record<ExecutionStatus, readonly ExecutionStatus[]>> = {
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

/**
 * Valid state transitions for execution steps.
 */
const VALID_STEP_TRANSITIONS: Readonly<Record<ExecutionStepState, readonly ExecutionStepState[]>> =
  {
    pending: ['running', 'skipped'],
    running: ['completed', 'failed', 'retrying', 'waiting', 'skipped'],
    completed: [],
    failed: ['retrying'],
    skipped: [],
    retrying: ['running', 'failed'],
    waiting: ['running', 'failed'],
  };

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

/**
 * Manages execution state transitions.
 */
export class ExecutionStateMachine {
  private currentStatus: ExecutionStatus = 'pending';
  private readonly stepStates = new Map<string, ExecutionStepState>();

  /**
   * Get the current execution status.
   */
  public getStatus(): ExecutionStatus {
    return this.currentStatus;
  }

  /**
   * Transition the execution to a new status.
   * Throws InvalidStateTransitionError if the transition is not allowed.
   */
  public transition(to: ExecutionStatus): void {
    const allowed = VALID_EXECUTION_TRANSITIONS[this.currentStatus];
    if (!allowed.includes(to)) {
      throw new InvalidStateTransitionError(this.currentStatus, to);
    }
    this.currentStatus = to;
  }

  /**
   * Check if a transition is valid without performing it.
   */
  public canTransition(to: ExecutionStatus): boolean {
    const allowed = VALID_EXECUTION_TRANSITIONS[this.currentStatus];
    return allowed.includes(to);
  }

  /**
   * Get the current step state.
   */
  public getStepState(stepId: string): ExecutionStepState {
    return this.stepStates.get(stepId) ?? 'pending';
  }

  /**
   * Set the state of a step.
   */
  public setStepState(stepId: string, state: ExecutionStepState): void {
    const current = this.getStepState(stepId);
    const allowed = VALID_STEP_TRANSITIONS[current];
    if (!allowed.includes(state)) {
      throw new InvalidStateTransitionError(`step:${current}`, `step:${state}`);
    }
    this.stepStates.set(stepId, state);
  }

  /**
   * Check if a step transition is valid.
   */
  public canStepTransition(stepId: string, to: ExecutionStepState): boolean {
    const current = this.getStepState(stepId);
    const allowed = VALID_STEP_TRANSITIONS[current];
    return allowed.includes(to);
  }

  /**
   * Check if the execution is terminal (completed, cancelled, or failed).
   */
  public isTerminal(): boolean {
    return (
      this.currentStatus === 'completed' ||
      this.currentStatus === 'cancelled' ||
      this.currentStatus === 'failed'
    );
  }

  /**
   * Check if the execution can accept cancellation.
   */
  public canCancel(): boolean {
    return (
      this.currentStatus !== 'completed' &&
      this.currentStatus !== 'cancelled' &&
      this.currentStatus !== 'failed'
    );
  }

  /**
   * Check if the execution can be paused.
   */
  public canPause(): boolean {
    return this.currentStatus === 'running';
  }

  /**
   * Check if the execution can be resumed.
   */
  public canResume(): boolean {
    return this.currentStatus === 'paused';
  }

  /**
   * Reset the state machine to pending.
   */
  public reset(): void {
    this.currentStatus = 'pending';
    this.stepStates.clear();
  }
}

// ---------------------------------------------------------------------------
// State transition helper
// ---------------------------------------------------------------------------

/**
 * Get valid transitions from a given status.
 */
export const getValidTransitions = (status: ExecutionStatus): readonly ExecutionStatus[] =>
  VALID_EXECUTION_TRANSITIONS[status];

/**
 * Get valid step transitions from a given state.
 */
export const getValidStepTransitions = (state: ExecutionStepState): readonly ExecutionStepState[] =>
  VALID_STEP_TRANSITIONS[state];

/**
 * Check if a status is terminal.
 */
export const isTerminalStatus = (status: ExecutionStatus): boolean =>
  status === 'completed' || status === 'cancelled' || status === 'failed';
