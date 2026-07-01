/**
 * Planning prompt generation.
 *
 * Generates structured prompts for the LLM-based planner.
 * The prompt guides the LLM to produce a valid plan in a parseable format.
 *
 * Layer: 2 (Platform)
 */

import type { ToolDefinition } from '../tools/types.js';
import type { PlanningStrategyType, PlanConstraint } from './types.js';

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const PLANNER_SYSTEM_PROMPT = `You are a planning engine. Your ONLY job is to analyze a user's goal and produce a structured execution plan.

RULES:
1. You NEVER execute tools. You only produce plans.
2. You NEVER talk to plugins. You only reason about what to do.
3. Each step must reference a tool from the available tools list (or be a reasoning step with no tool).
4. Steps must have clear input/output descriptions.
5. Dependencies must form a DAG (no cycles).
6. Keep plans minimal — only include steps that are necessary.

OUTPUT FORMAT:
You MUST output a JSON object with this exact structure:
{
  "goal": { "description": "...", "objectives": ["..."], "successCriteria": "..." },
  "strategy": "sequential" | "parallel" | "conditional",
  "steps": [
    {
      "id": "step-1",
      "title": "...",
      "description": "...",
      "tool": "tool-id or null",
      "arguments": { "param": "value" },
      "dependsOn": ["step-id"],
      "expectedResult": "..."
    }
  ],
  "reasoningSummary": "..."
}

IMPORTANT: Output ONLY the JSON object. No markdown fences, no explanation.`;

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

/**
 * Build the system prompt for the planner.
 */
export const buildSystemPrompt = (): string => PLANNER_SYSTEM_PROMPT;

/**
 * Build the user prompt containing the goal and available tools.
 */
export const buildUserPrompt = (input: {
  readonly goal: string;
  readonly availableTools: readonly ToolDefinition[];
  readonly availablePlugins?: readonly string[];
  readonly systemContext?: string;
  readonly preferredStrategy?: PlanningStrategyType;
  readonly maxSteps?: number;
  readonly constraints?: readonly PlanConstraint[];
}): string => {
  const sections: string[] = [];

  // Goal section
  sections.push(`## Goal\n${input.goal}`);

  // System context
  if (input.systemContext) {
    sections.push(`## System Context\n${input.systemContext}`);
  }

  // Available tools
  sections.push(formatToolDefinitions(input.availableTools));

  // Available plugins
  if (input.availablePlugins && input.availablePlugins.length > 0) {
    sections.push(`## Available Plugins\n${input.availablePlugins.join(', ')}`);
  }

  // Strategy preference
  if (input.preferredStrategy) {
    sections.push(`## Preferred Strategy\n${input.preferredStrategy}`);
  }

  // Max steps
  if (input.maxSteps !== undefined) {
    sections.push(`## Maximum Steps\n${input.maxSteps}`);
  }

  // Constraints
  if (input.constraints && input.constraints.length > 0) {
    const constraintLines = input.constraints.map(
      (c) => `- [${c.type}] ${c.description}${c.value !== undefined ? ` (${c.value})` : ''}`,
    );
    sections.push(`## Constraints\n${constraintLines.join('\n')}`);
  }

  return sections.join('\n\n');
};

/**
 * Format tool definitions for inclusion in the prompt.
 */
const formatToolDefinitions = (tools: readonly ToolDefinition[]): string => {
  if (tools.length === 0) {
    return '## Available Tools\nNo tools available.';
  }

  const lines = tools.map((tool) => {
    const params = formatToolParams(tool);
    return `- **${tool.id}**: ${tool.description}${params ? `\n  Parameters: ${params}` : ''}`;
  });

  return `## Available Tools\n${lines.join('\n')}`;
};

/**
 * Format a tool's parameters for display.
 */
const formatToolParams = (tool: ToolDefinition): string => {
  const parts: string[] = [];
  const required = tool.parameters.required ?? [];
  const optional = tool.parameters.optional ?? [];

  for (const param of required) {
    parts.push(`${param.name}: ${param.type} (required)`);
  }
  for (const param of optional) {
    parts.push(`${param.name}: ${param.type}`);
  }

  return parts.join(', ');
};

/**
 * Build a prompt for re-planning after a failure.
 */
export const buildReplanPrompt = (input: {
  readonly originalGoal: string;
  readonly failedStep: string;
  readonly error: string;
  readonly completedSteps: readonly string[];
  readonly remainingSteps: readonly string[];
  readonly availableTools: readonly ToolDefinition[];
}): string => {
  const sections: string[] = [];

  sections.push('## Re-planning Required');
  sections.push(`Original goal: ${input.originalGoal}`);
  sections.push(`Failed step: ${input.failedStep}`);
  sections.push(`Error: ${input.error}`);
  sections.push(`Completed steps: ${input.completedSteps.join(', ') || 'none'}`);
  sections.push(`Remaining steps: ${input.remainingSteps.join(', ') || 'none'}`);
  sections.push(formatToolDefinitions(input.availableTools));
  sections.push(
    'Produce a new plan that accounts for the completed work and the failure. Output the same JSON format.',
  );

  return sections.join('\n\n');
};
