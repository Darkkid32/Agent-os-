/**
 * /v1/* REST routes — Hermes kernel surface.
 *
 * Per docs/architecture/platform.md §6.2, the REST adapter exposes the
 * seven canonical verbs.
 *
 * Phase 4.3: this file exists as the integration target for the
 * apps/api ↔ Hermes test. The current `buildApp(config)` does NOT
 * register these routes unless `config.hermes` is supplied —
 * production behaviour is unchanged.
 *
 * Fastify plugin pattern: routes are registered under prefix `/v1`
 * with the Hermes instance supplied via plugin options.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { type HermesConfig, type HermesPort, redactHermesConfig } from '@agent-os/hermes';

export interface HermesRoutesOpts {
  readonly hermes: HermesPort;
}

const configToJson = (cfg: HermesConfig): Record<string, unknown> => ({
  nodeEnv: cfg.nodeEnv,
  logLevel: cfg.logLevel,
  openrouterApiKey: cfg.openrouterApiKey,
  databaseUrl: cfg.databaseUrl,
  redisUrl: cfg.redisUrl,
  otelEnabled: cfg.otelEnabled,
  otelExporterEndpoint: cfg.otelExporterEndpoint ?? null,
  hermesModulesDir: cfg.hermesModulesDir,
  hermesShutdownTimeoutMs: cfg.hermesShutdownTimeoutMs,
});

export const hermesRoutes: FastifyPluginAsync<HermesRoutesOpts> = async (
  app: FastifyInstance,
  opts: HermesRoutesOpts,
): Promise<void> => {
  const { hermes } = opts;

  app.get('/status', async () => ({
    ok: true,
    value: hermes.status(),
  }));

  app.get('/health', async () => ({
    ok: true,
    value: await hermes.health(),
  }));

  app.post('/start', async () => {
    const r = await hermes.start();
    return r.ok
      ? { ok: true, value: { started: true, phase: hermes.status().phase } }
      : { ok: false, error: { code: 'HERMES', message: r.error.message } };
  });

  app.post('/stop', async () => {
    const r = await hermes.stop();
    return r.ok
      ? { ok: true, value: { stopped: true, phase: hermes.status().phase } }
      : { ok: false, error: { code: 'HERMES', message: r.error.message } };
  });

  app.get('/modules', async () => ({
    ok: true,
    value: { count: hermes.status().modules },
  }));

  app.get('/config', async () => {
    const redacted = redactHermesConfig(hermes.config);
    return { ok: true, value: configToJson(redacted) };
  });

  app.get('/version', async () => {
    const { PACKAGE_NAME, PACKAGE_VERSION } = await import('@agent-os/hermes');
    return { ok: true, value: { name: PACKAGE_NAME, version: PACKAGE_VERSION } };
  });
};
