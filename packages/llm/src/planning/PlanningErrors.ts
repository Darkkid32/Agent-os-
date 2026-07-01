/**
 * Planning-specific error classes.
 *
 * Extends Error with planning-specific error codes.
 * NOT part of the LLMError or ToolError hierarchy.
 *
 * Layer: 2 (Platform)
 */

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export type PlanningErrorCode =
  | 'PLANNING_FAILED'
  | 'INVALID_GOAL'
  | 'NO_TOOLS_AVAILABLE'
  | 'STRATEGY_NOT_SUPPORTED'
  | 'MAX_STEPS_EXCEEDED'
  | 'VALIDATION_FAILED'
  | 'CYCLE_DETECTED'
  | 'MISSING_DEPENDENCY'
  | 'DUPLICATE_STEP_ID'
  | 'EMPTY_PLAN'
  | 'TOOL_NOT_FOUND'
  | 'INVALID_DEPENDENCY';

// ---------------------------------------------------------------------------
// Base planning error
// ---------------------------------------------------------------------------

/**
 * Abstract base for all planning-related errors.
 */
export abstract class PlanningError extends Error {
  public readonly code: PlanningErrorCode;

  protected constructor(
    code: PlanningErrorCode,
    message: string,
    options?: { readonly cause?: unknown },
  ) {
    super(message, options);
    this.code = code;
    this.name = 'PlanningError';
  }
}

// ---------------------------------------------------------------------------
// Concrete errors
// ---------------------------------------------------------------------------

export class PlanningFailedError extends PlanningError {
  public constructor(message: string, options?: { readonly cause?: unknown }) {
    super('PLANNING_FAILED', message, options);
    this.name = 'PlanningFailedError';
  }
}

export class InvalidGoalError extends PlanningError {
  public constructor(message: string) {
    super('INVALID_GOAL', message);
    this.name = 'InvalidGoalError';
  }
}

export class NoToolsAvailableError extends PlanningError {
  public constructor() {
    super('NO_TOOLS_AVAILABLE', 'No tools are available for planning.');
    this.name = 'NoToolsAvailableError';
  }
}

export class StrategyNotSupportedError extends PlanningError {
  public constructor(strategy: string) {
    super('STRATEGY_NOT_SUPPORTED', `Planning strategy "${strategy}" is not supported.`);
    this.name = 'StrategyNotSupportedError';
  }
}

export class MaxStepsExceededError extends PlanningError {
  public constructor(max: number) {
    super('MAX_STEPS_EXCEEDED', `Plan exceeds maximum allowed steps (${max}).`);
    this.name = 'MaxStepsExceededError';
  }
}

export class PlanValidationError extends PlanningError {
  public readonly validationErrors: readonly string[];

  public constructor(errors: readonly string[]) {
    super('VALIDATION_FAILED', `Plan validation failed: ${errors.join('; ')}`);
    this.validationErrors = errors;
    this.name = 'PlanValidationError';
  }
}

export class CycleDetectedError extends PlanningError {
  public readonly cycle: readonly string[];

  public constructor(cycle: readonly string[]) {
    super('CYCLE_DETECTED', `Dependency cycle detected: ${cycle.join(' -> ')}`);
    this.cycle = cycle;
    this.name = 'CycleDetectedError';
  }
}

export class MissingDependencyError extends PlanningError {
  public constructor(stepId: string, missingId: string) {
    super('MISSING_DEPENDENCY', `Step "${stepId}" depends on unknown step "${missingId}".`);
    this.name = 'MissingDependencyError';
  }
}

export class DuplicateStepIdError extends PlanningError {
  public constructor(stepId: string) {
    super('DUPLICATE_STEP_ID', `Duplicate step ID: "${stepId}".`);
    this.name = 'DuplicateStepIdError';
  }
}

export class EmptyPlanError extends PlanningError {
  public constructor() {
    super('EMPTY_PLAN', 'Generated plan has no steps.');
    this.name = 'EmptyPlanError';
  }
}

export class ToolNotFoundError extends PlanningError {
  public constructor(toolId: string) {
    super('TOOL_NOT_FOUND', `Plan references unknown tool "${toolId}".`);
    this.name = 'ToolNotFoundError';
  }
}

export class InvalidDependencyError extends PlanningError {
  public constructor(stepId: string, message: string) {
    super('INVALID_DEPENDENCY', `Invalid dependency for step "${stepId}": ${message}`);
    this.name = 'InvalidDependencyError';
  }
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

/**
 * Check if an error is a PlanningError.
 */
export const isPlanningError = (e: unknown): e is PlanningError => e instanceof PlanningError;
