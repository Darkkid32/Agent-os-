/**
 * Phase 5.4 — Integration: Hermes ↔ Email Adapter.
 *
 * End-to-end through the Email command pipeline
 * (`roleFor → can → requireRole → handler`) against a real
 * `createHermes()` instance. Validates kernel-permission flow,
 * formatter pipeline, subject-line parsing, and Hermes error
 * propagation through the command layer.
 *
 * No IMAP connection, no SES webhook, no real email.
 */
import { describe, expect, it } from 'vitest';
import { createHermes, redactHermesConfig, validateConfig } from '@agent-os/hermes';
import { EmailAdapter } from './EmailAdapter.js';
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
import { can, requireRole, roleFor } from './permissions.js';
import { PermissionError as CorePermissionError } from '@agent-os/core/kernel-permissions';
import { parseEmailSubject, isKnownCommand } from './parseCommand.js';
import type { EmailContext, EmailInitConfig } from './types.js';

const seedHermes = () => {
  const cfg = validateConfig({
    OPENROUTER_API_KEY: 'email-shhh',
    DATABASE_URL: 'postgres://email',
    REDIS_URL: 'redis://email',
  });
  if (!cfg.ok) throw new Error('seedHermes: validateConfig failed');
  return createHermes(cfg.value);
};

const ctx = (hermes: ReturnType<typeof seedHermes>, email: string): EmailContext => ({
  hermes,
  senderEmail: email,
  role: roleFor(email, ['admin@example.com']),
  now: () => 1_700_000_000_000,
});

const imapConfig: EmailInitConfig = {
  mode: 'imap-polling',
  adminEmails: ['admin@example.com'],
  commandPrefix: 'AgentOS',
  imap: {
    host: 'imap.example.com',
    port: 993,
    user: 'user@example.com',
    password: 'secret',
    tls: true,
    pollIntervalMs: 60_000,
    folder: 'INBOX',
  },
  ses: undefined,
};

const sesConfig: EmailInitConfig = {
  mode: 'ses-webhook',
  adminEmails: ['admin@example.com'],
  commandPrefix: '',
  imap: undefined,
  ses: {
    enabled: true,
    topicArn: 'arn:aws:sns:us-east-1:123456789:email-topic',
    signingCertUrl: 'https://sns.us-east-1.amazonaws.com/simpleemail/xxxx.pem',
  },
};

