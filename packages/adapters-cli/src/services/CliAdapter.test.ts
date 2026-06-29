/**
 * Adapter-level tests for createCliAdapter().
 *
 * The CLI adapter is a closure over `hermes`, `permissions`, and a
 * command registry. We exercise it via a mock HermesPort so the test
 * stays offline.
 */
import { describe, expect, it } from 'vitest';
import { okOf } from '@agent-os/core/test-utils';
import { createMockHermes } from '@agent-os/hermes/test-utils';
import { createCliAdapter } from './CliAdapter.js';

const bootAdapter = (hermes = createMockHermes()) => {
  const adapter = createCliAdapter();
  void adapter.initialize({ hermes, role: 'admin' });
  void adapter.start();
  return adapter;
};

describe('CLI adapter — lifecycle', () => {
  it('initialize/start/health/metadata do not throw and report correct shape', async () => {
    const adapter = bootAdapter();
    await adapter.initialize({ hermes: createMockHermes(), role: 'admin' });
    const start = await adapter.start();
    expect(start.ok).toBe(true);

    const h = await adapter.health();
    expect(['healthy', 'degraded', 'failed', 'unknown']).toContain(h.status);

    const m = adapter.metadata();
    expect(m.interfaceType).toBe('cli');
    expect(m.name).toMatch(/adapters-cli/);
  });

  it('metadata reports all seven supported operations after initialize', async () => {
    const adapter = createCliAdapter();
    await adapter.initialize({ hermes: createMockHermes(), role: 'admin' });
    const m = adapter.metadata();
    expect(m.supportedOperations.length).toBe(7);
  });
});

describe('CLI adapter — dispatch', () => {
  it('returns exitCode=2 for an unknown command', async () => {
    const adapter = bootAdapter();
    const result = await adapter.dispatch(['nope']);
    expect(result.exitCode).toBe(2);
  });

  it('returns exitCode=2 when no command is supplied', async () => {
    const adapter = bootAdapter();
    const result = await adapter.dispatch([]);
    expect(result.exitCode).toBe(2);
  });

  it('dispatch of "version" returns a rendered Result', async () => {
    const adapter = bootAdapter();
    const result = await adapter.dispatch(['version']);
    expect(result.exitCode).toBe(0);
    expect(result.rendered).toBeDefined();
  });

  it('"--help" prints the help registry', async () => {
    const adapter = bootAdapter();
    const result = await adapter.dispatch(['--help']);
    expect(result.exitCode).toBe(0);
  });

  it('refuses when hermes.start() returns err', async () => {
    const failing = createMockHermes({
      startResult: async () => ({ ok: false, error: new Error('nope') }),
    });
    const adapter = bootAdapter(failing);
    const result = await adapter.dispatch(['start']);
    // start handler propagates the Hermes err Result and the dispatcher
    // maps it to a non-zero exit code.
    expect(result.exitCode).toBeGreaterThan(0);
  });
});

describe('CLI adapter — registry', () => {
  it('getRegistry exposes the default seven commands', () => {
    const adapter = createCliAdapter();
    const r = adapter.getRegistry();
    expect(r.names().length).toBe(7);
  });

  it('supports registering additional commands before dispatch', () => {
    const adapter = createCliAdapter();
    const cmd = {
      name: 'say-hello',
      description: 'Print hello',
      handler: async (_ctx: never, _args: never) => okOf('hello'),
    };
    adapter.getRegistry().register(cmd as never);
    expect(adapter.getRegistry().get('say-hello')).toBeDefined();
  });
});
