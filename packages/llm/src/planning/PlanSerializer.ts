/**
 * Plan serialization and deserialization.
 *
 * Converts plans to/from JSON-safe format for storage, transport,
 * and debugging. Preserves all plan structure.
 *
 * Layer: 2 (Platform)
 */

import type {
  PlanResult,
  PlanStep,
  PlanGoal,
  PlanConstraint,
  PlanDependency,
  PlanStatus,
  ComplexityLevel,
  RiskLevel,
  PlanningStrategyType,
} from './types.js';

// ---------------------------------------------------------------------------
// Serialized forms
// ---------------------------------------------------------------------------

export interface SerializedPlan {
  readonly id: string;
  readonly goal: SerializedGoal;
  readonly strategy: string;
  readonly steps: readonly SerializedStep[];
  readonly dependencies: readonly SerializedDependency[];
  readonly requiredTools: readonly string[];
  readonly expectedOutputs: readonly string[];
  readonly complexity: string;
  readonly risk: string;
  readonly constraints: readonly SerializedConstraint[];
  readonly status: string;
  readonly planningDurationMs: number;
  readonly reasoningSummary: string;
}

export interface SerializedGoal {
  readonly raw: string;
  readonly description: string;
  readonly objectives: readonly string[];
  readonly successCriteria?: string;
}

export interface SerializedStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly tool?: string;
  readonly arguments?: Record<string, unknown>;
  readonly dependsOn: readonly string[];
  readonly expectedResult: string;
  readonly status: string;
  readonly metadata?: Record<string, unknown>;
}

export interface SerializedDependency {
  readonly from: string;
  readonly to: string;
}

export interface SerializedConstraint {
  readonly id: string;
  readonly description: string;
  readonly type: string;
  readonly value?: string;
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Serialize a PlanResult to a JSON-safe format.
 */
export const serializePlan = (plan: PlanResult): SerializedPlan => ({
  id: plan.id,
  goal: serializeGoal(plan.goal),
  strategy: plan.strategy,
  steps: plan.steps.map(serializeStep),
  dependencies: plan.dependencies.map(serializeDependency),
  requiredTools: [...plan.requiredTools],
  expectedOutputs: [...plan.expectedOutputs],
  complexity: plan.complexity,
  risk: plan.risk,
  constraints: plan.constraints.map(serializeConstraint),
  status: plan.status,
  planningDurationMs: plan.planningDurationMs,
  reasoningSummary: plan.reasoningSummary,
});

const serializeGoal = (goal: PlanGoal): SerializedGoal => ({
  raw: goal.raw,
  description: goal.description,
  objectives: [...goal.objectives],
  ...(goal.successCriteria !== undefined ? { successCriteria: goal.successCriteria } : {}),
});

const serializeStep = (step: PlanStep): SerializedStep => ({
  id: step.id,
  title: step.title,
  description: step.description,
  ...(step.tool !== undefined ? { tool: step.tool } : {}),
  ...(step.arguments !== undefined ? { arguments: { ...step.arguments } } : {}),
  dependsOn: [...step.dependsOn],
  expectedResult: step.expectedResult,
  status: step.status,
  ...(step.metadata !== undefined ? { metadata: { ...step.metadata } } : {}),
});

const serializeDependency = (dep: PlanDependency): SerializedDependency => ({
  from: dep.from,
  to: dep.to,
});

const serializeConstraint = (c: PlanConstraint): SerializedConstraint => ({
  id: c.id,
  description: c.description,
  type: c.type,
  ...(c.value !== undefined ? { value: c.value } : {}),
});

// ---------------------------------------------------------------------------
// Deserialization
// ---------------------------------------------------------------------------

/**
 * Deserialize a SerializedPlan back to a PlanResult.
 */
export const deserializePlan = (data: SerializedPlan): PlanResult => ({
  id: data.id,
  goal: deserializeGoal(data.goal),
  strategy: data.strategy as PlanningStrategyType,
  steps: data.steps.map(deserializeStep),
  dependencies: data.dependencies.map(deserializeDependency),
  requiredTools: [...data.requiredTools],
  expectedOutputs: [...data.expectedOutputs],
  complexity: data.complexity as ComplexityLevel,
  risk: data.risk as RiskLevel,
  constraints: data.constraints.map(deserializeConstraint),
  status: data.status as PlanStatus,
  planningDurationMs: data.planningDurationMs,
  reasoningSummary: data.reasoningSummary,
});

const deserializeGoal = (goal: SerializedGoal): PlanGoal => ({
  raw: goal.raw,
  description: goal.description,
  objectives: [...goal.objectives],
  ...(goal.successCriteria !== undefined ? { successCriteria: goal.successCriteria } : {}),
});

const deserializeStep = (step: SerializedStep): PlanStep => ({
  id: step.id,
  title: step.title,
  description: step.description,
  ...(step.tool !== undefined ? { tool: step.tool } : {}),
  ...(step.arguments !== undefined ? { arguments: { ...step.arguments } } : {}),
  dependsOn: [...step.dependsOn],
  expectedResult: step.expectedResult,
  status: step.status as PlanStatus,
  ...(step.metadata !== undefined ? { metadata: { ...step.metadata } } : {}),
});

const deserializeDependency = (dep: SerializedDependency): PlanDependency => ({
  from: dep.from,
  to: dep.to,
});

const deserializeConstraint = (c: SerializedConstraint): PlanConstraint => ({
  id: c.id,
  description: c.description,
  type: c.type as PlanConstraint['type'],
  ...(c.value !== undefined ? { value: c.value } : {}),
});

// ---------------------------------------------------------------------------
// JSON helpers
// ---------------------------------------------------------------------------

/**
 * Serialize plan to JSON string.
 */
export const planToJSON = (plan: PlanResult): string =>
  JSON.stringify(serializePlan(plan), null, 2);

/**
 * Deserialize plan from JSON string.
 */
export const planFromJSON = (json: string): PlanResult =>
  deserializePlan(JSON.parse(json) as SerializedPlan);
