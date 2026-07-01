/**
 * Tests for PlanningEngine.
 */
import { describe, it, expect } from 'vitest';
import { PlanningEngine } from './PlanningEngine.js';
import type { PlanResult, PlanningEvent } from './types.js';
import type { ToolDefinition } from '../tools/types.js';

const tools: ToolDefinition[] = [
  {
    id: 'search',
    name: 'Search',
    description: 'Search the web',
    pluginId: 'web',
    parameters: {
      required: [{ name: 'query', type: 'string', required: true }],
      optional: [],
    },
    permissions: [],
  },
  {
    id: 'read-file',
    name: 'Read File',
    description: 'Read a file from disk',
    pluginId: 'fs',
    parameters: {
      required: [{ name: 'path', type: 'string', required: true }],
      optional: [],
    },
    permissions: ['read'],
  },
];

describe('PlanningEngine', () => {
  it('generates a plan from a simple goal', async () => {
    const engine = new PlanningEngine();
    const response = await engine.plan({
      goal: 'Search for information about cats',
      availableTools: tools,
    });

    expect(response.plan).toBeDefined();
    expect(response.plan?.id).toBeDefined();
    expect(response.plan?.steps.length).toBeGreaterThan(0);
    expect(response.plan?.goal.description).toContain('cats');
    expect(response.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns error for empty goal', async () => {
    const engine = new PlanningEngine();
    const response = await engine.plan({
      goal: '',
      availableTools: tools,
    });

    expect(response.plan).toBeUndefined();
    expect(response.error).toBeDefined();
    expect(response.errorCode).toBe('INVALID_GOAL');
  });

  it('returns error for no tools', async () => {
    const engine = new PlanningEngine();
    const response = await engine.plan({
      goal: 'do something',
      availableTools: [],
    });

    expect(response.plan).toBeUndefined();
    expect(response.errorCode).toBe('NO_TOOLS_AVAILABLE');
  });

  it('returns error for unsupported strategy', async () => {
    const engine = new PlanningEngine();
    const response = await engine.plan({
      goal: 'do something',
      availableTools: tools,
      preferredStrategy: 'hybrid' as unknown as 'sequential',
    });

    expect(response.plan).toBeUndefined();
    expect(response.errorCode).toBe('STRATEGY_NOT_SUPPORTED');
  });

  it('respects maxSteps', async () => {
    const engine = new PlanningEngine();
    const response = await engine.plan({
      goal: 'do many things',
      availableTools: tools,
      maxSteps: 2,
    });

    expect(response.plan).toBeDefined();
    expect(response.plan?.steps.length).toBeLessThanOrEqual(2);
  });

  it('emits events during planning', async () => {
    const engine = new PlanningEngine();
    const events: PlanningEvent[] = [];
    engine.onEvent((e) => events.push(e));

    await engine.plan({
      goal: 'Search for cats',
      availableTools: tools,
      requestId: 'req-1',
    });

    const eventTypes = events.map((e) => e.type);
    expect(eventTypes).toContain('PlanningStarted');
    expect(eventTypes).toContain('PlanValidated');
    expect(eventTypes).toContain('PlanningCompleted');
  });

  it('emits PlanningFailed on error', async () => {
    const engine = new PlanningEngine();
    const events: PlanningEvent[] = [];
    engine.onEvent((e) => events.push(e));

    await engine.plan({
      goal: '',
      availableTools: tools,
    });

    const eventTypes = events.map((e) => e.type);
    expect(eventTypes).toContain('PlanningStarted');
    expect(eventTypes).toContain('PlanningFailed');
  });

  it('includes requestId in events', async () => {
    const engine = new PlanningEngine();
    const events: PlanningEvent[] = [];
    engine.onEvent((e) => events.push(e));

    await engine.plan({
      goal: 'Search for cats',
      availableTools: tools,
      requestId: 'req-42',
    });

    for (const event of events) {
      expect(event.requestId).toBe('req-42');
    }
  });

  it('generates sequential dependencies by default', async () => {
    const engine = new PlanningEngine();
    const response = await engine.plan({
      goal: 'Search for cats',
      availableTools: tools,
    });

    expect(response.plan?.strategy).toBe('sequential');
    // Sequential strategy should have dependencies
    expect(response.plan?.dependencies.length).toBeGreaterThan(0);
  });

  it('uses parallel strategy when requested', async () => {
    const engine = new PlanningEngine();
    const response = await engine.plan({
      goal: 'Search for cats',
      availableTools: tools,
      preferredStrategy: 'parallel',
    });

    expect(response.plan?.strategy).toBe('parallel');
    // Parallel strategy should have no implicit dependencies
    expect(response.plan?.dependencies).toHaveLength(0);
  });

  it('uses conditional strategy when requested', async () => {
    const engine = new PlanningEngine();
    const response = await engine.plan({
      goal: 'Search for cats',
      availableTools: tools,
      preferredStrategy: 'conditional',
    });

    expect(response.plan?.strategy).toBe('conditional');
  });

  it('validates the generated plan', async () => {
    const engine = new PlanningEngine();
    const response = await engine.plan({
      goal: 'Search for cats',
      availableTools: tools,
    });

    const plan = response.plan;
    expect(plan).toBeDefined();
    if (!plan) return;

    // Validate step fields
    for (const step of plan.steps) {
      expect(step.id).toBeDefined();
      expect(step.title).toBeDefined();
      expect(step.description).toBeDefined();
      expect(step.expectedResult).toBeDefined();
    }
  });

  it('no step references a non-existent tool', async () => {
    const engine = new PlanningEngine();
    const response = await engine.plan({
      goal: 'Search for cats',
      availableTools: tools,
    });

    const plan = response.plan;
    if (!plan) return;

    const toolIds = new Set(tools.map((t) => t.id));
    for (const step of plan.steps) {
      if (step.tool) {
        expect(toolIds.has(step.tool)).toBe(true);
      }
    }
  });

  it('handles constraints', async () => {
    const engine = new PlanningEngine();
    const response = await engine.plan({
      goal: 'Search for cats',
      availableTools: tools,
      constraints: [{ id: 'c1', description: 'No network', type: 'resource' }],
    });

    expect(response.plan?.constraints).toHaveLength(1);
    expect(response.plan?.constraints[0]?.description).toBe('No network');
  });

  it('validate() checks an existing plan', () => {
    const engine = new PlanningEngine();
    const plan: PlanResult = {
      id: 'test-plan',
      goal: { raw: 'test', description: 'test', objectives: ['test'] },
      strategy: 'sequential',
      steps: [
        {
          id: 's1',
          title: 'S1',
          description: 'D1',
          dependsOn: [],
          expectedResult: 'R1',
          status: 'draft',
        },
      ],
      dependencies: [],
      requiredTools: [],
      expectedOutputs: [],
      complexity: 'simple',
      risk: 'low',
      constraints: [],
      status: 'validated',
      planningDurationMs: 0,
      reasoningSummary: '',
    };

    const result = engine.validate(plan);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('validate() catches issues in existing plan', () => {
    const engine = new PlanningEngine();
    const plan: PlanResult = {
      id: 'bad-plan',
      goal: { raw: '', description: '', objectives: [] },
      strategy: 'sequential',
      steps: [], // empty!
      dependencies: [],
      requiredTools: [],
      expectedOutputs: [],
      complexity: 'simple',
      risk: 'low',
      constraints: [],
      status: 'validated',
      planningDurationMs: 0,
      reasoningSummary: '',
    };

    const result = engine.validate(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('replan generates a new plan after failure', async () => {
    const engine = new PlanningEngine();
    const response = await engine.replan({
      goal: 'Search for cats',
      failedStep: 'step-2',
      error: 'timeout',
      completedSteps: ['step-1'],
      remainingSteps: ['step-3'],
      availableTools: tools,
    });

    expect(response.plan).toBeDefined();
    expect(response.plan?.id).toBeDefined();
  });

  it('includes reasoningSummary', async () => {
    const engine = new PlanningEngine();
    const response = await engine.plan({
      goal: 'Search for cats',
      availableTools: tools,
    });

    expect(response.plan?.reasoningSummary).toBeDefined();
    expect(response.plan?.reasoningSummary.length).toBeGreaterThan(0);
  });

  it('includes complexity and risk', async () => {
    const engine = new PlanningEngine();
    const response = await engine.plan({
      goal: 'Search for cats',
      availableTools: tools,
    });

    expect(response.plan?.complexity).toBeDefined();
    expect(response.plan?.risk).toBeDefined();
  });
});
