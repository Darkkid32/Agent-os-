/**
 * Planning engine — orchestrates plan generation.
 *
 * The engine coordinates:
 * - Context creation
 * - Strategy selection
 * - Validation
 * - Observability
 * - Event emission
 *
 * The planner NEVER executes tools. It only produces plans.
 *
 * Layer: 2 (Platform)
 */

import type { ToolDefinition } from '../tools/types.js';
import { createLogger, type Logger } from '@agent-os/observability';
import { v4 as uuid } from '../uuid.js';
import type {
  PlanResult,
  PlanStep,
  PlanGoal,
  PlanningRequest,
  PlanningResponse,
  PlanningStrategyType,
  ComplexityLevel,
  RiskLevel,
  PlanningEvent,
  PlanningEventHandler,
} from './types.js';
import type { Planner, PlanningValidation, ReplanInput } from './Planner.js';
import {
  InvalidGoalError,
  NoToolsAvailableError,
  StrategyNotSupportedError,
  PlanValidationError,
  isPlanningError,
} from './PlanningErrors.js';
import { createPlanningContext, type PlanningContext } from './PlanningContext.js';
import { getStrategy, type PlanningStrategy } from './PlanningStrategy.js';
import { validatePlan } from './PlanningValidator.js';
import { buildSystemPrompt, buildUserPrompt, buildReplanPrompt } from './PlanningPrompt.js';

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const defaultLogger = (): Logger => createLogger({ defaultAdapter: 'llm' });

// ---------------------------------------------------------------------------
// Planning engine
// ---------------------------------------------------------------------------

/**
 * The planning engine coordinates plan generation.
 *
 * Usage:
 * ```ts
 * const engine = new PlanningEngine();
 * const response = await engine.plan({ goal: '...', availableTools: [...] });
 * if (response.plan) {
 *   // Use the plan...
 * }
 * ```
 */
export class PlanningEngine implements Planner {
  private readonly eventHandlers: PlanningEventHandler[] = [];
  private readonly logger: Logger;

  public constructor(logger?: Logger) {
    this.logger = logger ?? defaultLogger();
  }

