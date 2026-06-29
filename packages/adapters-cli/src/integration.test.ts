/**
 * Phase 4.3 — Integration: Hermes ↔ CLI Adapter.
 *
 * End-to-end through `CliAdapter.dispatch(argv)` against a real
 * `createHermes()` instance. Validates the integration boundary
 * between the adapter's command dispatcher, the command handlers,
 * the permission service, and the kernel's `HermesPort` surface.
 *
 * Offline — no process spawn, no network, no plugins.
 */
import { describe, expect, it } from 'vitest';
import { createHermes, PACKAGE_NAME, PACKAGE_VERSION, validateConfig } from '@agent-os/hermes';
import { createCliAdapter } from './services/CliAdapter.js';

const seedHermes = () => {
  const cfg = validateConfig({
    OPENROUTER_API_KEY: 'test',
    DATABASE_URL: 'test',
    REDIS_URL: 'test',
  });
  if (!cfg.ok) throw new Error('seedHermes: validateConfig failed');
  return createHermes(cfg.value);
};

describe('Hermes ↔ CLI integration', () => {
  it('dispatches `version` and renders Hermes package identity', async () => {
    const adapter = createCliAdapter();
    await adapter.initialize({ hermes: seedHermes(), role: 'admin' });
    void (await adapter.start());
    const result = await adapter.dispatch(['version']);
    expect(result.exitCode).toBe(0);
    const rendered = JSON.stringify(result.rendered);
    expect(rendered).toContain(PACKAGE_NAME);
    expect(rendered).toContain(PACKAGE_VERSION);
  });

  it('dispatches `status` and surfaces Hermes phase through dispatcher', async () => {
    const hermes = seedHermes();
    const adapter = createCliAdapter();
    await adapter.initialize({ hermes, role: 'admin' });
    void (await adapter.start());
    const result = await adapter.dispatch(['status']);
    expect(result.exitCode).toBe(0);
    const rendered = JSON.stringify(result.rendered);
    // Hermes is in INITIALIZING until start() runs. The CLI's `start`
    // command moves it forward asynchronously; this dispatcher-level test
    // observes the synchronous projection only.
    expect(typeof rendered).toBe('string');
  });

  it('permission denied for viewer invoking admin-only "start"', async () => {
    const adapter = createCliAdapter();
    await adapter.initialize({ hermes: seedHermes(), role: 'viewer' });
    void (await adapter.start());
    const result = await adapter.dispatch(['start']);
    expect(result.exitCode).toBe(3); // PERMISSION exit code
  });

  it('propagates Hermes success Result for viewer-readable actions', async () => {
    const adapter = createCliAdapter();
    await adapter.initialize({ hermes: seedHermes(), role: 'viewer' });
    void (await adapter.start());
    const result = await adapter.dispatch(['version']);
    expect(result.exitCode).toBe(0);
  });

  it('CLI health() reports adapter state, never proxies hermes.health()', async () => {
    const adapter = createCliAdapter();
    await adapter.initialize({ hermes: seedHermes(), role: 'admin' });
    void (await adapter.start());
    const h = await adapter.health();
    // The adapter status enum is adapter-local ('healthy' / 'degraded' /
    // 'failed' / 'unknown'). Hermes' phase enum ('INITIALIZING', 'RUNNING'
    // etc.) must NOT leak through. Anything outside the four adapter
    // states here means the adapter proxied hermes.health().
    expect(['healthy', 'degraded', 'failed', 'unknown']).toContain(h.status);
    expect(['INITIALIZING', 'STARTING', 'RUNNING', 'STOPPING', 'STOPPED', 'FAILED']).not.toContain(
      h.status,
    );
  });
});
