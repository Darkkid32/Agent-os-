/**
 * Tests for PlanningValidator.
 */
import { describe, it, expect } from 'vitest';
import {
  validateNoDuplicateIds,
  validateDependenciesExist,
  validateNoCycles,
  validateToolsExist,
  validateNotEmpty,
  validateStepFields,
  validatePlan,
} from './PlanningValidator.js';
import type { PlanStep, PlanResult } from './types.js';
import type { ToolDefinition } from '../tools/types.js';

const makeStep = (id: string, dependsOn: string[] = [], tool?: string): PlanStep => ({
  id,
  title: `Step ${id}`,
  description: `Description for ${id}`,
  dependsOn,
  expectedResult: `Result for ${id}`,
  status: 'draft',
  ...(tool !== undefined ? { tool } : {}),
});

const makePlan = (steps: PlanStep[]): PlanResult => ({
  id: 'plan-1',
  goal: { raw: 'test', description: 'test', objectives: ['test'] },
  strategy: 'sequential',
  steps,
  dependencies: [],
  requiredTools: [],
  expectedOutputs: [],
  complexity: 'simple',
  risk: 'low',
  constraints: [],
  status: 'validated',
  planningDurationMs: 0,
  reasoningSummary: 'test',
});

const toolDefs: ToolDefinition[] = [
  {
    id: 'search',
    name: 'Search',
    description: 'Search',
    pluginId: 'web',
    parameters: { required: [], optional: [] },
    permissions: [],
  },
  {
    id: 'read',
    name: 'Read',
    description: 'Read',
    pluginId: 'fs',
    parameters: { required: [], optional: [] },
    permissions: [],
  },
];

describe('validateNoDuplicateIds', () => {
  it('returns empty for unique ids', () => {
    expect(validateNoDuplicateIds([makeStep('s1'), makeStep('s2')])).toEqual([]);
  });

  it('returns error for duplicate ids', () => {
    const errors = validateNoDuplicateIds([makeStep('s1'), makeStep('s1')]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('s1');
  });
});

describe('validateDependenciesExist', () => {
  it('returns empty when all deps exist', () => {
    const steps = [makeStep('s1'), makeStep('s2', ['s1'])];
    expect(validateDependenciesExist(steps)).toEqual([]);
  });

  it('returns error for missing dep', () => {
    const steps = [makeStep('s1', ['s99'])];
    const errors = validateDependenciesExist(steps);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('s99');
  });
});

describe('validateNoCycles', () => {
  it('returns empty for acyclic graph', () => {
    const steps = [makeStep('s1'), makeStep('s2', ['s1']), makeStep('s3', ['s2'])];
    expect(validateNoCycles(steps)).toEqual([]);
  });

  it('detects direct cycle', () => {
    const steps = [makeStep('s1', ['s2']), makeStep('s2', ['s1'])];
    const errors = validateNoCycles(steps);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('cycle');
  });

  it('detects indirect cycle', () => {
    const steps = [makeStep('s1', ['s3']), makeStep('s2', ['s1']), makeStep('s3', ['s2'])];
    const errors = validateNoCycles(steps);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns empty for independent steps', () => {
    const steps = [makeStep('s1'), makeStep('s2'), makeStep('s3')];
    expect(validateNoCycles(steps)).toEqual([]);
  });
});

describe('validateToolsExist', () => {
  it('returns empty when all tools exist', () => {
    const steps = [makeStep('s1', [], 'search')];
    expect(validateToolsExist(steps, toolDefs)).toEqual([]);
  });

  it('returns error for missing tool', () => {
    const steps = [makeStep('s1', [], 'nonexistent')];
    const errors = validateToolsExist(steps, toolDefs);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('nonexistent');
  });

  it('skips steps without tools', () => {
    const steps = [makeStep('s1')];
    expect(validateToolsExist(steps, toolDefs)).toEqual([]);
  });
});

describe('validateNotEmpty', () => {
  it('returns empty for non-empty steps', () => {
    expect(validateNotEmpty([makeStep('s1')])).toEqual([]);
  });

  it('returns error for empty steps', () => {
    const errors = validateNotEmpty([]);
    expect(errors).toHaveLength(1);
  });
});

describe('validateStepFields', () => {
  it('returns empty for valid steps', () => {
    expect(validateStepFields([makeStep('s1')])).toEqual([]);
  });

  it('returns error for missing title', () => {
    const steps = [{ ...makeStep('s1'), title: '' }];
    const errors = validateStepFields(steps);
    expect(errors.some((e) => e.includes('title'))).toBe(true);
  });

  it('returns error for missing description', () => {
    const steps = [{ ...makeStep('s1'), description: '' }];
    const errors = validateStepFields(steps);
    expect(errors.some((e) => e.includes('description'))).toBe(true);
  });

  it('returns error for missing expectedResult', () => {
    const steps = [{ ...makeStep('s1'), expectedResult: '' }];
    const errors = validateStepFields(steps);
    expect(errors.some((e) => e.includes('expectedResult'))).toBe(true);
  });
});

describe('validatePlan', () => {
  it('returns valid for a good plan', () => {
    const plan = makePlan([makeStep('s1'), makeStep('s2', ['s1'], 'search')]);
    const result = validatePlan(plan, toolDefs);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns invalid for empty plan', () => {
    const plan = makePlan([]);
    const result = validatePlan(plan, toolDefs);
    expect(result.valid).toBe(false);
  });

  it('collects multiple errors', () => {
    const plan = makePlan([
      { ...makeStep('s1'), title: '', description: '' },
      makeStep('s1'), // duplicate
    ]);
    const result = validatePlan(plan, toolDefs);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
