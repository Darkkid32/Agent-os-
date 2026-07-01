/**
 * Execution-specific error classes.
 *
 * Layer: 4 (Application)
 */

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export type ExecutionErrorCode =
  | 'EXECUTION_NOT_FOUND'
  | 'EXECUTION_FAILED'
  | 'EXECUTION_CANCELLED'
  | 'EXECUTION_TIMEOUT'
  | 'EXECUTION_POLICY_VIOLATION'
  | 'STEP_FAILED'
  | 'STEP_TIMEOUT'
  | 'STEP_VALIDATION_FAILED'
  | 'RETRY_EXHAUSTED'
  | 'CHECKPOINT_FAILED'
  | 'INVALID_STATE_TRANSITION'
  | 'PLAN_INVALID';

// ---------------------------------------------------------------------------
// Base execution error
// ---------------------------------------------------------------------------

/**
 * Abstract base for all execution-related errors.
 */
export abstract class ExecutionError extends Error {
  public readonly code: ExecutionErrorCode;

  protected constructor(
    code: ExecutionErrorCode,
    message: string,
    options?: { readonly cause?: unknown },
  ) {
    super(message, options);
    this.code = code;
    this.name = 'ExecutionError';
  }
}

// ---------------------------------------------------------------------------
// Concrete errors
// ---------------------------------------------------------------------------

export class ExecutionNotFoundError extends ExecutionError {
  public constructor(executionId: string) {
    super('EXECUTION_NOT_FOUND', `Execution "${executionId}" not found.`);
    this.name = 'ExecutionNotFoundError';
  }
}

export class ExecutionFailedError extends ExecutionError {
  public constructor(message: string, options?: { readonly cause?: unknown }) {
    super('EXECUTION_FAILED', message, options);
    this.name = 'ExecutionFailedError';
  }
}

export class ExecutionCancelledError extends ExecutionError {
  public constructor(reason: string) {
    super('EXECUTION_CANCELLED', `Execution cancelled: ${reason}`);
    this.name = 'ExecutionCancelledError';
  }
}

export class ExecutionTimeoutError extends ExecutionError {
  public constructor(executionId: string, timeoutMs: number) {
    super('EXECUTION_TIMEOUT', `Execution "${executionId}" timed out after ${timeoutMs}ms.`);
    this.name = 'ExecutionTimeoutError';
  }
}

export class ExecutionPolicyViolationError extends ExecutionError {
  public constructor(policy: string, message: string) {
    super('EXECUTION_POLICY_VIOLATION', `Policy "${policy}" violation: ${message}`);
    this.name = 'ExecutionPolicyViolationError';
  }
}

export class StepFailedError extends ExecutionError {
  public readonly stepId: string;

  public constructor(stepId: string, message: string, options?: { readonly cause?: unknown }) {
    super('STEP_FAILED', `Step "${stepId}" failed: ${message}`, options);
    this.stepId = stepId;
    this.name = 'StepFailedError';
  }
}

export class StepTimeoutError extends ExecutionError {
  public constructor(stepId: string, timeoutMs: number) {
    super('STEP_TIMEOUT', `Step "${stepId}" timed out after ${timeoutMs}ms.`);
    this.name = 'StepTimeoutError';
  }
}

export class StepValidationError extends ExecutionError {
  public readonly validationErrors: readonly string[];

  public constructor(stepId: string, errors: readonly string[]) {
    super('STEP_VALIDATION_FAILED', `Step "${stepId}" validation failed: ${errors.join('; ')}`);
    this.validationErrors = errors;
    this.name = 'StepValidationError';
  }
}

export class RetryExhaustedError extends ExecutionError {
  public constructor(stepId: string, attempts: number) {
    super('RETRY_EXHAUSTED', `Retry exhausted for step "${stepId}" after ${attempts} attempts.`);
    this.name = 'RetryExhaustedError';
  }
}

export class CheckpointFailedError extends ExecutionError {
  public constructor(message: string, options?: { readonly cause?: unknown }) {
    super('CHECKPOINT_FAILED', message, options);
    this.name = 'CheckpointFailedError';
  }
}

export class InvalidStateTransitionError extends ExecutionError {
  public constructor(from: string, to: string) {
    super('INVALID_STATE_TRANSITION', `Cannot transition from "${from}" to "${to}".`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class PlanInvalidError extends ExecutionError {
  public constructor(message: string) {
    super('PLAN_INVALID', `Plan invalid: ${message}`);
    this.name = 'PlanInvalidError';
  }
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

/**
 * Check if an error is an ExecutionError.
 */
export const isExecutionError = (e: unknown): e is ExecutionError => e instanceof ExecutionError;
