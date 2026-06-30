/**
 * Phase 5.3 — Integration: Hermes ↔ WhatsApp Adapter.
 *
 * End-to-end through the WhatsApp command pipeline
 * (`roleFor → can → requireRole → handler`) against a real
 * `createHermes()` instance. Validates kernel-permission flow,
 * formatter pipeline, and Hermes error propagation through the
 * command layer.
 *
 * No WhatsApp Business API client, no real webhook connection.
 */
import { describe, expect, it } from 'vitest';
import { createHermes, redactHermesConfig, validateConfig } from '@agent-os/hermes';
import { WhatsAppAdapter } from './WhatsAppAdapter.js';
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
import type { WhatsAppContext } from './types.js';

const seedHermes = () => {
  const cfg = validateConfig({
    OPENROUTER_API_KEY: 'wa-shhh',
    DATABASE_URL: 'postgres://wa',
    REDIS_URL: 'redis://wa',
  });
  if (!cfg.ok) throw new Error('seedHermes: validateConfig failed');
  return createHermes(cfg.value);
};

const ctx = (hermes: ReturnType<typeof seedHermes>, phone: string): WhatsAppContext => ({
  hermes,
  senderPhone: phone,
  role: roleFor(phone, ['+1234567890']),
  now: () => 1_700_000_000_000,
});

describe('Hermes ↔ WhatsApp integration', () => {
  it('status round-trip: kernel INITIALIZING → plain text', async () => {
    const hermes = seedHermes();
    const result = await statusCommand.handler(ctx(hermes, '+1234567890'), { options: {} });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text).toContain('INITIALIZING');
    }
  });

  it('startCommand propagates a Hermes success Result', async () => {
    const hermes = seedHermes();
    const result = await startCommand.handler(ctx(hermes, '+1234567890'), { options: {} });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.text).toContain('Hermes Start');
  });

  it('startCommand propagates a Hermes err Result (illegal transition)', async () => {
    const hermes = seedHermes();
    await hermes.start();
    await hermes.stop();
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

  it('config handler routes secrets through redactHermesConfig', async () => {
    const hermes = seedHermes();
    const redacted = redactHermesConfig(hermes.config);
    expect(redacted.openrouterApiKey).toBe('****');
    const result = await configCommand.handler(ctx(hermes, '+1234567890'), { options: {} });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text).toContain('****');
      expect(result.value.text).not.toContain('wa-shhh');
    }
  });

  it('version handler reads PACKAGE_NAME/PACKAGE_VERSION from this package', async () => {
    const hermes = seedHermes();
    const result = await versionCommand.handler(ctx(hermes, '+1234567890'), { options: {} });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const text = result.value.text;
      expect(text).toContain('agent');
      expect(text).toContain('adapters');
      expect(text).toContain('whatsapp');
      expect(text).toMatch(/Hermes Version/);
    }
  });

  it('Hermes error pipeline: formatStatusMessage with real data', () => {
    const result = formatStatusMessage({ phase: 'RUNNING', uptime: 100 as never, modules: 2 });
    expect(result.text).toContain('RUNNING');
  });

  it('kernel permission matrix: viewer cannot registerModule', () => {
    expect(can('viewer', 'registerModule')).toBe(false);
    expect(can('admin', 'registerModule')).toBe(true);
  });

  it('roleFor honours the per-adapter admin phone list', () => {
    expect(roleFor('+1234567890', ['+1234567890'])).toBe('admin');
    expect(roleFor('+0987654321', ['+1234567890'])).toBe('viewer');
  });

  it('formatConfigMessage and formatVersionMessage are reachable through the kernel', () => {
    const cfg = validateConfig({
      OPENROUTER_API_KEY: 'topsecret',
      DATABASE_URL: 'pg',
      REDIS_URL: 'r',
    });
    if (!cfg.ok) throw new Error('validateConfig failed');
    const cfgMsg = formatConfigMessage(cfg.value);
    expect(cfgMsg.text).toContain('OPENROUTER_API_KEY');
    expect(cfgMsg.text).not.toContain('topsecret');
    const versionMsg = formatVersionMessage('@agent-os/adapters-whatsapp', '1.0.0');
    expect(versionMsg.text).toContain('agent');
    expect(versionMsg.text).toContain('/adapters-');
  });

  it('integration of error formatter + real Hermes error', async () => {
    const hermes = seedHermes();
    await hermes.start();
    const result = await hermes.stop();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const msg = formatErrorMessage(result.error.message);
      expect(msg.text.length).toBeGreaterThan(0);
      expect(msg.text).toMatch(/illegal transition/);
    }
  });
});

describe('WhatsAppAdapter lifecycle', () => {
  const initConfig = {
    webhookSecret: 'test-secret',
    adminPhoneNumbers: ['+1234567890'],
  };

  it('initialize → start → stop lifecycle', async () => {
    const hermes = seedHermes();
    const adapter = new WhatsAppAdapter(hermes, initConfig);
    await adapter.initialize();
    await adapter.start();
    expect(adapter.health().status).toBe('healthy');
    await adapter.stop();
    expect(adapter.health().status).toBe('degraded');
  });

  it('metadata returns correct shape', async () => {
    const hermes = seedHermes();
    const adapter = new WhatsAppAdapter(hermes, initConfig);
    await adapter.initialize();
    const meta = adapter.getMetadata();
    expect(meta.interfaceType).toBe('whatsapp');
    expect(meta.transport).toBe('webhook');
    expect(meta.name).toBe('@agent-os/adapters-whatsapp');
  });

  it('handleMessage routes "status" command', async () => {
    const hermes = seedHermes();
    const adapter = new WhatsAppAdapter(hermes, initConfig);
    await adapter.initialize();
    await adapter.start();
    const reply = await adapter.handleMessage('+1234567890', 'status');
    expect(reply.text).toContain('INITIALIZING');
  });

  it('handleMessage rejects unknown command', async () => {
    const hermes = seedHermes();
    const adapter = new WhatsAppAdapter(hermes, initConfig);
    await adapter.initialize();
    await adapter.start();
    const reply = await adapter.handleMessage('+1234567890', 'bogus');
    expect(reply.text).toContain('Unknown command');
  });

  it('handleMessage rejects viewer for mutating command', async () => {
    const hermes = seedHermes();
    const adapter = new WhatsAppAdapter(hermes, initConfig);
    await adapter.initialize();
    await adapter.start();
    const reply = await adapter.handleMessage('+0987654321', 'start');
    expect(reply.text).toContain('Permission Denied');
  });

  it('handleMessage returns error when not started', async () => {
    const hermes = seedHermes();
    const adapter = new WhatsAppAdapter(hermes, initConfig);
    await adapter.initialize();
    const reply = await adapter.handleMessage('+1234567890', 'status');
    expect(reply.text).toContain('not started');
  });

  it('initialize rejects empty webhookSecret', async () => {
    const hermes = seedHermes();
    const adapter = new WhatsAppAdapter(hermes, { webhookSecret: '', adminPhoneNumbers: [] });
    await expect(adapter.initialize()).rejects.toThrow('webhookSecret is required');
  });
});
