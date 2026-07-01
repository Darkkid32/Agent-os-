/**
 * Planning strategies determine how steps are organized.
 *
 * Strategies are pluggable — future strategies can be added
 * without modifying the core engine.
 *
 * Layer: 2 (Platform)
 */

import type { PlanStep, PlanDependency, PlanningStrategyType } from './types.js';

// ---------------------------------------------------------------------------
// Strategy interface
// ---------------------------------------------------------------------------

/**
 * A planning strategy organizes steps into an execution order.
 */
export interface PlanningStrategy {
  /** Strategy identifier */
  readonly type: PlanningStrategyType;

  /** Human-readable name */
  readonly name: string;

  /** Organize steps based on the strategy */
  organize(steps: readonly PlanStep[]): readonly PlanStep[];

  /** Generate dependencies based on the strategy */
  generateDependencies(steps: readonly PlanStep[]): readonly PlanDependency[];
}

// ---------------------------------------------------------------------------
// Sequential strategy
// ---------------------------------------------------------------------------

/**
 * Executes steps one after another in order.
 * Each step depends on the previous one.
 */
export const SequentialStrategy: PlanningStrategy = {
  type: 'sequential',
  name: 'Sequential',

  organize(steps: readonly PlanStep[]): readonly PlanStep[] {
    return [...steps];
  },

  generateDependencies(steps: readonly PlanStep[]): readonly PlanDependency[] {
    const deps: PlanDependency[] = [];
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1];
      const curr = steps[i];
      if (prev && curr) {
        deps.push({ from: curr.id, to: prev.id });
      }
    }
    return deps;
  },
};

// ---------------------------------------------------------------------------
// Parallel strategy
// ---------------------------------------------------------------------------

/**
 * Executes independent steps concurrently.
 * No dependencies between steps unless explicitly declared.
 */
export const ParallelStrategy: PlanningStrategy = {
  type: 'parallel',
  name: 'Parallel',

  organize(steps: readonly PlanStep[]): readonly PlanStep[] {
    return [...steps];
  },

  generateDependencies(_steps: readonly PlanStep[]): readonly PlanDependency[] {
    // Parallel strategy adds no implicit dependencies
    return [];
  },
};

// ---------------------------------------------------------------------------
// Conditional strategy
// ---------------------------------------------------------------------------

/**
 * Executes steps based on conditions.
 * Steps may be skipped based on results of prior steps.
 */
export const ConditionalStrategy: PlanningStrategy = {
  type: 'conditional',
  name: 'Conditional',

  organize(steps: readonly PlanStep[]): readonly PlanStep[] {
    return [...steps];
  },

  generateDependencies(_steps: readonly PlanStep[]): readonly PlanDependency[] {
    // Conditional uses explicit dependencies only
    // (already set via dependsOn in each step)
    return [];
  },
};

// ---------------------------------------------------------------------------
// Strategy registry
// ---------------------------------------------------------------------------

const strategies = new Map<PlanningStrategyType, PlanningStrategy>([
  ['sequential', SequentialStrategy],
  ['parallel', ParallelStrategy],
  ['conditional', ConditionalStrategy],
]);

/**
 * Get a strategy by type.
 */
export const getStrategy = (type: PlanningStrategyType): PlanningStrategy | undefined =>
  strategies.get(type);

/**
 * Register a custom strategy.
 */
export const registerStrategy = (strategy: PlanningStrategy): void => {
  strategies.set(strategy.type, strategy);
};

/**
 * List all registered strategies.
 */
export const listStrategies = (): readonly PlanningStrategy[] => Array.from(strategies.values());

/**
 * Check if a strategy type is registered.
 */
export const hasStrategy = (type: PlanningStrategyType): boolean => strategies.has(type);
