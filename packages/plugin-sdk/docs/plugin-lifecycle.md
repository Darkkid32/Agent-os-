# Plugin Lifecycle

Every Agent OS plugin follows a lifecycle from initialization through disposal. This document explains each phase, valid transitions, and error handling behavior.

## Lifecycle Phases

A plugin progresses through these phases:

```
REGISTERED → INITIALIZING → INITIALIZED → STARTING → RUNNING → STOPPING → STOPPED → DISPOSED
                                                                      ↓
                                                                   FAILED
```

### 1. REGISTERED

The plugin manifest has been registered with the `PluginRegistry`. The plugin exists but no code has executed yet.

### 2. INITIALIZING / INITIALIZED

**Method:** `initialize(context: PluginContext)`

This is the only required lifecycle method. It receives the `PluginContext` which provides access to all platform services:

- `context.logger` — structured logging
- `context.metrics` — counters, gauges, histograms
- `context.tracer` — distributed tracing spans
- `context.eventBus` — publish/subscribe messaging
- `context.config` — typed configuration access
- `context.hermes` — Hermes module registry

```ts
initialize: async (context) => {
  // Store context for use in other lifecycle methods
  // Set up connections, load state, validate config
  context.logger.info('Plugin initialized');
}
```

After `initialize` completes successfully, the plugin is in the INITIALIZED state.

### 3. STARTING / RUNNING

**Method:** `start()`

Called after initialization. Start background work, open connections, begin processing:

```ts
start: async () => {
  timer = setInterval(collectMetrics, intervalMs);
}
```

After `start` completes, the plugin is in the RUNNING state.

### 4. STOPPING / STOPPED

**Method:** `stop()`

Gracefully shut down. Clear timers, close connections, flush buffers:

```ts
stop: async () => {
  if (timer != null) {
    clearInterval(timer);
    timer = undefined;
  }
}
```

After `stop` completes, the plugin is in the STOPPED state.

### 5. DISPOSED

**Method:** `dispose()`

Final cleanup. Release all resources and references. Called once and is not recoverable:

```ts
dispose: async () => {
  context = undefined;
  timer = undefined;
}
```

After `dispose` completes, the plugin is in the DISPOSED state and cannot be restarted.

## Error Handling

`definePlugin()` wraps every lifecycle method in a try/catch block. If your callback throws, the error is caught and returned as a `Result`:

```ts
// Your function
initialize: async (context) => {
  throw new Error('Database connection failed');
}

// definePlugin wraps it as:
initialize: async (context) => {
  try {
    await initialize(context);
    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: new Error(message) };
  }
}
```

The plugin transitions to the FAILED state if any lifecycle method returns `{ ok: false }`.

## Optional Methods

Only `initialize` is required. If you don't provide `start`, `stop`, or `dispose`, `definePlugin` returns `ok(undefined)` automatically:

```ts
const plugin = definePlugin({
  manifest: { /* ... */ },
  initialize: async (context) => {
    context.logger.info('Ready');
  },
  // start, stop, dispose are optional — default to no-op
});
```

## Valid Transitions

| From | To | Trigger |
|------|----|---------|
| REGISTERED | INITIALIZING | `initialize()` called |
| INITIALIZING | INITIALIZED | `initialize()` returns `ok` |
| INITIALIZING | FAILED | `initialize()` returns error |
| INITIALIZED | STARTING | `start()` called |
| STARTING | RUNNING | `start()` returns `ok` |
| STARTING | FAILED | `start()` returns error |
| RUNNING | STOPPING | `stop()` called |
| STOPPING | STOPPED | `stop()` returns `ok` |
| STOPPING | FAILED | `stop()` returns error |
| STOPPED | DISPOSED | `dispose()` called |
| DISPOSED | — | Terminal state |

## Cleanup Strategy

- **`stop()`**: Clean up resources that might be restarted (timers, connections, subscriptions)
- **`dispose()`**: Release everything permanently (clear references, free memory)

Both should clean up the same resources defensively — if `stop()` wasn't called, `dispose()` must still clean up:

```ts
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
  context = undefined;
},
```

## Reference

- See `src/definePlugin.ts` for the try/catch wrapping implementation
- See `src/types.ts` for the `PluginDefinition` interface
