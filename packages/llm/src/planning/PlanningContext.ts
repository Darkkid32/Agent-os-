/**
 * Planning context — holds all inputs for the planning engine.
 *
 * Immutable once constructed. Provides a single source of truth
 * for the planner's view of the world.
 *
 * Layer: 2 (Platform)
 */

import type { ToolDefinition } from '../tools/types.js';
import type { PlanConstraint, PlanningStrategyType } from './types.js';

/**
 * Context passed to the planner for generating plans.
 */
export interface PlanningContext {
  /** User's goal text */
  readonly goal: string;

  /** Available tool definitions */
  readonly availableTools: readonly ToolDefinition[];

  /** Available plugin IDs */
  readonly availablePlugins: readonly string[];

  /** System context (role, capabilities, etc.) */
  readonly systemContext: string;

  /** Preferred planning strategy */
  readonly preferredStrategy: PlanningStrategyType;

  /** Maximum number of steps allowed */
  readonly maxSteps: number;

  /** Execution constraints */
  readonly constraints: readonly PlanConstraint[];

  /** Request ID for tracing */
  readonly requestId: string;
}

/**
 * Create a PlanningContext with sensible defaults.
 */
export const createPlanningContext = (input: {
  readonly goal: string;
  readonly availableTools?: readonly ToolDefinition[];
  readonly availablePlugins?: readonly string[];
  readonly systemContext?: string;
  readonly preferredStrategy?: PlanningStrategyType;
  readonly maxSteps?: number;
  readonly constraints?: readonly PlanConstraint[];
  readonly requestId?: string;
}): PlanningContext => ({
  goal: input.goal,
  availableTools: input.availableTools ?? [],
  availablePlugins: input.availablePlugins ?? [],
  systemContext: input.systemContext ?? '',
  preferredStrategy: input.preferredStrategy ?? 'sequential',
  maxSteps: input.maxSteps ?? 50,
  constraints: input.constraints ?? [],
  requestId: input.requestId ?? '',
});

/**
 * Get tool definitions that match the available plugins.
 */
export const getToolsForPlugins = (
  tools: readonly ToolDefinition[],
  plugins: readonly string[],
): readonly ToolDefinition[] => {
  if (plugins.length === 0) return tools;
  const pluginSet = new Set(plugins);
  return tools.filter((t) => pluginSet.has(t.pluginId));
};

/**
 * Get a tool definition by ID from a list.
 */
export const findToolById = (
  tools: readonly ToolDefinition[],
  toolId: string,
): ToolDefinition | undefined => tools.find((t) => t.id === toolId);
