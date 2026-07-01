import { describe, it, expect } from 'vitest';
import { ExecutionHistory } from './ExecutionHistory.js';
import type { ExecutionStepResult } from './ExecutionTypes.js';

describe('ExecutionHistory', () => {
  it('start records timestamp', () => {
    const h = new ExecutionHistory();
    h.start();
    expect(h.getDurationMs()).toBeGreaterThanOrEqual(0);
  });

  it('stepStarted records entry', () => {
    const h = new ExecutionHistory();
    h.start();
    h.stepStarted('step-1', 0);
    expect(h.getEntries()).toHaveLength(2); // start + stepStarted
    expect(h.getEntries()[1]?.eventType).toBe('step.started');
  });

  it('stepCompleted records result', () => {
    const h = new ExecutionHistory();
    h.start();
    const result: ExecutionStepResult = {
      stepId: 'step-1',
      success: true,
      durationMs: 100,
      retryAttempts: 0,
      completedAt: new Date().toISOString(),
    };
    h.stepCompleted(result);
    expect(h.getStepResults()).toHaveLength(1);
    expect(h.getStepResult('step-1')).toEqual(result);
  });

  it('retryAttempt records entry', () => {
    const h = new ExecutionHistory();
    h.start();
    h.retryAttempt('step-1', 1, 1000);
    expect(h.getEntries()).toHaveLength(2); // start + retryAttempt
    expect(h.getEntries()[1]?.eventType).toBe('retry.attempt');
  });

  it('complete records entry', () => {
    const h = new ExecutionHistory();
    h.start();
    h.complete('completed');
    expect(h.getEntries()).toHaveLength(2); // start + complete
    expect(h.getEntries()[1]?.eventType).toBe('execution.completed');
  });

  it('replanRequested records entry', () => {
    const h = new ExecutionHistory();
    h.start();
    h.replanRequested('step failed');
    expect(h.getEntries()).toHaveLength(2); // start + replanRequested
    expect(h.getEntries()[1]?.eventType).toBe('execution.replan');
  });

  it('getStepEntries filters by step', () => {
    const h = new ExecutionHistory();
    h.start();
    h.stepStarted('step-1', 0);
    h.stepStarted('step-2', 1);
    expect(h.getStepEntries('step-1')).toHaveLength(1);
  });

  it('getStatistics', () => {
    const h = new ExecutionHistory();
    h.start();
    h.stepCompleted({
      stepId: 'step-1',
      success: true,
      durationMs: 100,
      retryAttempts: 0,
      completedAt: new Date().toISOString(),
    });
    h.stepCompleted({
      stepId: 'step-2',
      success: false,
      durationMs: 50,
      retryAttempts: 1,
      completedAt: new Date().toISOString(),
    });
    const stats = h.getStatistics();
    expect(stats.stepsCompleted).toBe(1);
    expect(stats.stepsFailed).toBe(1);
    expect(stats.retryAttempts).toBe(1);
  });

  it('clear resets state', () => {
    const h = new ExecutionHistory();
    h.start();
    h.stepStarted('step-1', 0);
    h.clear();
    expect(h.getEntries()).toHaveLength(0);
  });
});
