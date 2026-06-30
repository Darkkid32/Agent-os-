import { describe, it, expect, vi } from 'vitest';
import { createCommandPlugin, executeCommand } from './command.js';
import type { CommandHandler } from '../types.js';
import type { PluginContext } from '@agent-os/plugins';

describe('command template', () => {
  const createMockContext = (): PluginContext => ({
    hermes: {} as never,
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      log: vi.fn(),
      child: vi.fn().mockReturnThis(),
      flush: vi.fn(),
      close: vi.fn(),
      formatEntry: vi.fn(),
    } as unknown as PluginContext['logger'],
    metrics: {} as never,
    tracer: {} as never,
    eventBus: {} as never,
    config: {
      get: vi.fn(),
      require: vi.fn(),
      has: vi.fn().mockReturnValue(false),
      all: vi.fn().mockReturnValue({}),
      schema: vi.fn().mockReturnValue(undefined),
    },
  });

  it('creates a plugin with commands in capabilities', () => {
    const commands: CommandHandler[] = [
      { name: 'hello', description: 'Say hello', execute: vi.fn() },
      { name: 'goodbye', description: 'Say goodbye', execute: vi.fn() },
    ];

    const plugin = createCommandPlugin({
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      author: 'Test',
      description: 'Test plugin',
      commands,
    });

    expect(plugin.manifest.capabilities).toEqual(['command:hello', 'command:goodbye']);
  });

  it('initializes and logs commands', async () => {
    const commands: CommandHandler[] = [
      { name: 'hello', description: 'Say hello', execute: vi.fn() },
    ];

    const plugin = createCommandPlugin({
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      author: 'Test',
      description: 'Test plugin',
      commands,
    });

    const context = createMockContext();
    const result = await plugin.initialize(context);
    expect(result.ok).toBe(true);
    expect(context.logger.info).toHaveBeenCalledWith('Command plugin initialized', {
      commands: ['hello'],
    });
  });

  it('executeCommand runs a command', async () => {
    const execute = vi.fn().mockResolvedValue('Hello, World!');
    const commands: CommandHandler[] = [{ name: 'hello', description: 'Say hello', execute }];

    const context = createMockContext();
    const result = await executeCommand(commands, 'hello', ['World'], context);
    expect(result).toBe('Hello, World!');
    expect(execute).toHaveBeenCalledWith(['World'], context);
  });

  it('executeCommand returns error for unknown command', async () => {
    const commands: CommandHandler[] = [];
    const context = createMockContext();
    const result = await executeCommand(commands, 'unknown', [], context);
    expect(result).toBe('Unknown command: unknown');
  });
});
