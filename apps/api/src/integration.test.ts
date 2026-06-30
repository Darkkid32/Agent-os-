/**
 * Phase 4.3 — Integration: apps/api ↔ Hermes via Fastify.inject.
 *
 * Bootstraps `buildApp({ hermes })` end-to-end, drives HTTP requests
 * through the in-process `Fastify.inject` pipeline, and asserts the
 * kernel envelope contract (`{ ok, value }` / `{ ok, error }`) and
 * the secret-redaction contract on `/v1/config`.
 *
 * No network. No external server.
 */
import { describe, expect, it } from 'vitest';
import { createHermes, PACKAGE_NAME, PACKAGE_VERSION, validateConfig } from '@agent-os/hermes';
import { createMetricRegistry, type MetricRegistry } from '@agent-os/observability';
import { buildApp } from './app.js';
import { healthRoutes } from './routes/health.js';
import { versionRoutes } from './routes/version.js';
import { hermesRoutes } from './routes/hermes.js';

const seedHermes = (metricRegistry?: MetricRegistry) => {
  const cfg = validateConfig({
    OPENROUTER_API_KEY: 'api-secret',
    DATABASE_URL: 'postgres://api',
    REDIS_URL: 'redis://api',
  });
  if (!cfg.ok) throw new Error('seedHermes: validateConfig failed');
  return createHermes(cfg.value, metricRegistry ? { metricRegistry } : {});
};

const seedModule = {
  name: 'test-plugin',
  version: '1.2.3',
  dependencies: [],
  required: false,
  healthCheck: () => 'healthy' as const,
  shutdown: async () => undefined,
};