  /**
   * Register an event handler for dashboard events.
   */
  public onEvent(handler: PlanningEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Generate a plan from a planning request.
   */
  public async plan(request: PlanningRequest): Promise<PlanningResponse> {
    const startTime = Date.now();
    const planId = uuid();
    const requestId = request.requestId ?? '';

    // Emit PlanningStarted
    this.emitEvent({
      type: 'PlanningStarted',
      planId,
      timestamp: new Date().toISOString(),
      requestId,
      goal: request.goal,
    });

    try {
      // Validate inputs
      this.validateRequest(request);

      // Create context
      const context = createPlanningContext({
        goal: request.goal,
        availableTools: request.availableTools,
        ...(request.availablePlugins !== undefined
          ? { availablePlugins: request.availablePlugins }
          : {}),
        ...(request.preferredStrategy !== undefined
          ? { preferredStrategy: request.preferredStrategy }
          : {}),
        ...(request.maxSteps !== undefined ? { maxSteps: request.maxSteps } : {}),
        ...(request.constraints !== undefined ? { constraints: request.constraints } : {}),
        requestId,
      });

      // Select strategy
      const strategy = this.selectStrategy(context.preferredStrategy);

      // Build prompts (for LLM-based planners to use)
      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt({
        goal: context.goal,
        availableTools: context.availableTools,
        availablePlugins: context.availablePlugins,
        preferredStrategy: context.preferredStrategy,
        maxSteps: context.maxSteps,
        constraints: context.constraints,
      });

      // Log prompts for observability (not used in rule-based planner)
      void systemPrompt;
      void userPrompt;

      // Generate plan (rule-based for now; LLM integration comes later)
      const plan = this.generatePlan(planId, context, strategy);

      // Validate the plan
      const validation = validatePlan(plan, context.availableTools);
      if (!validation.valid) {
        const error = new PlanValidationError(validation.errors);

        this.emitEvent({
          type: 'PlanValidated',
          planId,
          timestamp: new Date().toISOString(),
          requestId,
          valid: false,
          errors: validation.errors,
        });

        this.emitEvent({
          type: 'PlanningFailed',
          planId,
          timestamp: new Date().toISOString(),
          requestId,
          error: error.message,
          errorCode: error.code,
          durationMs: Date.now() - startTime,
        });

        return {
          error: error.message,
          errorCode: error.code,
          durationMs: Date.now() - startTime,
          requestId,
        };
      }

      // Emit PlanValidated
      this.emitEvent({
        type: 'PlanValidated',
        planId,
        timestamp: new Date().toISOString(),
        requestId,
        valid: true,
      });

      // Emit PlanningCompleted
      this.emitEvent({
        type: 'PlanningCompleted',
        planId,
        timestamp: new Date().toISOString(),
        requestId,
        durationMs: Date.now() - startTime,
        stepCount: plan.steps.length,
        complexity: plan.complexity,
      });

      this.logger.info('plan generated', {
        planId,
        stepCount: plan.steps.length,
        strategy: plan.strategy,
        complexity: plan.complexity,
        durationMs: Date.now() - startTime,
      });

      return {
        plan,
        durationMs: Date.now() - startTime,
        requestId,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const errorCode = isPlanningError(e) ? e.code : 'PLANNING_FAILED';

      this.emitEvent({
        type: 'PlanningFailed',
        planId,
        timestamp: new Date().toISOString(),
        requestId,
        error: message,
        errorCode,
        durationMs: Date.now() - startTime,
      });

      this.logger.error('plan generation failed', {
        planId,
        error: message,
        errorCode,
        durationMs: Date.now() - startTime,
      });

      return {
        error: message,
        errorCode,
        durationMs: Date.now() - startTime,
        requestId,
      };
    }
  }

  /**
   * Validate an existing plan without modifying it.
   */
  public validate(plan: PlanResult): PlanningValidation {
    const tools = plan.requiredTools.map((id) => ({ id }) as ToolDefinition);
    const result = validatePlan(plan, tools);
    return {
      valid: result.valid,
      errors: result.errors,
    };
  }

  /**
   * Re-plan after a failure, given the original goal and execution state.
   */
  public async replan(input: ReplanInput): Promise<PlanningResponse> {
    const replanPrompt = buildReplanPrompt({
      originalGoal: input.goal,
      failedStep: input.failedStep,
      error: input.error,
      completedSteps: input.completedSteps,
      remainingSteps: input.remainingSteps,
      availableTools: input.availableTools,
    });

    // Log the replan prompt for observability
    void replanPrompt;

    // For now, generate a new plan with the remaining steps
    return this.plan({
      goal: `Recover from failure in step "${input.failedStep}": ${input.error}. Original goal: ${input.goal}`,
      availableTools: input.availableTools,
      ...(input.availablePlugins !== undefined ? { availablePlugins: input.availablePlugins } : {}),
      preferredStrategy: 'sequential',
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private validateRequest(request: PlanningRequest): void {
    if (!request.goal || request.goal.trim().length === 0) {
      throw new InvalidGoalError('Goal cannot be empty.');
    }
    if (request.availableTools.length === 0) {
      throw new NoToolsAvailableError();
    }
    if (request.preferredStrategy && !getStrategy(request.preferredStrategy)) {
      throw new StrategyNotSupportedError(request.preferredStrategy);
    }
    if (request.maxSteps !== undefined && request.maxSteps <= 0) {
      throw new StrategyNotSupportedError(String(request.maxSteps));
    }
  }

  private selectStrategy(type: PlanningStrategyType): PlanningStrategy {
    const strategy = getStrategy(type);
    if (!strategy) {
      throw new StrategyNotSupportedError(type);
    }
    return strategy;
  }

  private generatePlan(
    planId: string,
    context: PlanningContext,
    strategy: PlanningStrategy,
  ): PlanResult {
    const goal = this.parseGoal(context.goal);
    const steps = this.planSteps(context, strategy);
    const dependencies = strategy.generateDependencies(steps);
    const complexity = this.estimateComplexity(steps);
    const risk = this.assessRisk(steps);

    return {
      id: planId,
      goal,
      strategy: strategy.type,
      steps,
      dependencies,
      requiredTools: steps.filter((s) => s.tool !== undefined).map((s) => s.tool ?? ''),
      expectedOutputs: steps.map((s) => s.expectedResult),
      complexity,
      risk,
      constraints: [...context.constraints],
      status: 'validated',
      planningDurationMs: 0,
      reasoningSummary: this.generateReasoningSummary(goal, steps, strategy),
    };
  }

  private parseGoal(goalText: string): PlanGoal {
    const trimmed = goalText.trim();
    // Simple objective extraction: split on sentence boundaries
    const sentences = trimmed
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return {
      raw: goalText,
      description: trimmed,
      objectives: sentences.length > 0 ? sentences : [trimmed],
    };
  }

  private planSteps(context: PlanningContext, strategy: PlanningStrategy): readonly PlanStep[] {
    const steps: PlanStep[] = [];
    const maxSteps = context.maxSteps;

    // Step 1: Always start with understanding the goal
    steps.push({
      id: `step-${steps.length + 1}`,
      title: 'Understand and parse the goal',
      description: `Analyze the user's goal: "${context.goal}"`,
      dependsOn: [],
      expectedResult: 'Parsed goal with clear objectives',
      status: 'draft',
    });

    // Step 2: Gather relevant information
    const relevantTools = this.findRelevantTools(context);
    if (relevantTools.length > 0) {
      const toolNames = relevantTools.map((t) => t.id).join(', ');
      const firstStepId = steps[0]?.id ?? 'step-1';
      steps.push({
        id: `step-${steps.length + 1}`,
        title: 'Identify relevant tools',
        description: `Map objectives to available tools: ${toolNames}`,
        dependsOn: [firstStepId],
        expectedResult: 'Tool-to-objective mapping',
        status: 'draft',
      });
    }

    // Step 3: Create tool-specific steps
    for (const tool of relevantTools) {
      if (steps.length >= maxSteps) break;
      const lastStep = steps[steps.length - 1];
      const prevStepId = lastStep?.id ?? 'step-1';
      steps.push({
        id: `step-${steps.length + 1}`,
        title: `Execute ${tool.id}`,
        description: tool.description,
        tool: tool.id,
        arguments: {},
        dependsOn: [prevStepId],
        expectedResult: `Result from ${tool.id}`,
        status: 'draft',
      });
    }

    // Step 4: Aggregate results
    if (steps.length > 2 && steps.length < maxSteps) {
      const lastStep = steps[steps.length - 1];
      const prevStepId = lastStep?.id ?? 'step-1';
      steps.push({
        id: `step-${steps.length + 1}`,
        title: 'Aggregate results',
        description: 'Combine results from all tool executions',
        dependsOn: [prevStepId],
        expectedResult: 'Final aggregated result',
        status: 'draft',
      });
    }

    // Apply strategy ordering
    return strategy.organize(steps);
  }

  private findRelevantTools(context: PlanningContext): readonly ToolDefinition[] {
    // Simple relevance: return all available tools
    // In a real implementation, this would use semantic matching
    return context.availableTools.filter((t) => t.enabled !== false);
  }

  private estimateComplexity(steps: readonly PlanStep[]): ComplexityLevel {
    const count = steps.length;
    const withTools = steps.filter((s) => s.tool !== undefined).length;
    const score = count + withTools * 2;

    if (score <= 2) return 'trivial';
    if (score <= 4) return 'simple';
    if (score <= 8) return 'moderate';
    if (score <= 15) return 'complex';
    return 'very-complex';
  }

  private assessRisk(steps: readonly PlanStep[]): RiskLevel {
    const hasTools = steps.some((s) => s.tool !== undefined);
    const stepCount = steps.length;

    if (!hasTools && stepCount <= 2) return 'none';
    if (stepCount <= 3 && hasTools) return 'low';
    if (stepCount <= 8) return 'medium';
    return 'high';
  }

  private generateReasoningSummary(
    goal: PlanGoal,
    steps: readonly PlanStep[],
    strategy: PlanningStrategy,
  ): string {
    const toolSteps = steps.filter((s) => s.tool !== undefined);
    const reasonSteps = steps.filter((s) => s.tool === undefined);

    return [
      `Goal: ${goal.description}`,
      `Strategy: ${strategy.name}`,
      `Steps: ${steps.length} total (${reasonSteps.length} reasoning, ${toolSteps.length} tool execution)`,
      `Objectives: ${goal.objectives.join('; ')}`,
    ].join('\n');
  }

  private emitEvent(event: PlanningEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }
}
