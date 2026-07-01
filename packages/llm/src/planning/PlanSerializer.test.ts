/**
 * Tests for PlanSerializer.
 */
import { describe, it, expect } from 'vitest';
import { serializePlan, deserializePlan, planToJSON, planFromJSON } from './PlanSerializer.js';
import type { PlanResult } from './types.js';

const samplePlan: PlanResult = {
  id: 'plan-1',
  goal: {
    raw: 'Search the web for info',
    description: 'Search the web for info',
    objectives: ['Search the web for info'],
    successCriteria: 'Find relevant results',
  },
  strategy: 'sequential',
  steps: [
    {
      id: 'step-1',
      title: 'Search',
      description: 'Search for info',
      tool: 'search',
      arguments: { query: 'hello' },
      dependsOn: [],
      expectedResult: 'Search results',
      status: 'draft',
      metadata: { priority: 'high' },
    },
    {
      id: 'step-2',
      title: 'Read',
      description: 'Read results',
      dependsOn: ['step-1'],
      expectedResult: 'Read data',
      status: 'draft',
    },
  ],
  dependencies: [{ from: 'step-2', to: 'step-1' }],
  requiredTools: ['search'],
  expectedOutputs: ['Search results', 'Read data'],
  complexity: 'simple',
  risk: 'low',
  constraints: [{ id: 'c1', description: 'No network', type: 'resource', value: 'local' }],
  status: 'validated',
  planningDurationMs: 42,
  reasoningSummary: 'Simple two-step plan',
};

describe('serializePlan', () => {
  it('serializes a complete plan', () => {
    const serialized = serializePlan(samplePlan);
    expect(serialized.id).toBe('plan-1');
    expect(serialized.goal.raw).toBe('Search the web for info');
    expect(serialized.goal.successCriteria).toBe('Find relevant results');
    expect(serialized.steps).toHaveLength(2);
    expect(serialized.steps[0]?.tool).toBe('search');
    expect(serialized.steps[0]?.arguments).toEqual({ query: 'hello' });
    expect(serialized.steps[0]?.metadata).toEqual({ priority: 'high' });
    expect(serialized.dependencies).toHaveLength(1);
    expect(serialized.constraints).toHaveLength(1);
    expect(serialized.planningDurationMs).toBe(42);
  });

  it('serializes without optional fields', () => {
    const base = samplePlan.steps[0]!;
    const stepWithoutOptionals = {
      id: base.id,
      title: base.title,
      description: base.description,
      dependsOn: base.dependsOn,
      expectedResult: base.expectedResult,
      status: base.status,
    };
    const minimal: PlanResult = {
      ...samplePlan,
      steps: [stepWithoutOptionals],
      requiredTools: [],
      constraints: [],
    };
    const serialized = serializePlan(minimal);
    expect(serialized.steps[0]?.tool).toBeUndefined();
    expect(serialized.steps[0]?.arguments).toBeUndefined();
    expect(serialized.steps[0]?.metadata).toBeUndefined();
    expect(serialized.constraints).toEqual([]);
  });
});

describe('deserializePlan', () => {
  it('deserializes back to PlanResult', () => {
    const serialized = serializePlan(samplePlan);
    const deserialized = deserializePlan(serialized);
    expect(deserialized.id).toBe(samplePlan.id);
    expect(deserialized.goal.raw).toBe(samplePlan.goal.raw);
    expect(deserialized.steps).toHaveLength(2);
    expect(deserialized.steps[0]?.tool).toBe('search');
    expect(deserialized.steps[0]?.arguments).toEqual({ query: 'hello' });
    expect(deserialized.dependencies).toHaveLength(1);
    expect(deserialized.constraints).toHaveLength(1);
  });

  it('round-trips correctly', () => {
    const deserialized = deserializePlan(serializePlan(samplePlan));
    expect(deserialized).toEqual(samplePlan);
  });
});

describe('planToJSON / planFromJSON', () => {
  it('round-trips through JSON string', () => {
    const json = planToJSON(samplePlan);
    expect(typeof json).toBe('string');
    const parsed = planFromJSON(json);
    expect(parsed.id).toBe(samplePlan.id);
    expect(parsed.steps).toHaveLength(2);
  });

  it('produces valid JSON', () => {
    const json = planToJSON(samplePlan);
    const obj = JSON.parse(json);
    expect(obj).toHaveProperty('id');
    expect(obj).toHaveProperty('steps');
    expect(obj).toHaveProperty('goal');
  });
});
