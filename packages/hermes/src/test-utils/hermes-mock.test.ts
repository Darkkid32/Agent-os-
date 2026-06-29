import { describe, expect, it } from 'vitest';
import { err, type Timestamp } from '@agent-os/core';
import { expectErr, expectOk } from '@agent-os/core/test-utils';
import { createMockHermes, failingHermes } from './hermes-mock.js';

describe('createMockHermes', () => {
  it('returns a structurally-correct Hermes with default ok-returns', async () => {
    const hermes = createMockHermes();
    expect(hermes.status().phase).toBe('STOPPED');
    expect(hermes.status().modules).toBe(0);

    const start = await hermes.start();
    expectOk(start);
    const stop = await hermes.stop();
    expectOk(stop);

    const r = hermes.registerModule({
      name: 'm',
      version: '0.0.0',
      dependencies: [],
      required: false,
      healthCheck: () => 'healthy',
      shutdown: async () => undefined,
    });
    expectOk(r);
  });

  it('respects override phase and modules count', () => {
    const hermes = createMockHermes({
      phase: 'RUNNING',
      modules: 4,
      uptime: 1234 as unknown as Timestamp,
    });
    expect(hermes.status().phase).toBe('RUNNING');
    expect(hermes.status().modules).toBe(4);
    expect(hermes.status().uptime).toBe(1234);
  });

  it('startResult override propagates the err side', async () => {
    const hermes = createMockHermes({
      startResult: async () => err(new Error('cannot-start')),
    });
    const r = await hermes.start();
    expectErr(r);
  });

  it('config is frozen and accepts overrides', () => {
    const hermes = createMockHermes({ config: { logLevel: 'debug' } });
    expect(hermes.config.logLevel).toBe('debug');
    expect(Object.isFrozen(hermes.config)).toBe(true);
  });
});

describe('failingHermes', () => {
  it('returns err from both start and stop', async () => {
    const hermes = failingHermes('broken');
    expectErr(await hermes.start());
    expectErr(await hermes.stop());
  });
});
