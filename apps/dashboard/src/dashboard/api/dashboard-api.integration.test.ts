/**
 * Phase 4.3 — Integration: apps/dashboard ↔ REST surface.
 *
 * Validates the dashboard's data-layer pipeline end-to-end:
 *   - `MockDashboardClient` returns the canned envelope,
 *   - `FetchDashboardClient` calls the canonical REST verbs `/v1/*`
 *     and unwraps the kernel envelope into the dashboard's
 *     `DashboardEnvelope<T>` shape.
 *
 * No React, no DOM, no fetch against real HTTP. `globalThis.fetch`
 * is overridden per test. The `getDashboardClient` provider's
 * module-level memoisation is incompatible with per-test
 * reconfiguration in the same process; that piece of contract
 * is exercised by direct constructor tests below.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FetchDashboardClient } from './client';
import { MockDashboardClient } from './mock';
import type { DashboardEnvelope, HermesStatusDTO, HermesVersionDTO } from './types';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('MockDashboardClient', () => {
  it('returns canned status envelope with ok=true', async () => {
    const client = new MockDashboardClient();
    const env = await client.status();
    expect(env.ok).toBe(true);
    if (env.ok) {
      expect(env.data.phase).toBe('INITIALIZING');
      expect(typeof env.requestId).toBe('string');
      expect(typeof env.at).toBe('string');
    }
  });

  it('returns canned version envelope with the kernel package identity', async () => {
    const client = new MockDashboardClient();
    const env = await client.version();
    expect(env.ok).toBe(true);
    if (env.ok) {
      expect(env.data.name).toBe('@agent-os/hermes');
      expect(env.data.version).toMatch(/^\d+\.\d+\.\d+/);
    }
  });

  it('config envelope has secrets already ****-redacted', async () => {
    const client = new MockDashboardClient();
    const env = await client.config();
    expect(env.ok).toBe(true);
    if (env.ok) {
      expect(env.data.openrouterApiKey).toBe('****');
      expect(env.data.databaseUrl).toBe('****');
      expect(env.data.redisUrl).toBe('****');
      expect(env.data.nodeEnv).toBe('development');
    }
  });
});

describe('FetchDashboardClient', () => {
  it('calls the REST surface and unwraps the success envelope into DashboardEnvelope', async () => {
    const captured: { url?: string; method?: string } = {};
    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      captured.url = url;
      captured.method = 'GET';
      const body = {
        ok: true,
        value: { phase: 'RUNNING', uptime: 9999, modules: 7 },
        requestId: 'test-req',
        at: new Date().toISOString(),
      };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;
    /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    const client = new FetchDashboardClient('/v1');
    const env = await client.status();
    expect(captured.url).toBe('/v1/status');
    expect(env.ok).toBe(true);
    if (env.ok) {
      expect(env.data.phase).toBe('RUNNING');
      expect(env.data.uptime).toBe(9999);
      expect(env.data.modules).toBe(7);
    }
  });

  it('returns an error envelope when fetch receives a non-2xx', async () => {
    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    globalThis.fetch = vi.fn(
      async (): Promise<Response> => new Response(JSON.stringify({ error: 'e' }), { status: 500 }),
    ) as typeof fetch;
    /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    const client = new FetchDashboardClient('/v1');
    const env = await client.version();
    expect(env.ok).toBe(false);
    if (!env.ok) {
      expect(env.error.code).toBe('HTTP_500');
      expect(env.error.message).toContain('500');
    }
  });

  it('returns NETWORK_ERROR envelope when fetch itself throws', async () => {
    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    globalThis.fetch = vi.fn(async (): Promise<Response> => {
      throw new Error('boom');
    }) as typeof fetch;
    /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    const client = new FetchDashboardClient('/v1');
    const env = await client.modules();
    expect(env.ok).toBe(false);
    if (!env.ok) {
      expect(env.error.code).toBe('NETWORK_ERROR');
    }
  });

  it('forwards x-request-id header', async () => {
    const seenHeaders: Record<string, string> = {};
    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    globalThis.fetch = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const headers = new Headers(init?.headers);
        headers.forEach((v, k) => {
          seenHeaders[k.toLowerCase()] = v;
        });
        const body: DashboardEnvelope<HermesVersionDTO> = {
          ok: true,
          data: { name: '@agent-os/hermes', version: '1.0.0' },
          requestId: 'rid',
          at: new Date().toISOString(),
        };
        return new Response(JSON.stringify(body), { status: 200 });
      },
    ) as typeof fetch;
    /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    const client = new FetchDashboardClient('/v1');
    await client.version();
    expect(seenHeaders['x-request-id']).toBeDefined();
  });

  it('calls plugins and metrics endpoints', async () => {
    const seen: string[] = [];
    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      seen.push(url);
      const body = url.endsWith('/plugins')
        ? { ok: true, value: { count: 0, items: [] }, requestId: 'r', at: new Date().toISOString() }
        : {
            ok: true,
            value: { count: 0, items: [] },
            requestId: 'r',
            at: new Date().toISOString(),
          };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as typeof fetch;
    /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    const client = new FetchDashboardClient('/v1');
    await client.plugins();
    await client.metrics();
    expect(seen).toEqual(['/v1/plugins', '/v1/metrics']);
  });

  it('default baseUrl is /v1', async () => {
    const seen: { url?: string } = {};
    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      seen.url = url;
      const body: DashboardEnvelope<{ count: number }> = {
        ok: true,
        data: { count: 0 },
        requestId: 'r',
        at: new Date().toISOString(),
      };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as typeof fetch;
    /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    const client = new FetchDashboardClient();
    await client.modules();
    expect(seen.url?.startsWith('/v1/')).toBe(true);
  });

  it('strips trailing slash from baseUrl', async () => {
    const seen: { url?: string } = {};
    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      seen.url = url;
      const body: DashboardEnvelope<HermesStatusDTO> = {
        ok: true,
        data: { phase: 'RUNNING', uptime: 1, modules: 0 },
        requestId: 'r',
        at: new Date().toISOString(),
      };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as typeof fetch;
    /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    const client = new FetchDashboardClient('/v1/');
    await client.status();
    expect(seen.url?.startsWith('/v1/status')).toBe(true);
  });
});

describe('Dashboard envelope shape (consumer contract)', () => {
  it('envelope has ok=true + data on success', () => {
    const env: DashboardEnvelope<{ value: number }> = {
      ok: true,
      data: { value: 1 },
      requestId: 'r',
      at: new Date().toISOString(),
    };
    expect(env.ok).toBe(true);
    if (env.ok) expect(env.data.value).toBe(1);
  });

  it('envelope has ok=false + error.code + error.message on failure', () => {
    const env: DashboardEnvelope<never> = {
      ok: false,
      error: { code: 'E', message: 'm' },
      requestId: 'r',
      at: new Date().toISOString(),
    };
    expect(env.ok).toBe(false);
    if (!env.ok) {
      expect(env.error.code).toBe('E');
      expect(env.error.message).toBe('m');
    }
  });
});
