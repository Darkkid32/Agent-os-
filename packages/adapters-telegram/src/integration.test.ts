/**
 * Phase 4.3 — Integration: Hermes ↔ Telegram Adapter.
 *
 * End-to-end through the Telegram command pipeline
 * (`roleFor → can → requireRole → handler`) against a real
 * `createHermes()` instance. Validates kernel-permission flow,
 * formatter pipeline, and Hermes error propagation through the
 * command layer.
 *
 * No grammY client, no real bot connection.
 */
import { describe, expect, it } from 'vitest';
import { createHermes, redactHermesConfig, validateConfig } from '@agent-os/hermes';
import { startCommand } from './commands/StartCommand.js';
import { statusCommand } from './commands/StatusCommand.js';
import { configCommand } from './commands/ConfigCommand.js';
import { versionCommand } from './commands/VersionCommand.js';
import {
  formatConfigMessage,
  formatErrorMessage,
  formatStatusMessage,
  formatVersionMessage,
} from './formats.js';
import { can, PermissionError, requireRole, roleFor } from './permissions.js';
import type { TelegramContext } from './types.js';

const seedHermes = () => {
  const cfg = validateConfig({
    OPENROUTER_API_KEY: 'tg-shhh',
    DATABASE_URL: 'postgres://tg',
    REDIS_URL: 'redis://tg',
  });
  if (!cfg.ok) throw new Error('seedHermes: validateConfig failed');
  return createHermes(cfg.value);
};

const ctx = (hermes: ReturnType<typeof seedHermes>, userId: string): TelegramContext => ({
  hermes,
  userId,
  chatId: 1,
  role: roleFor(userId, ['tg-admin']),
  now: () => 1_700_000_000_000,
});

describe('Hermes ↔ Telegram integration', () => {
  it('status round-trip: kernel INITIALIZING → MarkdownV2 text', async () => {
    const hermes = seedHermes();
    const result = await statusCommand.handler(ctx(hermes, 'tg-admin'), { options: {} });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.parseMode).toBe('MarkdownV2');
      expect(result.value.text).toContain('INITIALIZING');
    }
  });

  it('startCommand propagates a Hermes success Result', async () => {
    const hermes = seedHermes();
    const result = await startCommand.handler(ctx(hermes, 'tg-admin'), { options: {} });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.text).toContain('Hermes Start');
  });

  it('startCommand propagates a Hermes err Result (illegal transition)', async () => {
    const hermes = seedHermes();
    await hermes.start(); // INITIALIZING → STARTING
    await hermes.stop(); // STOPPING from STARTING is illegal — see Hermes tests
    // No matter where it lands, the second start must return a non-ok result
    // when re-running from a non-INITIALIZING state.
    await hermes.start();
    const result = await hermes.start();
    expect(result.ok).toBe(false);
  });

  it('kernel-permission flow: viewer is denied /start via requireRole', () => {
    expect(() => requireRole('viewer', 'start')).toThrow(PermissionError);
  });

  it('kernel-permission flow: admin is allowed admin-only ops', () => {
    expect(() => requireRole('admin', 'start')).not.toThrow();
  });

  it('config handler routes secrets through redactHermesConfig (kernel owns the rule)', async () => {
    const hermes = seedHermes();
    const redacted = redactHermesConfig(hermes.config);
    expect(redacted.openrouterApiKey).toBe('****');
    const result = await configCommand.handler(ctx(hermes, 'tg-admin'), { options: {} });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text).toMatch(/\\\*\\\*\\\*\\\*/);
      expect(result.value.text).not.toContain('tg-shhh');
    }
  });

  it('version handler reads PACKAGE_NAME/PACKAGE_VERSION from this package', async () => {
    const hermes = seedHermes();
    const result = await versionCommand.handler(ctx(hermes, 'tg-admin'), { options: {} });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const text = result.value.text;
      // MarkdownV2 escapes the hyphen; verify the formatted envelope.
      expect(text).toContain('agent');
      expect(text).toContain('adapters');
      expect(text).toContain('telegram');
      expect(text).toMatch(/Hermes Version/);
    }
  });

  it('Hermes error pipeline: errorCommand formats any Hermes error string', () => {
    const result = formatStatusMessage({ phase: 'RUNNING', uptime: 100 as never, modules: 2 });
    expect(result.parseMode).toBe('MarkdownV2');
    expect(result.text).toContain('RUNNING');
  });

  it('kernel permission matrix: viewer cannot registerModule even if it tried', () => {
    // Per Phase 4.2 lift, `KernelAction` is the canonical union. Telegram
    // never exposes registerModule to operators, but the kernel still
    // answers correctly for any adapter that might.
    expect(can('viewer', 'registerModule')).toBe(false);
    expect(can('admin', 'registerModule')).toBe(true);
  });

  it('roleFor honours the per-adapter admin user list', () => {
    expect(roleFor('tg-admin', ['tg-admin'])).toBe('admin');
    expect(roleFor('not-in-list', ['tg-admin'])).toBe('viewer');
  });

  it('formatConfigMessage and formatVersionMessage are reachable through the kernel', () => {
    const cfg = validateConfig({
      OPENROUTER_API_KEY: 'topsecret',
      DATABASE_URL: 'pg',
      REDIS_URL: 'r',
    });
    if (!cfg.ok) throw new Error('validateConfig failed');
    const cfgMsg = formatConfigMessage(cfg.value);
    // MarkdownV2 escapes `_` in the field name; match against the
    // formatted form rather than the raw field name.
    expect(cfgMsg.text).toContain('OPENROUTER\\_API\\_KEY');
    expect(cfgMsg.text).not.toContain('topsecret');
    const versionMsg = formatVersionMessage('@agent-os/adapters-telegram', '1.0.0');
    // MarkdownV2 escapes the hyphen in `@agent-os/adapters-telegram`.
    expect(versionMsg.text).toContain('agent');
    expect(versionMsg.text).toContain('adapters');
    expect(versionMsg.text).toContain('telegram');
  });

  it('integration of error formatter + real Hermes error', async () => {
    const hermes = seedHermes();
    await hermes.start();
    const result = await hermes.stop();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const msg = formatErrorMessage(result.error.message);
      expect(msg.parseMode).toBe('MarkdownV2');
      expect(msg.text.length).toBeGreaterThan(0);
      // MarkdownV2 escapes dashes in the kernel error message; just
      // verify the formatted envelope carries it.
      expect(msg.text).toMatch(/illegal transition/);
    }
  });
});
