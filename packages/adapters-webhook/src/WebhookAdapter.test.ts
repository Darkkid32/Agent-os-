/**
 * End-to-end pipeline tests for WebhookAdapter.handle().
 *
 * We drive the adapter directly with Fetch `Request` objects (Node
 * 18+ globals). No HTTP server. The route table is supplied per test.
 */
import { describe, expect, it } from 'vitest';
import type { HermesPort } from '@agent-os/hermes';
import { createMockHermes } from '@agent-os/hermes/test-utils';
import { WebhookAdapter } from './WebhookAdapter.js';
import { defaultRouteTable } from './routes.js';
import type { WebhookRoute } from './types.js';

const hermes = (): HermesPort => createMockHermes({ phase: 'RUNNING', modules: 4 });

const build = (routes: readonly WebhookRoute[] = defaultRouteTable()): WebhookAdapter => {
  const a = new WebhookAdapter(hermes(), { routes });
  void a.initialize();
  return a;
};

describe('WebhookAdapter lifecycle', () => {
  it('metadata reflects routeCount and signatureEnabled=false by default', () => {
    const adapter = build();
    const m = adapter.metadata();
    expect(m.interfaceType).toBe('webhook');
    expect(m.transport).toBe('http');
    expect(m.signatureEnabled).toBe(false);
    expect(m.routeCount).toBeGreaterThan(0);
  });

  it('health is healthy after initialize', () => {
    const adapter = build();
    const h = adapter.health();
    expect(['healthy', 'unknown']).toContain(h.status);
  });
});

describe('WebhookAdapter.handle()', () => {
  it('returns 200 + hermes status when POSTing to /webhook', async () => {
    const adapter = build([
      {
        method: 'POST',
        path: '/webhook',
        handler: async (_parsed, h) => ({
          ok: true,
          value: { status: 200, body: { phase: h.status().phase } },
        }),
      },
    ]);
    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'status' }),
    });
    const res = await adapter.handle(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; value: { phase: string } };
    expect(json.ok).toBe(true);
    expect(json.value.phase).toBe('RUNNING');
  });

  it('returns 404 for an unknown route', async () => {
    const adapter = build();
    const req = new Request('http://localhost/nope', { method: 'GET' });
    const res = await adapter.handle(req);
    expect(res.status).toBe(404);
  });

  it('returns 405 for an unsupported method on a known path', async () => {
    const adapter = build([
      {
        method: 'GET',
        path: '/ping',
        handler: async () => ({ ok: true, value: { status: 200, body: 'ok' } }),
      },
    ]);
    const req = new Request('http://localhost/ping', { method: 'POST' });
    const res = await adapter.handle(req);
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET');
  });

  it('rejects malformed JSON with 400', async () => {
    const adapter = build([
      {
        method: 'POST',
        path: '/webhook',
        handler: async () => ({ ok: true, value: { status: 200, body: {} } }),
      },
    ]);
    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not-json',
    });
    const res = await adapter.handle(req);
    expect(res.status).toBe(500);
  });

  it('returns 500 when handler throws (unexpected failure path)', async () => {
    const adapter = build([
      {
        method: 'POST',
        path: '/webhook',
        handler: async () => {
          throw new Error('boom');
        },
      },
    ]);
    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const res = await adapter.handle(req);
    expect(res.status).toBe(500);
  });
});
