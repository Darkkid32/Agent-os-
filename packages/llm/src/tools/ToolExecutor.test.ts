/**
 * Tests for DefaultToolExecutor.
 */
import { describe, it, expect } from 'vitest';
import { DefaultToolExecutor, allowAllPermissions } from './ToolExecutor.js';
import { DefaultToolRegistry } from './ToolRegistry.js';
import type { ToolDefinition, ToolCall, ToolEvent, ToolExecutionHandler } from './types.js';

const makeTool = (overrides?: Partial<ToolDefinition>): ToolDefinition => ({
  id: 'test-tool',
  name: 'Test Tool',
  description: 'A test tool',
  version: '1.0.0',
  pluginId: 'test-plugin',
  enabled: true,
  parameters: {
    required: [{ name: 'query', type: 'string', required: true }],
    optional: [],
  },
  permissions: [],
  ...overrides,
});

const makeCall = (
  toolId = 'test-tool',
  args: Record<string, unknown> = { query: 'hello' },
): ToolCall => ({
  id: `call-${Date.now()}`,
  toolId,
  arguments: args,
});

const okHandler: ToolExecutionHandler = async (ctx) => `result for ${ctx.call.toolId}`;

const setup = (
  handler: ToolExecutionHandler = okHandler,
  toolOverrides?: Partial<ToolDefinition>,
) => {
  const registry = new DefaultToolRegistry();
  registry.register(makeTool(toolOverrides), handler);
  return { registry, executor: new DefaultToolExecutor(registry) };
};

