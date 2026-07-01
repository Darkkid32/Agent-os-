/**
 * Plan validation — ensures a generated plan is structurally sound.
 *
 * Checks:
 * - Duplicate step IDs
 * - Dependency cycles
 * - Missing tool references
 * - Invalid dependency references
 * - Empty plans
 * - Missing required fields
 *
 * Layer: 2 (Platform)
 */

import type { PlanResult, PlanStep } from './types.js';
import type { ToolDefinition } from '../tools/types.js';

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export interface PlanningValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

/**
 * Check for duplicate step IDs.
 */
export const validateNoDuplicateIds = (steps: readonly PlanStep[]): string[] => {
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const step of steps) {
    if (seen.has(step.id)) {
      errors.push(`Duplicate step ID: "${step.id}"`);
    }
    seen.add(step.id);
  }
  return errors;
};

/**
 * Check that all dependency references point to existing steps.
 */
export const validateDependenciesExist = (steps: readonly PlanStep[]): string[] => {
  const ids = new Set(steps.map((s) => s.id));
  const errors: string[] = [];
  for (const step of steps) {
    for (const dep of step.dependsOn) {
      if (!ids.has(dep)) {
        errors.push(`Step "${step.id}" depends on unknown step "${dep}"`);
      }
    }
  }
  return errors;
};

/**
 * Detect cycles in the dependency graph using DFS.
 */
export const validateNoCycles = (steps: readonly PlanStep[]): string[] => {
  const errors: string[] = [];
  const adjacency = new Map<string, string[]>();

  for (const step of steps) {
    adjacency.set(step.id, [...step.dependsOn]);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  const dfs = (node: string): boolean => {
    if (inStack.has(node)) {
      // Found a cycle — extract it
      const cycleStart = path.indexOf(node);
      if (cycleStart >= 0) {
        const cycle = path.slice(cycleStart);
        cycle.push(node);
        errors.push(`Dependency cycle: ${cycle.join(' -> ')}`);
      }
      return true;
    }
    if (visited.has(node)) {
      return false;
    }

    visited.add(node);
    inStack.add(node);
    path.push(node);

    const neighbors = adjacency.get(node) ?? [];
    for (const neighbor of neighbors) {
      dfs(neighbor);
    }

    path.pop();
    inStack.delete(node);
    return false;
  };

  for (const step of steps) {
    if (!visited.has(step.id)) {
      dfs(step.id);
    }
  }

  return errors;
};

/**
 * Check that all referenced tools exist in the available tools list.
 */
export const validateToolsExist = (
  steps: readonly PlanStep[],
  availableTools: readonly ToolDefinition[],
): string[] => {
  const toolIds = new Set(availableTools.map((t) => t.id));
  const errors: string[] = [];
  for (const step of steps) {
    if (step.tool && !toolIds.has(step.tool)) {
      errors.push(`Step "${step.id}" references unknown tool "${step.tool}"`);
    }
  }
  return errors;
};

/**
 * Check that the plan is not empty.
 */
export const validateNotEmpty = (steps: readonly PlanStep[]): string[] => {
  if (steps.length === 0) {
    return ['Plan has no steps'];
  }
  return [];
};

/**
 * Check that each step has required fields.
 */
export const validateStepFields = (steps: readonly PlanStep[]): string[] => {
  const errors: string[] = [];
  for (const step of steps) {
    if (!step.id) {
      errors.push('Step missing required field "id"');
    }
    if (!step.title) {
      errors.push(`Step "${step.id}" missing required field "title"`);
    }
    if (!step.description) {
      errors.push(`Step "${step.id}" missing required field "description"`);
    }
    if (!step.expectedResult) {
      errors.push(`Step "${step.id}" missing required field "expectedResult"`);
    }
  }
  return errors;
};

/**
 * Run all validators against a plan.
 */
export const validatePlan = (
  plan: PlanResult,
  availableTools: readonly ToolDefinition[],
): PlanningValidationResult => {
  const errors: string[] = [
    ...validateNotEmpty(plan.steps),
    ...validateStepFields(plan.steps),
    ...validateNoDuplicateIds(plan.steps),
    ...validateDependenciesExist(plan.steps),
    ...validateNoCycles(plan.steps),
    ...validateToolsExist(plan.steps, availableTools),
  ];

  return {
    valid: errors.length === 0,
    errors,
  };
};
