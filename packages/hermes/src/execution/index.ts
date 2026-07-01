/**
 * @agent-os/hermes/execution — Agent Execution Loop
 *
 * The execution loop is the ONLY component responsible for orchestrating
 * execution. It consumes plans from the Planning Engine, retrieves context
 * from the Memory Manager, executes tools through the Tool Executor, and
 * observes results.
 *
 * Layer: 4 (Application)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  ExecutionIds,
  ExecutionStatus,
  ExecutionStepState,
  ExecutionStepResult,
  ExecutionResult,
  ExecutionCheckpoint,
  ExecutionStatistics,
  ExecutionPolicy,
  RetryPolicy,
  ExecutionContext,
  ExecutionSummary,
  ExecutionEvent,
  ExecutionEventHandler,
  ExecutionEventBase,
  ExecutionStartedEvent,
  ExecutionProgressEvent,
  ExecutionPausedEvent,
  ExecutionResumedEvent,
  ExecutionCompletedEvent,
  ExecutionFailedEvent,
  ExecutionCancelledEvent,
  StepStartedEvent,
  StepCompletedEvent,
  StepFailedEvent,
  RetryStartedEvent,
  RetryCompletedEvent,
  CheckpointCreatedEvent,
  CurrentStepChangedEvent,
} from './ExecutionTypes.js';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export {
  ExecutionError,
  ExecutionNotFoundError,
  ExecutionFailedError,
  ExecutionCancelledError,
  ExecutionTimeoutError,
  ExecutionPolicyViolationError,
  StepFailedError,
  StepTimeoutError,
  StepValidationError,
  RetryExhaustedError,
  CheckpointFailedError,
  InvalidStateTransitionError,
  PlanInvalidError,
  isExecutionError,
} from './ExecutionErrors.js';
export type { ExecutionErrorCode } from './ExecutionErrors.js';

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

export {
  ExecutionStateMachine,
  getValidTransitions,
  getValidStepTransitions,
  isTerminalStatus,
} from './ExecutionState.js';

// ---------------------------------------------------------------------------
// Checkpoint
// ---------------------------------------------------------------------------

export {
  createCheckpoint,
  validateCheckpoint,
  getCheckpointProgress,
  createInitialCheckpoint,
} from './ExecutionCheckpoint.js';

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export { ExecutionHistory } from './ExecutionHistory.js';
export type { ExecutionHistoryEntry } from './ExecutionHistory.js';

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export {
  DEFAULT_EXECUTION_POLICY,
  DEFAULT_RETRY_POLICY,
  NO_RETRY_POLICY,
  FIXED_RETRY_POLICY,
  mergeExecutionPolicies,
  mergeRetryPolicies,
  isRetryable,
  calculateRetryDelay,
} from './ExecutionPolicy.js';

// ---------------------------------------------------------------------------
// Retry
// ---------------------------------------------------------------------------

export { RetryManager } from './ExecutionRetry.js';
export type { RetryState } from './ExecutionRetry.js';

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export { ExecutionEventEmitter } from './ExecutionEvents.js';
export {
  executionStarted,
  executionProgress,
  executionPaused,
  executionResumed,
  executionCompleted,
  executionFailed,
  executionCancelled,
  stepStarted,
  stepCompleted,
  stepFailed,
  retryStarted,
  retryCompleted,
  checkpointCreated,
  currentStepChanged,
} from './ExecutionEvents.js';

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

export {
  validatePlanForExecution,
  validateStateTransition,
  validateStepOrdering,
  validateCheckpointIntegrity,
  validateCancellation,
} from './ExecutionValidator.js';
export type { ValidationResult } from './ExecutionValidator.js';

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

export {
  serializeCheckpoint,
  deserializeExecution,
  serializeStepResult,
  deserializeStepResult,
  validateSerialized,
} from './ExecutionSerializer.js';
export type { SerializedExecution, SerializedStepResult } from './ExecutionSerializer.js';

// ---------------------------------------------------------------------------
// Execution context
// ---------------------------------------------------------------------------

export { ExecutionContext as ExecutionState } from './ExecutionContext.js';

// ---------------------------------------------------------------------------
// Execution loop
// ---------------------------------------------------------------------------

export { ExecutionLoop } from './ExecutionLoop.js';
export type { StepExecutor, ReplanCallback } from './ExecutionLoop.js';

// ---------------------------------------------------------------------------
// Execution engine
// ---------------------------------------------------------------------------

export { ExecutionEngine } from './ExecutionEngine.js';
export type {
  ExecutionEngineOptions,
  PlanningFunction,
  MemoryFunction,
} from './ExecutionEngine.js';
