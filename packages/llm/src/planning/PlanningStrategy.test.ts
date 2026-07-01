/**
 * Tests for PlanningStrategy.
 */
import { describe, it, expect } from 'vitest';
import {
  SequentialStrategy,
  ParallelStrategy,
  ConditionalStrategy,
  getStrategy,
  registerStrategy,
  listStrategies,
  hasStrategy,
} from './PlanningStrategy.js';
import type { PlanStep } from './types.js';

const steps: PlanStep[] = [
  {
    id: 's1',
    title: 'Step 1',
    description: 'First',
    dependsOn: [],
    expectedResult: 'r1',
    status: 'draft',
  },
  {
    id: 's2',
    title: 'Step 2',
    description: 'Second',
    dependsOn: [],
    expectedResult: 'r2',
    status: 'draft',
  },
  {
    id: 's3',
    title: 'Step 3',
    description: 'Third',
    dependsOn: [],
    expectedResult: 'r3',
    status: 'draft',
  },
];

describe('SequentialStrategy', () => {
  it('has correct type and name', () => {
    expect(SequentialStrategy.type).toBe('sequential');
    expect(SequentialStrategy.name).toBe('Sequential');
  });

  it('organize returns a copy', () => {
    const result = SequentialStrategy.organize(steps);
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.id)).toEqual(['s1', 's2', 's3']);
  });

  it('generateDependencies chains steps sequentially', () => {
    const deps = SequentialStrategy.generateDependencies(steps);
    expect(deps).toHaveLength(2);
    expect(deps[0]).toEqual({ from: 's2', to: 's1' });
    expect(deps[1]).toEqual({ from: 's3', to: 's2' });
  });

  it('generateDependencies returns empty for single step', () => {
    const deps = SequentialStrategy.generateDependencies([steps[0]!]);
    expect(deps).toHaveLength(0);
  });

  it('generateDependencies returns empty for empty', () => {
    expect(SequentialStrategy.generateDependencies([])).toHaveLength(0);
  });
});

describe('ParallelStrategy', () => {
  it('has correct type and name', () => {
    expect(ParallelStrategy.type).toBe('parallel');
    expect(ParallelStrategy.name).toBe('Parallel');
  });

  it('organize returns a copy', () => {
    expect(ParallelStrategy.organize(steps)).toHaveLength(3);
  });

  it('generateDependencies returns empty (no implicit deps)', () => {
    expect(ParallelStrategy.generateDependencies(steps)).toHaveLength(0);
  });
});

describe('ConditionalStrategy', () => {
  it('has correct type and name', () => {
    expect(ConditionalStrategy.type).toBe('conditional');
    expect(ConditionalStrategy.name).toBe('Conditional');
  });

  it('organize returns a copy', () => {
    expect(ConditionalStrategy.organize(steps)).toHaveLength(3);
  });

  it('generateDependencies returns empty (uses explicit only)', () => {
    expect(ConditionalStrategy.generateDependencies(steps)).toHaveLength(0);
  });
});

describe('getStrategy', () => {
  it('returns the correct strategy', () => {
    expect(getStrategy('sequential')).toBe(SequentialStrategy);
    expect(getStrategy('parallel')).toBe(ParallelStrategy);
    expect(getStrategy('conditional')).toBe(ConditionalStrategy);
  });

  it('returns undefined for unknown strategy', () => {
    expect(getStrategy('hybrid' as unknown as 'sequential')).toBeUndefined();
  });
});

describe('registerStrategy', () => {
  it('registers a custom strategy', () => {
    const custom = {
      type: 'custom' as const,
      name: 'Custom',
      organize: (s: readonly PlanStep[]) => [...s],
      generateDependencies: () => [],
    };
    registerStrategy(custom);
    expect(getStrategy('custom')).toBe(custom);
    expect(hasStrategy('custom')).toBe(true);
  });
});

describe('listStrategies', () => {
  it('returns all registered strategies', () => {
    const list = listStrategies();
    expect(list.length).toBeGreaterThanOrEqual(3);
  });
});

describe('hasStrategy', () => {
  it('returns true for registered strategies', () => {
    expect(hasStrategy('sequential')).toBe(true);
    expect(hasStrategy('parallel')).toBe(true);
  });

  it('returns false for unknown strategy', () => {
    expect(hasStrategy('hybrid' as unknown as 'sequential')).toBe(false);
  });
});
