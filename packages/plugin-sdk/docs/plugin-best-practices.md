# Plugin Best Practices

Guidelines for building reliable, maintainable Agent OS plugins.

## Keep Plugins Focused

Each plugin should do one thing well. If you find a plugin handling unrelated responsibilities, split it into multiple plugins:

```ts
// Good: single responsibility
const metricsPlugin = definePlugin({
  manifest: { id: 'metrics-collector', /* ... */ },
  initialize: async (context) => { /* collect metrics only */ },
});

// Good: single responsibility
const alertPlugin = definePlugin({
  manifest: { id: 'alert-notifier', /* ... */ },
  initialize: async (context) => { /* send alerts only */ },
});

// Bad: two unrelated responsibilities
const metricsAndAlertsPlugin = definePlugin({
  manifest: { id: 'metrics-and-alerts', /* ... */ },
  initialize: async (context) => {
    /* collects metrics AND sends alerts — too much */
  },
});
```

## Use Result Types for Error Handling

Return `Result` types from your logic rather than throwing. `definePlugin` handles lifecycle errors, but your internal functions should still use `Result`:

```ts
import { ok, type Result } from '@agent-os/core';

async function fetchConfig(url: string): Promise<Result<Config>> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { ok: false, error: new Error(`HTTP ${response.status}`) };
    }
    const config = await response.json();
    return ok(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: new Error(message) };
  }
}
```

## Prefer Composition Over Inheritance

Build plugins by composing small, reusable functions rather than extending base classes:

```ts
// Good: composition
function createHealthChecker(context: PluginContext, intervalMs: number) {
  let timer: ReturnType<typeof setInterval> | undefined;

  return {
    start: () => {
      timer = setInterval(() => {
        context.logger.debug('Health check');
      }, intervalMs);
    },
    stop: () => {
      if (timer != null) clearInterval(timer);
    },
  };
}

const myPlugin = definePlugin({
  manifest: { /* ... */ },
  initialize: async (context) => {
    const health = createHealthChecker(context, 30000);
    healthChecker = health;
  },
  start: async () => { healthChecker?.start(); },
  stop: async () => { healthChecker?.stop(); },
});
```

## Test with `createPluginContext`

Use `createPluginContext()` to build mock contexts in tests. It wires up all services with stubs:

```ts
import { createPluginContext } from '@agent-os/plugin-sdk';

const context = createPluginContext({
  hermes: mockHermes,
  logger: mockLogger,
  metrics: mockMetrics,
  tracer: mockTracer,
  eventBus: mockEventBus,
  pluginId: 'my-plugin',
  configValues: { host: 'localhost', port: 3000 },
});

const result = await myPlugin.initialize(context);
expect(result.ok).toBe(true);
expect(mockLogger.info).toHaveBeenCalled();
```

## Use Templates as Starting Points

The SDK provides templates for common patterns. Start from one instead of writing boilerplate:

| Template | Use case |
|----------|----------|
| `createMinimalPlugin` | Simplest possible plugin skeleton |
| `createCommandPlugin` | Plugins that handle CLI-style commands |
| `createEventPlugin` | Plugins that subscribe to events |

```ts
import { createCommandPlugin } from '@agent-os/plugin-sdk';

const plugin = createCommandPlugin({
  id: 'greeting',
  name: 'Greeting Plugin',
  version: '1.0.0',
  author: 'Developer',
  description: 'Responds to commands',
  commands: [
    {
      name: 'hello',
      description: 'Say hello',
      execute: async (args) => `Hello, ${args[0] ?? 'World'}!`,
    },
  ],
});
```

## Handle Cleanup in Both `stop` and `dispose`

Always clean up resources in `stop`. Also clean up in `dispose` defensively — the runtime may call `dispose` directly without calling `stop` first:

```ts
let timer: ReturnType<typeof setInterval> | undefined;

const myPlugin = definePlugin({
  manifest: { /* ... */ },
  initialize: async (context) => { /* ... */ },
  start: async () => {
    timer = setInterval(() => {}, 5000);
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

## Don't Import Other Plugins Directly

Plugins should be independent. If one plugin needs functionality from another, communicate through the event bus or Hermes instead of importing it directly:

```ts
// Bad: tight coupling
import { someFunction } from '@agent-os/some-other-plugin';

// Good: loose coupling via event bus
context.eventBus.subscribe('some-event', (data) => {
  // react to event from other plugin
});
```

## Store Context Safely

Store the `PluginContext` in a module-level variable and null it out on dispose:

```ts
let context: PluginContext | undefined;

const myPlugin = definePlugin({
  manifest: { /* ... */ },
  initialize: async (ctx) => {
    context = ctx;
  },
  start: async () => {
    context?.logger.info('Starting');
  },
  stop: async () => {
    context?.logger.info('Stopping');
  },
  dispose: async () => {
    context = undefined;
  },
});
```

## Validate Your Manifest

Use `createPluginManifest()` to validate your manifest at creation time rather than discovering errors at runtime:

```ts
import { createPluginManifest } from '@agent-os/plugin-sdk';

// Throws if manifest is invalid
const manifest = createPluginManifest({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  author: 'Developer',
  description: 'A validated plugin',
});
```

## Reference

- See `src/templates/minimal.ts` for the minimal plugin template
- See `src/templates/command.ts` for the command plugin template
- See `src/templates/event.ts` for the event plugin template
- See `src/examples/hello-world.ts` for a complete example
- See `src/examples/metrics-logger.ts` for a plugin with timers and cleanup