describe('apps/api ↔ Hermes integration', () => {
  it('buildApp() without hermes exposes only the two legacy routes (production path)', async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const v = await app.inject({ method: 'GET', url: '/v1/status' });
    // Hermes routes are NOT registered without a Hermes instance.
    expect(v.statusCode).toBe(404);
    await app.close();
  });

  it('GET /v1/status reflects live Hermes.status() through Fastify pipeline', async () => {
    const hermes = seedHermes();
    const app = await buildApp({ logger: false, hermes });
    const res = await app.inject({ method: 'GET', url: '/v1/status' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean; value: { phase: string } };
    expect(body.ok).toBe(true);
    expect(body.value.phase).toBe('INITIALIZING');
    await app.close();
  });

  it('GET /v1/health awaits hermes.health() and returns the report', async () => {
    const hermes = seedHermes();
    const app = await buildApp({ logger: false, hermes });
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean; value: { status: string; modules: unknown[] } };
    expect(body.ok).toBe(true);
    expect(typeof body.value.status).toBe('string');
    expect(Array.isArray(body.value.modules)).toBe(true);
    await app.close();
  });

  it('POST /v1/start drives Hermes.start() and returns the kernel envelope', async () => {
    const hermes = seedHermes();
    const app = await buildApp({ logger: false, hermes });
    const res = await app.inject({ method: 'POST', url: '/v1/start' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean; value: { started: true; phase: string } };
    expect(body.ok).toBe(true);
    expect(body.value.started).toBe(true);
    expect(hermes.status().phase).toBe('STARTING');
    await app.close();
  });

  it('POST /v1/stop returns the platform-spec error envelope (PHASE_CONFLICT, 409) when stop is illegal', async () => {
    const hermes = seedHermes();
    const app = await buildApp({ logger: false, hermes });
    const res = await app.inject({ method: 'POST', url: '/v1/stop' });
    const body = res.json() as { ok: boolean; error?: { code: string; message: string } };
    expect(res.statusCode).toBe(409);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe('PHASE_CONFLICT');
    expect(body.error?.message).toMatch(
      /operation not allowed in phase|illegal transition|cannot stop from/,
    );
    await app.close();
  });

  it('GET /v1/config returns Hermes config with secrets redacted via kernel', async () => {
    const hermes = seedHermes();
    const app = await buildApp({ logger: false, hermes });
    const res = await app.inject({ method: 'GET', url: '/v1/config' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      ok: boolean;
      value: { openrouterApiKey: string; databaseUrl: string; redisUrl: string };
    };
    expect(body.ok).toBe(true);
    expect(body.value.openrouterApiKey).toBe('****');
    expect(body.value.databaseUrl).toBe('****');
    expect(body.value.redisUrl).toBe('****');
    expect(res.payload).not.toContain('api-secret');
    await app.close();
  });

  it('GET /v1/version returns PACKAGE_NAME and PACKAGE_VERSION', async () => {
    const hermes = seedHermes();
    const app = await buildApp({ logger: false, hermes });
    const res = await app.inject({ method: 'GET', url: '/v1/version' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean; value: { name: string; version: string } };
    expect(body.value.name).toBe(PACKAGE_NAME);
    expect(body.value.version).toBe(PACKAGE_VERSION);
    expect(body.value.name).toBe('@agent-os/hermes');
    await app.close();
  });

  it('GET /v1/modules returns module count from Hermes.status()', async () => {
    const hermes = seedHermes();
    const app = await buildApp({ logger: false, hermes });
    const res = await app.inject({ method: 'GET', url: '/v1/modules' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean; value: { count: number; items: unknown[] } };
    expect(body.value.count).toBe(0);
    expect(body.value.items).toEqual([]);
    await app.close();
  });

  it('GET /v1/modules returns serializable live module health details', async () => {
    const hermes = seedHermes();
    await hermes.start();
    const registered = hermes.registerModule(seedModule);
    expect(registered.ok).toBe(true);
    const app = await buildApp({ logger: false, hermes });
    const res = await app.inject({ method: 'GET', url: '/v1/modules' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      ok: boolean;
      value: { count: number; items: Array<{ name: string; status: string }> };
    };
    expect(body.value.count).toBe(1);
    expect(body.value.items[0]?.name).toBe('test-plugin');
    expect(body.value.items[0]?.status).toBe('healthy');
    expect(res.payload).not.toContain('healthCheck');
    await app.close();
  });

  it('GET /v1/plugins returns loaded Hermes module/plugin inventory', async () => {
    const hermes = seedHermes();
    await hermes.start();
    const registered = hermes.registerModule(seedModule);
    expect(registered.ok).toBe(true);
    const app = await buildApp({ logger: false, hermes });
    const res = await app.inject({ method: 'GET', url: '/v1/plugins' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      ok: boolean;
      value: { count: number; items: Array<{ name: string; status: string }> };
    };
    expect(body.ok).toBe(true);
    expect(body.value.count).toBe(1);
    expect(body.value.items[0]?.name).toBe('test-plugin');
    expect(body.value.items[0]?.status).toBe('healthy');
    await app.close();
  });

  it('GET /v1/metrics returns the shared metric registry snapshot', async () => {
    const metricRegistry = createMetricRegistry();
    const hermes = seedHermes(metricRegistry);
    const app = await buildApp({ logger: false, hermes, metricRegistry });
    await app.inject({ method: 'GET', url: '/v1/status' });
    const res = await app.inject({ method: 'GET', url: '/v1/metrics' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      ok: boolean;
      value: { count: number; items: Array<{ name: string; labels: { adapter?: string } }> };
    };
    expect(body.ok).toBe(true);
    expect(body.value.count).toBeGreaterThan(0);
    expect(
      body.value.items.some(
        (metric) => metric.name === 'requests_total' && metric.labels.adapter === 'api',
      ),
    ).toBe(true);
    expect(
      body.value.items.some(
        (metric) => metric.name === 'loaded_modules' && metric.labels.adapter === 'hermes',
      ),
    ).toBe(true);
    await app.close();
  });

  it('production behaviour unchanged: legacy /health + /version return unchanged', async () => {
    const hermes = seedHermes();
    const app = await buildApp({ logger: false, hermes });
    const h = await app.inject({ method: 'GET', url: '/health' });
    expect(h.statusCode).toBe(200);
    expect(h.json()).toMatchObject({ status: 'ok' });
    const v = await app.inject({ method: 'GET', url: '/version' });
    expect(v.statusCode).toBe(200);
    await app.close();
  });

  it('all hermes-routes plugin imports resolve at module load', () => {
    // Smoke check: ensures the tree-shake boundary is intact.
    expect(typeof healthRoutes).toBe('function');
    expect(typeof versionRoutes).toBe('function');
    expect(typeof hermesRoutes).toBe('function');
  });
});
