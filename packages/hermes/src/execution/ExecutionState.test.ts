import { describe, it, expect } from 'vitest';
import {
  ExecutionStateMachine,
  getValidTransitions,
  getValidStepTransitions,
  isTerminalStatus,
} from './ExecutionState.js';

describe('ExecutionStateMachine', () => {
  it('starts in pending', () => {
    const sm = new ExecutionStateMachine();
    expect(sm.getStatus()).toBe('pending');
  });

  it('transitions pending → running', () => {
    const sm = new ExecutionStateMachine();
    sm.transition('running');
    expect(sm.getStatus()).toBe('running');
  });

  it('transitions running → completed', () => {
    const sm = new ExecutionStateMachine();
    sm.transition('running');
    sm.transition('completed');
    expect(sm.getStatus()).toBe('completed');
  });

  it('transitions running → failed', () => {
    const sm = new ExecutionStateMachine();
    sm.transition('running');
    sm.transition('failed');
    expect(sm.getStatus()).toBe('failed');
  });

  it('transitions running → cancelled', () => {
    const sm = new ExecutionStateMachine();
    sm.transition('running');
    sm.transition('cancelled');
    expect(sm.getStatus()).toBe('cancelled');
  });

  it('transitions running → paused', () => {
    const sm = new ExecutionStateMachine();
    sm.transition('running');
    sm.transition('paused');
    expect(sm.getStatus()).toBe('paused');
  });

  it('transitions paused → running', () => {
    const sm = new ExecutionStateMachine();
    sm.transition('running');
    sm.transition('paused');
    sm.transition('running');
    expect(sm.getStatus()).toBe('running');
  });

  it('throws on invalid transition', () => {
    const sm = new ExecutionStateMachine();
    expect(() => sm.transition('completed')).toThrow('Cannot transition');
  });

  it('canTransition returns true for valid', () => {
    const sm = new ExecutionStateMachine();
    expect(sm.canTransition('running')).toBe(true);
  });

  it('canTransition returns false for invalid', () => {
    const sm = new ExecutionStateMachine();
    expect(sm.canTransition('completed')).toBe(false);
  });

  it('isTerminal for completed', () => {
    const sm = new ExecutionStateMachine();
    sm.transition('running');
    sm.transition('completed');
    expect(sm.isTerminal()).toBe(true);
  });

  it('isTerminal for cancelled', () => {
    const sm = new ExecutionStateMachine();
    sm.transition('running');
    sm.transition('cancelled');
    expect(sm.isTerminal()).toBe(true);
  });

  it('isTerminal for failed', () => {
    const sm = new ExecutionStateMachine();
    sm.transition('running');
    sm.transition('failed');
    expect(sm.isTerminal()).toBe(true);
  });

  it('isTerminal for pending', () => {
    const sm = new ExecutionStateMachine();
    expect(sm.isTerminal()).toBe(false);
  });

  it('canCancel for running', () => {
    const sm = new ExecutionStateMachine();
    sm.transition('running');
    expect(sm.canCancel()).toBe(true);
  });

  it('canCancel for completed', () => {
    const sm = new ExecutionStateMachine();
    sm.transition('running');
    sm.transition('completed');
    expect(sm.canCancel()).toBe(false);
  });

  it('canPause for running', () => {
    const sm = new ExecutionStateMachine();
    sm.transition('running');
    expect(sm.canPause()).toBe(true);
  });

  it('canPause for pending', () => {
    const sm = new ExecutionStateMachine();
    expect(sm.canPause()).toBe(false);
  });

  it('canResume for paused', () => {
    const sm = new ExecutionStateMachine();
    sm.transition('running');
    sm.transition('paused');
    expect(sm.canResume()).toBe(true);
  });

  it('canResume for running', () => {
    const sm = new ExecutionStateMachine();
    sm.transition('running');
    expect(sm.canResume()).toBe(false);
  });

  it('step state transitions', () => {
    const sm = new ExecutionStateMachine();
    sm.setStepState('step-1', 'running');
    expect(sm.getStepState('step-1')).toBe('running');
    sm.setStepState('step-1', 'completed');
    expect(sm.getStepState('step-1')).toBe('completed');
  });

  it('step state defaults to pending', () => {
    const sm = new ExecutionStateMachine();
    expect(sm.getStepState('step-1')).toBe('pending');
  });

  it('canStepTransition', () => {
    const sm = new ExecutionStateMachine();
    expect(sm.canStepTransition('step-1', 'running')).toBe(true);
    expect(sm.canStepTransition('step-1', 'completed')).toBe(false);
  });

  it('reset', () => {
    const sm = new ExecutionStateMachine();
    sm.transition('running');
    sm.reset();
    expect(sm.getStatus()).toBe('pending');
  });
});

describe('getValidTransitions', () => {
  it('returns transitions for pending', () => {
    expect(getValidTransitions('pending')).toContain('running');
  });
});

describe('getValidStepTransitions', () => {
  it('returns transitions for pending', () => {
    expect(getValidStepTransitions('pending')).toContain('running');
  });
});

describe('isTerminalStatus', () => {
  it('completed is terminal', () => {
    expect(isTerminalStatus('completed')).toBe(true);
  });

  it('running is not terminal', () => {
    expect(isTerminalStatus('running')).toBe(false);
  });
});
