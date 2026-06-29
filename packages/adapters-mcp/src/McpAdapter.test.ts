import { describe, expect, it } from 'vitest';
import { createMockHermes } from '@agent-os/hermes/test-utils';
import { McpAdapter } from './McpAdapter.js';

const baseConfig = {
  transport: 'stdio' as const,
  serverInfo: { name: 'test-server', version: '0.0.1' },
};

describe('McpAdapter — composition root', () => {
  it('initialize() never throws with a minimal config', async () => {
    const adapter = new McpAdapter(createMockHermes(), baseConfig);
    await adapter.initialize();
    const m = adapter.metadata();
    expect(m.interfaceType).toBe('mcp');
    expect(m.transport).toBe('stdio');
    expect(m.toolCount).toBe(7);
  });

  it('health() reports degraded after initialize (not yet started)', async () => {
    const adapter = new McpAdapter(createMockHermes(), baseConfig);
    await adapter.initialize();
    const h = adapter.health();
    // Initialised but not started → degraded is the documented shape.
    expect(['degraded', 'unknown']).toContain(h.status);
  });

  it('metadata is stable across calls', () => {
    const adapter = new McpAdapter(createMockHermes(), baseConfig);
    const m1 = adapter.metadata();
    const m2 = adapter.metadata();
    expect(m1.toolCount).toBe(m2.toolCount);
    expect(m1.name).toBe(m2.name);
  });
});
