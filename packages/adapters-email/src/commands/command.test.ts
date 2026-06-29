/**
 * Adapter command-level tests. We invoke the command handler directly
 * with a mock HermesPort (Hermes is structurally a HermesPort) so no
 * Email runtime touches the test.
 */
import { describe, expect, it } from 'vitest';
import type { HermesPort } from '@agent-os/hermes';
import { createMockHermes } from '@agent-os/hermes/test-utils';
import { startCommand } from './StartCommand.js';
import { stopCommand } from './StopCommand.js';
import { statusCommand } from './StatusCommand.js';
import type { EmailContext } from '../types.js';

const ctx = (hermes: HermesPort): EmailContext => ({
  hermes,
  senderEmail: 'admin@example.com',
  role: 'admin',
  now: () => 0,
});

describe('Email command handlers', () => {
  it('startCommand propagates a Hermes err Result', async () => {
    const failing = createMockHermes({
      startResult: async () => ({ ok: false, error: new Error('nope') }),
    });
    const r = await startCommand.handler(ctx(failing), { options: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('HERMES');
  });

  it('startCommand returns ok on happy path', async () => {
    const hermes = createMockHermes({ phase: 'RUNNING' });
    const r = await startCommand.handler(ctx(hermes), { options: {} });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.text).toContain('RUNNING');
  });

  it('stopCommand propagates a Hermes err Result', async () => {
    const failing = createMockHermes({
      stopResult: async () => ({ ok: false, error: new Error('nope') }),
    });
    const r = await stopCommand.handler(ctx(failing), { options: {} });
    expect(r.ok).toBe(false);
  });

  it('statusCommand is hermes-invariant — returns the current phase', async () => {
    const hermes = createMockHermes({ phase: 'RUNNING', modules: 3, uptime: 1000 as never });
    const r = await statusCommand.handler(ctx(hermes), { options: {} });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.text).toContain('RUNNING');
      expect(r.value.text).toContain('3');
    }
  });
});
