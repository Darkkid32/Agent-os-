import { describe, it, expect } from 'vitest';
import { ExecutionEventEmitter, executionStarted, stepCompleted } from './ExecutionEvents.js';
import type { ExecutionIds, ExecutionEvent } from './ExecutionTypes.js';

const makeIds = (): ExecutionIds => ({
  executionId: 'exec-1',
  goalId: 'goal-1',
  planId: 'plan-1',
  sessionId: 'sess-1',
  correlationId: 'corr-1',
});

describe('ExecutionEventEmitter', () => {
  it('on subscribes to events', () => {
    const emitter = new ExecutionEventEmitter();
    const events: unknown[] = [];
    emitter.on((e) => events.push(e));
    emitter.emit(executionStarted(makeIds(), 'goal', 1));
    expect(events).toHaveLength(1);
  });

  it('unsubscribe stops events', () => {
    const emitter = new ExecutionEventEmitter();
    const events: unknown[] = [];
    const unsub = emitter.on((e) => events.push(e));
    unsub();
    emitter.emit(executionStarted(makeIds(), 'goal', 1));
    expect(events).toHaveLength(0);
  });

  it('handler error is swallowed', () => {
    const emitter = new ExecutionEventEmitter();
    emitter.on(() => {
      throw new Error('handler error');
    });
    expect(() => emitter.emit(executionStarted(makeIds(), 'goal', 1))).not.toThrow();
  });

  it('getHandlerCount', () => {
    const emitter = new ExecutionEventEmitter();
    expect(emitter.getHandlerCount()).toBe(0);
    emitter.on(() => {});
    expect(emitter.getHandlerCount()).toBe(1);
  });

  it('clear removes all handlers', () => {
    const emitter = new ExecutionEventEmitter();
    emitter.on(() => {});
    emitter.on(() => {});
    emitter.clear();
    expect(emitter.getHandlerCount()).toBe(0);
  });
});

describe('event factories', () => {
  it('executionStarted', () => {
    const event = executionStarted(makeIds(), 'goal', 5) as ExecutionEvent & {
      goal: string;
      stepCount: number;
    };
    expect(event.type).toBe('ExecutionStarted');
    expect(event.goal).toBe('goal');
    expect(event.stepCount).toBe(5);
  });

  it('stepCompleted', () => {
    const event = stepCompleted(makeIds(), 'step-1', 100, true) as ExecutionEvent & {
      stepId: string;
      success: boolean;
    };
    expect(event.type).toBe('StepCompleted');
    expect(event.stepId).toBe('step-1');
    expect(event.success).toBe(true);
  });
});
