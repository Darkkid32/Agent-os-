/**
 * Core planner interface.
 *
 * The planner transforms a goal into a structured plan.
 * It NEVER executes tools — it only reasons and produces plans.
 *
 * Layer: 2 (Platform)
 */

import type { ToolDefinition } from '../tools/types.js';
import type { PlanResult, PlanningRequest, PlanningResponse } from './types.js';

// ---------------------------------------------------------------------------
// Planner interface
// ---------------------------------------------------------------------------

/**
 * The planner's contract. Implementations may use an LLM,
 * rule-based logic, or hybrid approaches.
 */
export interface Planner {
  /**
   * Generate a plan from a planning request.
   */
  plan(request: PlanningRequest): Promise<PlanningResponse>;

  /**
   * Validate an existing plan without modifying it.
   */
  validate(plan: PlanResult): PlanningValidation;

  /**
   * Re-plan after a failure, given the original goal and execution state.
   */
  replan(input: ReplanInput): Promise<PlanningResponse>;
}

// ---------------------------------------------------------------------------
// Planning validation
// ---------------------------------------------------------------------------

export interface PlanningValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

// ---------------------------------------------------------------------------
// Replan input
// ---------------------------------------------------------------------------

export interface ReplanInput {
  /** Original goal */
  readonly goal: string;

  /** The step that failed */
  readonly failedStep: string;

  /** Error message from the failure */
  readonly error: string;

  /** Steps that completed successfully */
  readonly completedSteps: readonly string[];

  /** Steps that haven't run yet */
  readonly remainingSteps: readonly string[];

  /** Available tools */
  readonly availableTools: readonly ToolDefinition[];

  /** Available plugins */
  readonly availablePlugins?: readonly string[];
}
