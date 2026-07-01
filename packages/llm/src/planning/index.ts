/**
 * Planning engine barrel export.
 *
 * Layer: 2 (Platform)
 */

// Types
export type {
  PlanStatus,
  PlanPriority,
  ComplexityLevel,
  RiskLevel,
  PlanningStrategyType,
  PlanGoal,
  PlanConstraint,
  PlanStep,
  PlanDependency,
  PlanResult,
  PlanningRequest,
  PlanningResponse,
  PlanningEventBase,
  PlanningStartedEvent,
  PlanCreatedEvent,
  PlanValidatedEvent,
  PlanRejectedEvent,
  PlanningCompletedEvent,
  PlanningFailedEvent,
  PlanningEvent,
  PlanningEventHandler,
} from './types.js';

// Errors
export {
  type PlanningErrorCode,
  PlanningError,
  PlanningFailedError,
  InvalidGoalError,
  NoToolsAvailableError,
  StrategyNotSupportedError,
  MaxStepsExceededError,
  PlanValidationError,
  CycleDetectedError,
  MissingDependencyError,
  DuplicateStepIdError,
  EmptyPlanError,
  ToolNotFoundError,
  InvalidDependencyError,
  isPlanningError,
} from './PlanningErrors.js';

// Context
export type { PlanningContext } from './PlanningContext.js';
export { createPlanningContext, getToolsForPlugins, findToolById } from './PlanningContext.js';

// Strategies
export type { PlanningStrategy } from './PlanningStrategy.js';
export {
  SequentialStrategy,
  ParallelStrategy,
  ConditionalStrategy,
  getStrategy,
  registerStrategy,
  listStrategies,
  hasStrategy,
} from './PlanningStrategy.js';

// Validation
export type { PlanningValidationResult } from './PlanningValidator.js';
export {
  validateNoDuplicateIds,
  validateDependenciesExist,
  validateNoCycles,
  validateToolsExist,
  validateNotEmpty,
  validateStepFields,
  validatePlan,
} from './PlanningValidator.js';

// Serialization
export type {
  SerializedPlan,
  SerializedGoal,
  SerializedStep,
  SerializedDependency,
  SerializedConstraint,
} from './PlanSerializer.js';
export { serializePlan, deserializePlan, planToJSON, planFromJSON } from './PlanSerializer.js';

// Prompt
export { buildSystemPrompt, buildUserPrompt, buildReplanPrompt } from './PlanningPrompt.js';

// Planner interface
export type { Planner, PlanningValidation, ReplanInput } from './Planner.js';

// Planning engine
export { PlanningEngine } from './PlanningEngine.js';
