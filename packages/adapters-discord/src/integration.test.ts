/**
 * Phase 4.3 — Integration: Hermes ↔ Discord Adapter.
 *
 * End-to-end through the Discord command pipeline
 * (`roleFor → can → handler → formatXxx`) against a real `createHermes()`
 * instance. Validates role resolution, viewer permission denial
 * surfacing through `formatPermissionMessage`, and the Hermes
 * status / health formatter pipeline.
 *
 * No discord.js client, no real connection.
 */
import { describe, expect, it } from 'vitest';
import { createHermes, redactHermesConfig, validateConfig } from '@agent-os/hermes';
import { startCommand } from './commands/StartCommand.js';
import { statusCommand } from './commands/StatusCommand.js';
import { healthCommand } from './commands/HealthCommand.js';
import { configCommand } from './commands/ConfigCommand.js';
import { formatPermissionMessage, formatStartedMessage } from './formats.js';
import { can, roleFor } from './permissions.js';
import type { DiscordContext } from './types.js';

const seedHermes = () => {
  const cfg = validateConfig({
    OPENROUTER_API_KEY: 'sk-shhh',
    DATABASE_URL: 'postgres://x',
    REDIS_URL: 'redis://y',
  });
  if (!cfg.ok) throw new Error('seedHermes: validateConfig failed');
  return createHermes(cfg.value);
};

const ctx = (hermes: ReturnType<typeof seedHermes>, userId: string): DiscordContext => ({
  hermes,
  userId,
  role: roleFor(userId, ['admin-user']),
  now: () => 1_700_000_000_000,
});

describe('Hermes ↔ Discord integration', () => {
  it('end-to-end status round-trip surfaces Hermes phase through formatter', async () => {
    const hermes = seedHermes();
    const result = await statusCommand.handler(ctx(hermes, 'admin-user'), { options: {} });
    expect(result.embeds).toBeDefined();
    const embed = result.embeds?.[0];
    expect(embed?.title).toBe('Hermes Status');
    const fields = embed?.fields ?? [];
    expect(fields.length).toBeGreaterThan(0);
    const phaseField = fields.find((f) => f.name === 'Phase');
    expect(phaseField?.value).toBe('INITIALIZING');
  });

  it('end-to-end /start surfaces formatted phase back through the dispatcher', async () => {
    const hermes = seedHermes();
    const msg = await startCommand.handler(ctx(hermes, 'admin-user'), { options: {} });
    const rendered = JSON.stringify(msg);
    expect(rendered).toContain('Hermes Start');
  });

  it('viewer trying to /start is denied at the can() layer', () => {
    expect(can('viewer', 'start')).toBe(false);
    expect(can('viewer', 'registerModule')).toBe(false);
  });

  it('viewer-facing commands remain accessible', () => {
    expect(can('viewer', 'status')).toBe(true);
    expect(can('viewer', 'health')).toBe(true);
    expect(can('viewer', 'modules')).toBe(true);
    expect(can('viewer', 'config')).toBe(true);
    expect(can('viewer', 'version')).toBe(true);
  });

  it('Hermes error path: Hermes.start() in INVALID phase rejected by handler', async () => {
    const hermes = seedHermes();
    // First start succeeds (moves phase to STARTING).
    await hermes.start();
    // Second start tries STARTING → STARTING (illegal). The real Hermes
    // returns an err Result, and the handler throws.
    await expect(startCommand.handler(ctx(hermes, 'admin-user'), { options: {} })).rejects.toThrow(
      /Hermes\.start\(\) failed/,
    );
  });

  it('config handler redacts secrets via @agent-os/hermes/redactHermesConfig', async () => {
    const hermes = seedHermes();
    // Sanity: redactHermesConfig is the kernel's contract.
    const redacted = redactHermesConfig(hermes.config);
    expect(redacted.openrouterApiKey).toBe('****');
    expect(redacted.databaseUrl).toBe('****');
    expect(redacted.redisUrl).toBe('****');
    expect(redacted.nodeEnv).toBe('development');
    // The Discord config command formatter presents the redacted view.
    const msg = await configCommand.handler(ctx(hermes, 'admin-user'), { options: {} });
    const rendered = JSON.stringify(msg);
    expect(rendered).toContain('OPENROUTER_API_KEY');
    expect(rendered).not.toContain('sk-shhh');
  });

  it('health handler renders aggregate status through the format pipeline', async () => {
    const hermes = seedHermes();
    const msg = await healthCommand.handler(ctx(hermes, 'admin-user'), { options: {} });
    expect(msg.embeds?.[0]?.title).toBe('Hermes Health');
  });

  it('formatPermissionMessage produces a permission-denied payload', () => {
    const msg = formatPermissionMessage('start');
    expect(msg.embeds?.[0]?.title).toBe('Permission Denied');
    expect(msg.ephemeral).toBe(true);
  });

  it('formatStartedMessage renders the kernel phase', () => {
    const msg = formatStartedMessage('RUNNING', 1_700_000_000_000);
    expect(msg.embeds?.[0]?.description).toContain('RUNNING');
  });
});