describe('DefaultToolExecutor', () => {
  it('executes a tool successfully', async () => {
    const { executor } = setup();
    const result = await executor.execute(makeCall(), {
      requestId: 'req-1',
      availablePlugins: new Set(['test-plugin']),
    });

    expect(result.success).toBe(true);
    expect(result.data).toBe('result for test-tool');
    expect(result.callId).toBeDefined();
    expect(result.toolId).toBe('test-tool');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns failure for validation errors (missing params)', async () => {
    const { executor } = setup();
    const result = await executor.execute(makeCall('test-tool', {}), {
      availablePlugins: new Set(['test-plugin']),
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('TOOL_VALIDATION_FAILED');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns failure for unknown tool', async () => {
    const { executor } = setup();
    const result = await executor.execute(makeCall('nonexistent'), {
      availablePlugins: new Set(['test-plugin']),
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('TOOL_VALIDATION_FAILED');
  });

  it('returns failure for disabled tool', async () => {
    const { executor } = setup(okHandler, { enabled: false });
    const result = await executor.execute(makeCall(), {
      availablePlugins: new Set(['test-plugin']),
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('TOOL_VALIDATION_FAILED');
  });

  it('returns failure for unavailable plugin', async () => {
    const { executor } = setup();
    const result = await executor.execute(makeCall(), {
      availablePlugins: new Set(['other-plugin']),
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('TOOL_VALIDATION_FAILED');
  });

  it('returns failure for permission denied', async () => {
    const { registry } = setup();
    registry.register(makeTool({ id: 'secure-tool', permissions: ['admin'] }), okHandler);
    const executor = new DefaultToolExecutor(registry, {
      hasPermission: () => false,
    });

    const result = await executor.execute(makeCall('secure-tool', { query: 'hi' }), {
      userId: 'user-1',
      availablePlugins: new Set(['test-plugin']),
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('TOOL_PERMISSION_DENIED');
  });

  it('returns failure for tool timeout', async () => {
    const slowHandler: ToolExecutionHandler = async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return 'done';
    };
    const { registry } = setup(slowHandler);
    const executor = new DefaultToolExecutor(registry, allowAllPermissions, 10);

    const result = await executor.execute(makeCall(), {
      availablePlugins: new Set(['test-plugin']),
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('TOOL_TIMEOUT');
    expect(result.timedOut).toBe(true);
  });

  it('returns failure when handler throws', async () => {
    const throwingHandler: ToolExecutionHandler = async () => {
      throw new Error('handler crashed');
    };
    const { executor } = setup(throwingHandler);

    const result = await executor.execute(makeCall(), {
      availablePlugins: new Set(['test-plugin']),
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('TOOL_EXECUTION_FAILED');
    expect(result.error).toBe('handler crashed');
  });

  it('allows permission check to pass', async () => {
    const { registry } = setup();
    registry.register(makeTool({ id: 'secure-tool', permissions: ['read'] }), okHandler);
    const executor = new DefaultToolExecutor(registry, {
      hasPermission: (_userId, perm) => perm === 'read',
    });

    const result = await executor.execute(makeCall('secure-tool', { query: 'hi' }), {
      userId: 'user-1',
      availablePlugins: new Set(['test-plugin']),
    });

    expect(result.success).toBe(true);
  });

  it('emits events during execution', async () => {
    const { executor } = setup();
    const events: ToolEvent[] = [];
    executor.onEvent((e) => events.push(e));

    await executor.execute(makeCall(), {
      requestId: 'req-1',
      availablePlugins: new Set(['test-plugin']),
    });

    expect(events.map((e) => e.type)).toEqual(['ToolRequested', 'ToolStarted', 'ToolCompleted']);
  });

  it('emits ToolFailed event on validation error', async () => {
    const { executor } = setup();
    const events: ToolEvent[] = [];
    executor.onEvent((e) => events.push(e));

    await executor.execute(makeCall('test-tool', {}), {
      availablePlugins: new Set(['test-plugin']),
    });

    expect(events.map((e) => e.type)).toEqual(['ToolRequested', 'ToolFailed']);
  });

  it('emits ToolFailed event on permission error', async () => {
    const { registry } = setup();
    registry.register(makeTool({ id: 'secure-tool', permissions: ['admin'] }), okHandler);
    const executor = new DefaultToolExecutor(registry, {
      hasPermission: () => false,
    });
    const events: ToolEvent[] = [];
    executor.onEvent((e) => events.push(e));

    await executor.execute(makeCall('secure-tool', { query: 'hi' }), {
      userId: 'user-1',
      availablePlugins: new Set(['test-plugin']),
    });

    expect(events.map((e) => e.type)).toEqual(['ToolRequested', 'ToolFailed']);
    const failed = events[1];
    expect(failed).toMatchObject({ type: 'ToolFailed', errorCode: 'TOOL_PERMISSION_DENIED' });
  });

  it('emits ToolFailed event on handler throw', async () => {
    const throwingHandler: ToolExecutionHandler = async () => {
      throw new Error('crash');
    };
    const { executor } = setup(throwingHandler);
    const events: ToolEvent[] = [];
    executor.onEvent((e) => events.push(e));

    await executor.execute(makeCall(), {
      availablePlugins: new Set(['test-plugin']),
    });

    expect(events.map((e) => e.type)).toEqual(['ToolRequested', 'ToolStarted', 'ToolFailed']);
  });

  it('passes requestId to events', async () => {
    const { executor } = setup();
    const events: ToolEvent[] = [];
    executor.onEvent((e) => events.push(e));

    await executor.execute(makeCall(), {
      requestId: 'req-42',
      availablePlugins: new Set(['test-plugin']),
    });

    for (const event of events) {
      if ('requestId' in event) {
        expect(event.requestId).toBe('req-42');
      }
    }
  });

  it('omits requestId from events when not provided', async () => {
    const { executor } = setup();
    const events: ToolEvent[] = [];
    executor.onEvent((e) => events.push(e));

    await executor.execute(makeCall(), {
      availablePlugins: new Set(['test-plugin']),
    });

    for (const event of events) {
      if ('requestId' in event) {
        expect(event.requestId).toBeUndefined();
      }
    }
  });

  it('returns failure for timeout with correct timedOut flag', async () => {
    const slowHandler: ToolExecutionHandler = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    };
    const { registry } = setup(slowHandler);
    const executor = new DefaultToolExecutor(registry, allowAllPermissions, 5);

    const result = await executor.execute(makeCall(), {
      availablePlugins: new Set(['test-plugin']),
    });

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.errorCode).toBe('TOOL_TIMEOUT');
  });

  it('handler timeout uses per-tool timeoutMs when defined', async () => {
    const slowHandler: ToolExecutionHandler = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    };
    const registry = new DefaultToolRegistry();
    registry.register(makeTool({ timeoutMs: 5 }), slowHandler);
    const executor = new DefaultToolExecutor(registry, allowAllPermissions, 10000);

    const result = await executor.execute(makeCall(), {
      availablePlugins: new Set(['test-plugin']),
    });

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });

  it('uses default timeout when handler has no timeoutMs', async () => {
    const slowHandler: ToolExecutionHandler = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    };
    const { registry } = setup(slowHandler);
    const executor = new DefaultToolExecutor(registry, allowAllPermissions, 5);

    const result = await executor.execute(makeCall(), {
      availablePlugins: new Set(['test-plugin']),
    });

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });

  it('default permission checker allows everything', () => {
    expect(allowAllPermissions.hasPermission('anyone', 'any-perm')).toBe(true);
  });
});
