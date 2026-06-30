# Startup Lifecycle

## Overview

`StartupManager` orchestrates ordered service initialization with dependency resolution. Steps are topologically sorted — if step B depends on step A, A runs first regardless of registration order.

## Phases

```
idle → starting → running
                → failed
                → rolled-back
```

## Usage

```ts
import { StartupManager } from "@agent-os/startup";

const startup = new StartupManager({ timeout: 60_000 });

startup.add({
  name: "config",
  start: async () => {
    await loadConfig();
  },
});

startup.add({
  name: "database",
  dependsOn: ["config"], // runs after config
  start: async () => {
    await db.connect();
  },
  rollback: async () => {
    await db.disconnect();
  },
});

startup.add({
  name: "server",
  dependsOn: ["database"],
  start: async () => {
    await app.listen(3000);
  },
  rollback: async () => {
    await app.close();
  },
});

await startup.start();
// All steps started in dependency order
```

## Failure and Rollback

When a step fails:

1. The startup phase transitions to `failed`.
2. All steps that **already started** are rolled back in **reverse registration order**.
3. Each step's `rollback` function is called if defined. Steps without a rollback are skipped.
4. The phase transitions to `rolled-back`.

## Timeout

Each startup run has a configurable timeout (default 60s). If the total startup exceeds this, all steps are rolled back. Set via the constructor:

```ts
const startup = new StartupManager({ timeout: 120_000 }); // 2 minutes
```

## Checking Status

```ts
const phase = startup.phase; // "idle" | "starting" | "running" | "failed" | "rolled-back"

if (phase === "failed") {
  console.error("Startup failed:", startup.error);
}
```
