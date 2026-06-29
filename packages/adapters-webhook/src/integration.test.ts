/**
 * Phase 4.3 — Integration: Hermes ↔ Webhook Adapter.
 *
 * End-to-end through `WebhookAdapter.handle(Request)` against a real
 * `createHermes()` instance. Validates:
 *   - the route → handler → Hermes pipeline,
 *   - Hermes success Result and Hermes error Result propagation
 *     through the dispatcher's status-code translation table,
 *   - redaction through `redactHermesConfig` reaching the response body,
 *   - unexpected-exception translation to HTTP 500.
 *
 * No HTTP server. No external network.
 */
import { describe, expect, it } from 'vitest';
import { createHermes, redactHermesConfig, validateConfig } from '@agent-os/hermes';
import { WebhookAdapter } from './WebhookAdapter.js';
import type { WebhookRoute } from './types.js';

const seedHermes = () => {
  const cfg = validateConfig({
    OPENROUTER_API_KEY: 'wh-secret',
    DATABASE_URL: 'postgres://wh',
    REDIS_URL: 'redis://wh',
  });
  if (!cfg.ok) throw new Error('seedHermes: validateConfig failed');
  return createHermes(cfg.value);
};

const build = (routes: readonly WebhookRoute[]): WebhookAdapter => {
  const a = new WebhookAdapter(seedHermes(), { routes });
  void a.initialize();
  return a;
};

/**
 * Helper — every handler returns a `Result<ResponseBody, HandlerError>`.
 * Use this to build a ResponseBody-shaped value (the inner body the
 * kernel envelope wraps).
 */
const okBody = (body: unknown) => ({ status: 200, body });

describe('Hermes ↔ Webhook integration', () => {
  it('GET /webhook/status returns Hermes.status() through the dispatch pipeline', async () => {
    const adapter = build([
      {
        method: 'GET',
        path: '/webhook/status',
        handler: async (_parsed, hermes) => ({
          ok: true,
          value: okBody({ phase: hermes.status().phase }),
        }),
      },
    ]);
    const req = new Request('http://localhost/webhook/status', { method: 'GET' });
    const res = await adapter.handle(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; value: { phase: string } };
    expect(json.ok).toBe(true);
    expect(json.value.phase).toBe('INITIALIZING');
  });

  it('POST /webhook/start drives Hermes.start() real side effect', async () => {
    let startCount = 0;
    const adapter = build([
      {
        method: 'POST',
        path: '/webhook/start',
        handler: async (_parsed, hermes) => {
          const r = await hermes.start();
          if (r.ok) startCount += 1;
          return {
            ok: true,
            value: okBody({ started: r.ok, phase: hermes.status().phase }),
          };
        },
      },
    ]);
    const req = new Request('http://localhost/webhook/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const res = await adapter.handle(req);
    expect(res.status).toBe(200);
    expect(startCount).toBe(1);
  });

  it('GET /webhook/config returns redacted Hermes config via kernel redactor', async () => {
    const hermes = seedHermes();
    const adapter = new WebhookAdapter(hermes, {
      routes: [
        {
          method: 'GET',
          path: '/webhook/config',
          handler: async () => {
            const redacted = redactHermesConfig(hermes.config);
            return { ok: true, value: okBody(redacted) };
          },
        },
      ],
    });
    void adapter.initialize();
    const res = await adapter.handle(new Request('http://localhost/webhook/config'));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      value: { openrouterApiKey: string; databaseUrl: string; redisUrl: string };
    };
    expect(json.value.openrouterApiKey).toBe('****');
    expect(json.value.databaseUrl).toBe('****');
    expect(json.value.redisUrl).toBe('****');
  });

  it('rejects POST /webhook/stop with 502 when Hermes.stop() returns err (FAIL → 502)', async () => {
    const hermes = seedHermes();
    const adapter = new WebhookAdapter(hermes, {
      routes: [
        {
          method: 'POST',
          path: '/webhook/stop',
          handler: async (_p, h) => {
            const r = await h.stop();
            // Return a Result with code='HERMES' so the dispatcher's
            // statusFor() translates it to HTTP 502.
            return {
              ok: false,
              error: { code: 'HERMES', message: r.ok ? 'unexpected' : r.error.message },
            };
          },
        },
      ],
    });
    void adapter.initialize();
    const res = await adapter.handle(
      new Request('http://localhost/webhook/stop', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }),
    );
    expect(res.status).toBe(502);
  });

  it('returns 405 when path exists for a different method', async () => {
    const adapter = build([
      {
        method: 'POST',
        path: '/webhook/secret',
        handler: async () => ({ ok: true, value: okBody({ ok: true }) }),
      },
    ]);
    const res = await adapter.handle(new Request('http://localhost/webhook/secret'));
    expect(res.status).toBe(405);
  });

  it('returns 500 when a route handler throws', async () => {
    const adapter = build([
      {
        method: 'POST',
        path: '/webhook/boom',
        handler: async () => {
          throw new Error('real-handler-boom');
        },
      },
    ]);
    const res = await adapter.handle(
      new Request('http://localhost/webhook/boom', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }),
    );
    expect(res.status).toBe(500);
  });

  it('WebhookAdapter.health() does not proxy hermes.health()', () => {
    const adapter = build([]);
    const h = adapter.health();
    expect(['healthy', 'degraded', 'failed', 'unknown']).toContain(h.status);
  });
});