describe('Hermes ↔ Email integration', () => {
  it('status round-trip: kernel INITIALIZING → plain text', async () => {
    const hermes = seedHermes();
    const result = await statusCommand.handler(ctx(hermes, 'admin@example.com'), { options: {} });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text).toContain('INITIALIZING');
    }
  });

  it('startCommand propagates a Hermes success Result', async () => {
    const hermes = seedHermes();
    const result = await startCommand.handler(ctx(hermes, 'admin@example.com'), { options: {} });
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
    expect(() => requireRole('viewer', 'start')).toThrow(CorePermissionError);
  });

  it('kernel-permission flow: admin is allowed admin-only ops', () => {
    expect(() => requireRole('admin', 'start')).not.toThrow();
  });

  it('config handler routes secrets through redactHermesConfig', async () => {
    const hermes = seedHermes();
    const redacted = redactHermesConfig(hermes.config);
    expect(redacted.openrouterApiKey).toBe('****');
    const result = await configCommand.handler(ctx(hermes, 'admin@example.com'), { options: {} });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const redactedResult = formatConfigMessage(redacted);
      expect(redactedResult.text).toContain('****');
      expect(redactedResult.text).not.toContain('email-shhh');
    }
  });

  it('version handler reads PACKAGE_NAME/PACKAGE_VERSION from @agent-os/hermes', async () => {
    const hermes = seedHermes();
    const result = await versionCommand.handler(ctx(hermes, 'admin@example.com'), { options: {} });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const text = result.value.text;
      expect(text).toContain('agent');
      expect(text).toContain('/hermes');
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

  it('roleFor honours the per-adapter admin email list', () => {
    expect(roleFor('admin@example.com', ['admin@example.com'])).toBe('admin');
    expect(roleFor('user@example.com', ['admin@example.com'])).toBe('viewer');
  });

  it('roleFor normalizes email case and whitespace', () => {
    expect(roleFor('  Admin@Example.COM  ', ['admin@example.com'])).toBe('admin');
    expect(roleFor('USER@example.com', ['admin@example.com'])).toBe('viewer');
  });

  it('formatConfigMessage and formatVersionMessage are reachable through the kernel', () => {
    const cfg = validateConfig({
      OPENROUTER_API_KEY: 'topsecret',
      DATABASE_URL: 'pg',
      REDIS_URL: 'r',
    });
    if (!cfg.ok) throw new Error('validateConfig failed');
    const redacted = redactHermesConfig(cfg.value);
    const cfgMsg = formatConfigMessage(redacted);
    expect(cfgMsg.text).toContain('OPENROUTER_API_KEY');
    expect(cfgMsg.text).toContain('****');
    expect(cfgMsg.text).not.toContain('topsecret');
    const versionMsg = formatVersionMessage('@agent-os/hermes', '0.1.0');
    expect(versionMsg.text).toContain('agent');
    expect(versionMsg.text).toContain('/hermes');
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

describe('EmailAdapter lifecycle', () => {
  it('IMAP mode: initialize → start → stop lifecycle', async () => {
    const hermes = seedHermes();
    const adapter = new EmailAdapter(hermes, imapConfig);
    await adapter.initialize();
    await adapter.start();
    expect(adapter.health().status).toBe('healthy');
    await adapter.stop();
    expect(adapter.health().status).toBe('degraded');
  });

  it('SES mode: initialize → start → stop lifecycle', async () => {
    const hermes = seedHermes();
    const adapter = new EmailAdapter(hermes, sesConfig);
    await adapter.initialize();
    await adapter.start();
    expect(adapter.health().status).toBe('healthy');
    await adapter.stop();
    expect(adapter.health().status).toBe('degraded');
  });

  it('metadata returns correct shape for IMAP mode', async () => {
    const hermes = seedHermes();
    const adapter = new EmailAdapter(hermes, imapConfig);
    await adapter.initialize();
    const meta = adapter.getMetadata();
    expect(meta.interfaceType).toBe('email');
    expect(meta.transport).toBe('imap');
    expect(meta.mode).toBe('imap-polling');
    expect(meta.name).toBe('@agent-os/adapters-email');
  });

  it('metadata returns correct shape for SES mode', async () => {
    const hermes = seedHermes();
    const adapter = new EmailAdapter(hermes, sesConfig);
    await adapter.initialize();
    const meta = adapter.getMetadata();
    expect(meta.interfaceType).toBe('email');
    expect(meta.transport).toBe('ses-webhook');
    expect(meta.mode).toBe('ses-webhook');
  });

  it('handleMessage routes "status" command', async () => {
    const hermes = seedHermes();
    const adapter = new EmailAdapter(hermes, sesConfig);
    await adapter.initialize();
    await adapter.start();
    const reply = await adapter.handleMessage('admin@example.com', 'status');
    expect(reply.text).toContain('INITIALIZING');
  });

  it('handleMessage strips Re: prefix before parsing', async () => {
    const hermes = seedHermes();
    const adapter = new EmailAdapter(hermes, sesConfig);
    await adapter.initialize();
    await adapter.start();
    const reply = await adapter.handleMessage('admin@example.com', 'Re: status');
    expect(reply.text).toContain('INITIALIZING');
  });

  it('handleMessage strips Fwd: prefix before parsing', async () => {
    const hermes = seedHermes();
    const adapter = new EmailAdapter(hermes, sesConfig);
    await adapter.initialize();
    await adapter.start();
    const reply = await adapter.handleMessage('admin@example.com', 'Fwd: version');
    expect(reply.text).toContain('agent');
  });

  it('handleMessage strips configured command prefix', async () => {
    const hermes = seedHermes();
    const adapter = new EmailAdapter(hermes, imapConfig);
    await adapter.initialize();
    await adapter.start();
    const reply = await adapter.handleMessage('admin@example.com', '[AgentOS] status');
    expect(reply.text).toContain('INITIALIZING');
  });

  it('handleMessage rejects unknown command', async () => {
    const hermes = seedHermes();
    const adapter = new EmailAdapter(hermes, sesConfig);
    await adapter.initialize();
    await adapter.start();
    const reply = await adapter.handleMessage('admin@example.com', 'bogus');
    expect(reply.text).toContain('Unknown command');
  });

  it('handleMessage rejects viewer for mutating command', async () => {
    const hermes = seedHermes();
    const adapter = new EmailAdapter(hermes, sesConfig);
    await adapter.initialize();
    await adapter.start();
    const reply = await adapter.handleMessage('user@example.com', 'start');
    expect(reply.text).toContain('Permission Denied');
  });

  it('handleMessage returns error when not started', async () => {
    const hermes = seedHermes();
    const adapter = new EmailAdapter(hermes, sesConfig);
    await adapter.initialize();
    const reply = await adapter.handleMessage('admin@example.com', 'status');
    expect(reply.text).toContain('not started');
  });

  it('initialize rejects empty IMAP host', async () => {
    const hermes = seedHermes();
    const baseImap = imapConfig.imap ?? {
      host: '',
      port: 993,
      user: '',
      password: '',
      tls: true,
      pollIntervalMs: 60_000,
      folder: 'INBOX',
    };
    const badConfig: EmailInitConfig = {
      ...imapConfig,
      imap: { ...baseImap, host: '' },
    };
    const adapter = new EmailAdapter(hermes, badConfig);
    await expect(adapter.initialize()).rejects.toThrow('EMAIL_IMAP_HOST is required');
  });

  it('initialize rejects empty SES topic ARN', async () => {
    const hermes = seedHermes();
    const baseSes = sesConfig.ses ?? {
      enabled: true,
      topicArn: '',
      signingCertUrl: '',
    };
    const badConfig: EmailInitConfig = {
      ...sesConfig,
      ses: { ...baseSes, topicArn: '' },
    };
    const adapter = new EmailAdapter(hermes, badConfig);
    await expect(adapter.initialize()).rejects.toThrow('EMAIL_SES_TOPIC_ARN is required');
  });

  it('initialize rejects missing IMAP config for imap-polling mode', async () => {
    const hermes = seedHermes();
    const badConfig: EmailInitConfig = { ...imapConfig, imap: undefined };
    const adapter = new EmailAdapter(hermes, badConfig);
    await expect(adapter.initialize()).rejects.toThrow('IMAP configuration is required');
  });

  it('initialize rejects missing SES config for ses-webhook mode', async () => {
    const hermes = seedHermes();
    const badConfig: EmailInitConfig = { ...sesConfig, ses: undefined };
    const adapter = new EmailAdapter(hermes, badConfig);
    await expect(adapter.initialize()).rejects.toThrow('SES configuration is required');
  });

  it('handleMessage routes "help" command', async () => {
    const hermes = seedHermes();
    const adapter = new EmailAdapter(hermes, sesConfig);
    await adapter.initialize();
    await adapter.start();
    const reply = await adapter.handleMessage('admin@example.com', 'help');
    expect(reply.text).toContain('Available Commands');
  });
});

describe('Email subject-line parsing', () => {
  it('parses simple command', () => {
    const r = parseEmailSubject('status', '');
    expect(r).toEqual({ command: 'status', args: {} });
  });

  it('strips Re: prefix', () => {
    const r = parseEmailSubject('Re: status', '');
    expect(r).toEqual({ command: 'status', args: {} });
  });

  it('strips Fwd: prefix', () => {
    const r = parseEmailSubject('Fwd: start', '');
    expect(r).toEqual({ command: 'start', args: {} });
  });

  it('strips configured prefix in brackets', () => {
    const r = parseEmailSubject('[AgentOS] health', 'AgentOS');
    expect(r).toEqual({ command: 'health', args: {} });
  });

  it('strips Re: and configured prefix', () => {
    const r = parseEmailSubject('Re: [AgentOS] version', 'AgentOS');
    expect(r).toEqual({ command: 'version', args: {} });
  });

  it('returns null for empty subject', () => {
    expect(parseEmailSubject('', '')).toBeNull();
  });

  it('returns null for whitespace-only subject', () => {
    expect(parseEmailSubject('   ', '')).toBeNull();
  });

  it('returns null for prefix-only subject', () => {
    expect(parseEmailSubject('[AgentOS]', 'AgentOS')).toBeNull();
  });

  it('isKnownCommand identifies known commands', () => {
    expect(isKnownCommand('start')).toBe(true);
    expect(isKnownCommand('help')).toBe(true);
    expect(isKnownCommand('bogus')).toBe(false);
  });
});
