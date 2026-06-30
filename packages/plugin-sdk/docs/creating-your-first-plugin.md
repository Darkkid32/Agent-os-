# Creating Your First Plugin

This guide walks you through building an Agent OS plugin from scratch using the Plugin SDK. You'll learn the core APIs, how to wire up lifecycle hooks, and how to test your plugin in isolation.

## Core APIs

The SDK provides four building blocks:

| API | Purpose |
|-----|---------|
| `definePlugin()` | Wraps your plugin definition into an `AgentPlugin` with automatic error handling |
| `createPluginManifest()` | Validates and builds a `PluginManifest` from your input |
| `definePluginConfig()` | Chainable builder for config schemas |
| `createPluginContext()` | Creates a mock `PluginContext` for testing |

## Minimal Plugin

The simplest plugin only needs a manifest and an `initialize` function:

```ts
import { definePlugin } from '@agent-os/plugin-sdk';

const myPlugin = definePlugin({
  manifest: {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    author: 'Your Name',
    description: 'A simple plugin',
    capabilities: [],
    dependencies: [],
    minimumAgentOSVersion: '1.0.0',
  },
  initialize: async (context) => {
    context.logger.info('My plugin initialized');
  },
});

export default myPlugin;
```

`definePlugin()` wraps your lifecycle methods with try/catch and returns `Result<void>`, so you don't need to handle error wrapping yourself.

## Adding Lifecycle Methods

Implement `start`, `stop`, and `dispose` as needed:

```ts
import { definePlugin } from '@agent-os/plugin-sdk';

let timer: ReturnType<typeof setInterval> | undefined;

const myPlugin = definePlugin({
  manifest: {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    author: 'Your Name',
    description: 'A plugin with full lifecycle',
    capabilities: ['monitoring'],
    dependencies: [],
    minimumAgentOSVersion: '1.0.0',
  },
  initialize: async (context) => {
    context.logger.info('Plugin initialized');
  },
  start: async () => {
    timer = setInterval(() => {
      console.log('tick');
    }, 5000);
  },
  stop: async () => {
    if (timer != null) {
      clearInterval(timer);
      timer = undefined;
    }
  },
  dispose: async () => {
    if (timer != null) {
      clearInterval(timer);
      timer = undefined;
    }
  },
});
```

## Using the Manifest Builder

`createPluginManifest()` validates your manifest and applies defaults:

```ts
import { createPluginManifest } from '@agent-os/plugin-sdk';

const manifest = createPluginManifest({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  author: 'Your Name',
  description: 'A validated plugin manifest',
  capabilities: ['greeting'],
  dependencies: [],
  // minimumAgentOSVersion defaults to '1.0.0'
});

// Use with definePlugin
const plugin = definePlugin({
  manifest,
  initialize: async (context) => {
    context.logger.info(`${manifest.name} initialized`);
  },
});
```

## Adding Configuration

Use `definePluginConfig()` to define a typed config schema:

```ts
import { definePlugin, definePluginConfig } from '@agent-os/plugin-sdk';

const configSchema = definePluginConfig()
  .field('host', 'string')
    .required()
    .default('localhost')
    .description('Server host')
    .build()
  .field('port', 'number')
    .required()
    .default(3000)
    .description('Server port')
    .build()
  .build();

const myPlugin = definePlugin({
  manifest: {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    author: 'Your Name',
    description: 'Plugin with configuration',
    capabilities: [],
    dependencies: [],
    minimumAgentOSVersion: '1.0.0',
    configSchema,
  },
  configSchema,
  initialize: async (context) => {
    const host = context.config.get<string>('host');
    const port = context.config.get<number>('port');
    context.logger.info(`Connecting to ${host}:${port}`);
  },
});
```

## Testing with `createPluginContext`

Use `createPluginContext()` to create a mock context for unit tests:

```ts
import { describe, it, expect, vi } from 'vitest';
import { createPluginContext } from '@agent-os/plugin-sdk';
import type { PluginContext } from '@agent-os/plugins';

const createMockContext = (configValues: Record<string, unknown> = {}): PluginContext =>
  createPluginContext({
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
    pluginId: 'my-plugin',
    configValues,
  });

describe('my plugin', () => {
  it('initializes successfully', async () => {
    const context = createMockContext({ greeting: 'Hola' });
    const result = await myPlugin.initialize(context);
    expect(result.ok).toBe(true);
  });
});
```

## Using Templates

The SDK includes templates for common patterns:

```ts
import { createCommandPlugin, createEventPlugin } from '@agent-os/plugin-sdk';

// Command plugin
const cmdPlugin = createCommandPlugin({
  id: 'greeting',
  name: 'Greeting Plugin',
  version: '1.0.0',
  author: 'Developer',
  description: 'Handles greeting commands',
  commands: [
    {
      name: 'hello',
      description: 'Say hello',
      execute: async (args) => `Hello, ${args[0] ?? 'World'}!`,
    },
  ],
});

// Event plugin
const evtPlugin = createEventPlugin({
  id: 'logger',
  name: 'Event Logger',
  version: '1.0.0',
  author: 'Developer',
  description: 'Logs all events',
  handlers: [
    {
      event: '*',
      handle: async (data, ctx) => {
        ctx.logger.info('Event received', { data });
      },
    },
  ],
});
```

## Reference

- See `src/examples/hello-world.ts` for a complete example plugin
- See `src/definePlugin.ts` for the core `definePlugin` implementation
- See `src/createPluginManifest.ts` for manifest validation
- See `src/createPluginContext.ts` for context creation
