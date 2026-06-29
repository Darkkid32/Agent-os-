/**
 * Tool-handler tests. Each tool is invoked against the mock Hermes
 * factory. We never spin up the MCP server / transport.
 */
import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME, PACKAGE_VERSION } from '@agent-os/hermes';
import { createMockHermes } from '@agent-os/hermes/test-utils';
import {
  ALL_TOOLS,
  configTool,
  healthTool,
  modulesTool,
  startTool,
  statusTool,
  stopTool,
  versionTool,
} from './tools.js';
import type { McpToolContext } from './types.js';

const ctx = (hermes = createMockHermes()): McpToolContext => ({
  hermes,
  role: 'admin',
  toolName: 'any',
});

describe('MCP tools — completeness', () => {
  it('exports exactly seven tools', () => {
    expect(ALL_TOOLS.length).toBe(7);
  });

  it('every tool has a unique name and requires a known action', () => {
    const names = new Set(ALL_TOOLS.map((t) => t.name));
    expect(names.size).toBe(7);
    for (const t of ALL_TOOLS) {
      expect(['start', 'stop', 'status', 'health', 'modules', 'config', 'version']).toContain(
        t.requires,
      );
    }
  });
});

describe('startTool', () => {
  it('returns isError:true when Hermes.start() rejects', async () => {
    const hermes = createMockHermes({
      startResult: async () => ({ ok: false, error: new Error('nope') }),
    });
    const r = await startTool.handler(ctx(hermes));
    expect(r.isError).toBe(true);
    expect(r.text).toContain('nope');
  });
});

describe('stopTool', () => {
  it('returns isError:true when Hermes.stop() rejects', async () => {
    const hermes = createMockHermes({
      stopResult: async () => ({ ok: false, error: new Error('halt') }),
    });
    const r = await stopTool.handler(ctx(hermes));
    expect(r.isError).toBe(true);
  });
});

describe('statusTool', () => {
  it('surfaces the live HermesStatus', async () => {
    const hermes = createMockHermes({ phase: 'RUNNING', modules: 7, uptime: 9999 as never });
    const r = await statusTool.handler(ctx(hermes));
    expect(r.isError).toBe(false);
    const text = JSON.stringify(r.data);
    expect(text).toContain('RUNNING');
    expect(text).toContain('7');
  });
});

describe('healthTool', () => {
  it('awaits hermes.health() and surfaces the report', async () => {
    const hermes = createMockHermes();
    const r = await healthTool.handler(ctx(hermes));
    expect(r.isError).toBe(false);
    expect(typeof r.data).toBe('object');
  });
});

describe('modulesTool', () => {
  it('reports the module count from status()', async () => {
    const hermes = createMockHermes({ modules: 12 });
    const r = await modulesTool.handler(ctx(hermes));
    expect(r.isError).toBe(false);
    expect(JSON.stringify(r.data)).toContain('12');
  });
});

describe('configTool', () => {
  it('redacts secret config keys', async () => {
    const hermes = createMockHermes({
      config: {
        openrouterApiKey: 'topsecret',
        databaseUrl: 'postgres://x',
        redisUrl: 'redis://y',
      },
    });
    const r = await configTool.handler(ctx(hermes));
    expect(r.isError).toBe(false);
    expect(JSON.stringify(r.data)).toContain('****');
    expect(JSON.stringify(r.data)).not.toContain('topsecret');
    expect(JSON.stringify(r.data)).not.toContain('postgres://x');
  });
});

describe('versionTool', () => {
  it('returns Hermes package identity verbatim (no Hermes call)', async () => {
    const r = await versionTool.handler(ctx());
    expect(r.isError).toBe(false);
    expect(JSON.stringify(r.data)).toContain(PACKAGE_NAME);
    expect(JSON.stringify(r.data)).toContain(PACKAGE_VERSION);
  });
});
