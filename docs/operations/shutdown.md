# Graceful Shutdown

## Overview

`ShutdownManager` orchestrates ordered, idempotent service teardown. Steps run in **reverse registration order** (last registered = first shut down). Duplicate shutdown calls are ignored.

## Phases

```
idle → shutting-down → stopped
                     → timed-out
```

## Usage

```ts
import { ShutdownManager } from "@agent-os/shutdown";

const shutdown = new ShutdownManager({ timeout: 30_000 });

shutdown.add("server", async () => {
  await app.close();
});

shutdown.add("database", async () => {
  await db.disconnect();
});

shutdown.add("cache", async () => {
  await redis.quit();
});

// Triggers: server → database → cache
await shutdown.run();
```

## Signal Handling

Call `installSignalHandlers()` to wire SIGINT and SIGTERM automatically:

```ts
import { ShutdownManager } from "@agent-os/shutdown";

const shutdown = new ShutdownManager();
shutdown.add("cleanup", async () => {
  await removeTempFiles();
});

shutdown.installSignalHandlers();
// Process will shut down cleanly on SIGINT or SIGTERM
```

## Idempotency

Calling `shutdown.run()` multiple times is safe — only the first call executes. Subsequent calls return immediately.

```ts
await shutdown.run(); // executes teardown
await shutdown.run(); // no-op, returns immediately
```

## Timeout

If teardown exceeds the configured timeout (default 30s), remaining steps are abandoned and the phase transitions to `timed-out`.

```ts
const shutdown = new ShutdownManager({ timeout: 10_000 }); // 10 seconds
```

## Timer Behavior

The internal timeout timer uses `.unref()` so it won't keep the Node.js process alive if the event loop would otherwise exit.

## Integration with Fastify

Wire shutdown to your Fastify instance:

```ts
import Fastify from "fastify";
import { ShutdownManager } from "@agent-os/shutdown";

const app = Fastify();
const shutdown = new ShutdownManager();

shutdown.add("fastify", async () => {
  await app.close();
});

shutdown.installSignalHandlers();
```

## Checking Status

```ts
const phase = shutdown.phase; // "idle" | "shutting-down" | "stopped" | "timed-out"
```
