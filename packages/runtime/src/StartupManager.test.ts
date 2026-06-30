import { describe, it, expect } from 'vitest';
import { createStartupManager } from './StartupManager.js';

describe('StartupManager', () => {
  it('starts in idle phase', () => {
    const sm = createStartupManager({});
    expect(sm.status().phase).toBe('idle');
  });

  it('runs steps in dependency order', async () => {
    const order: string[] = [];
    const sm = createStartupManager({
      steps: [
        {
          name: 'db',
          startup: async () => {
            order.push('db');
          },
        },
        {
          name: 'cache',
          startup: async () => {
            order.push('cache');
          },
        },
        {
          name: 'app',
          dependencies: ['db', 'cache'],
          startup: async () => {
            order.push('app');
          },
        },
      ],
    });
    const status = await sm.start();
    expect(status.phase).toBe('running');
    expect(order).toEqual(['db', 'cache', 'app']);
    expect(status.startedSteps).toEqual(['db', 'cache', 'app']);
  });

  it('rolls back on failure', async () => {
    const rolledBack: string[] = [];
    const sm = createStartupManager({
      steps: [
        {
          name: 'db',
          startup: async () => {},
          rollback: async () => {
            rolledBack.push('db');
          },
        },
        {
          name: 'fail',
          startup: async () => {
            throw new Error('boom');
          },
        },
      ],
    });
    const status = await sm.start();
    expect(status.phase).toBe('rolled-back');
    expect(status.failedStep).toBe('fail');
    expect(rolledBack).toEqual(['db']);
  });

  it('rolls back in reverse order', async () => {
    const rolledBack: string[] = [];
    const sm = createStartupManager({
      steps: [
        {
          name: 'a',
          startup: async () => {},
          rollback: async () => {
            rolledBack.push('a');
          },
        },
        {
          name: 'b',
          startup: async () => {},
          rollback: async () => {
            rolledBack.push('b');
          },
        },
        {
          name: 'c',
          startup: async () => {
            throw new Error('fail');
          },
        },
      ],
    });
    await sm.start();
    expect(rolledBack).toEqual(['b', 'a']);
  });

  it('respects timeout', async () => {
    const sm = createStartupManager({
      timeoutMs: 50,
      steps: [
        {
          name: 'slow',
          startup: async () => {
            await new Promise((r) => setTimeout(r, 200));
          },
        },
      ],
    });
    const status = await sm.start();
    expect(status.phase).toBe('failed');
  }, 100);

  it('records duration', async () => {
    const sm = createStartupManager({
      steps: [{ name: 'fast', startup: async () => {} }],
    });
    const status = await sm.start();
    expect(status.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('handles empty steps', async () => {
    const sm = createStartupManager({});
    const status = await sm.start();
    expect(status.phase).toBe('running');
    expect(status.startedSteps).toEqual([]);
  });

  it('dynamically adds and removes steps', async () => {
    const order: string[] = [];
    const sm = createStartupManager({});
    sm.addStep({
      name: 'x',
      startup: async () => {
        order.push('x');
      },
    });
    sm.addStep({
      name: 'y',
      startup: async () => {
        order.push('y');
      },
    });
    sm.removeStep('x');
    await sm.start();
    expect(order).toEqual(['y']);
  });
});
