import { describe, it, expect } from 'vitest';
import { createShutdownManager } from './ShutdownManager.js';

describe('ShutdownManager', () => {
  it('starts in idle phase', () => {
    const sm = createShutdownManager({});
    expect(sm.status().phase).toBe('idle');
  });

  it('runs shutdown steps in reverse order', async () => {
    const order: string[] = [];
    const sm = createShutdownManager({
      steps: [
        {
          name: 'first',
          shutdown: async () => {
            order.push('first');
          },
        },
        {
          name: 'second',
          shutdown: async () => {
            order.push('second');
          },
        },
        {
          name: 'third',
          shutdown: async () => {
            order.push('third');
          },
        },
      ],
    });
    const status = await sm.shutdown();
    expect(status.phase).toBe('stopped');
    expect(order).toEqual(['third', 'second', 'first']);
  });

  it('prevents duplicate shutdown', async () => {
    let callCount = 0;
    const sm = createShutdownManager({
      steps: [
        {
          name: 'only',
          shutdown: async () => {
            callCount++;
          },
        },
      ],
    });
    await sm.shutdown();
    await sm.shutdown();
    expect(callCount).toBe(1);
  });

  it('marks step as failed on error', async () => {
    const sm = createShutdownManager({
      steps: [
        { name: 'good', shutdown: async () => {} },
        {
          name: 'bad',
          shutdown: async () => {
            throw new Error('fail');
          },
        },
        { name: 'never', shutdown: async () => {} },
      ],
    });
    const status = await sm.shutdown();
    expect(status.phase).toBe('timed-out');
    expect(status.failedStep).toBe('bad');
  });

  it('respects timeout', async () => {
    const sm = createShutdownManager({
      timeoutMs: 50,
      steps: [
        {
          name: 'slow',
          shutdown: async () => {
            await new Promise((r) => setTimeout(r, 200));
          },
        },
      ],
    });
    const status = await sm.shutdown();
    expect(status.phase).toBe('timed-out');
  }, 100);

  it('records duration', async () => {
    const sm = createShutdownManager({
      steps: [{ name: 'fast', shutdown: async () => {} }],
    });
    const status = await sm.shutdown();
    expect(status.durationMs).toBeGreaterThanOrEqual(0);
    expect(status.startedAt).toBeDefined();
    expect(status.completedAt).toBeDefined();
  });

  it('dynamically adds and removes steps', async () => {
    const order: string[] = [];
    const sm = createShutdownManager({});
    sm.addStep({
      name: 'a',
      shutdown: async () => {
        order.push('a');
      },
    });
    sm.addStep({
      name: 'b',
      shutdown: async () => {
        order.push('b');
      },
    });
    sm.removeStep('a');
    await sm.shutdown();
    expect(order).toEqual(['b']);
  });

  it('installs signal handlers', () => {
    const sm = createShutdownManager({});
    const originalListeners = process.listenerCount('SIGINT');
    sm.installSignalHandlers();
    expect(process.listenerCount('SIGINT')).toBe(originalListeners + 1);
    // Cleanup
    process.removeAllListeners('SIGINT');
  });
});
