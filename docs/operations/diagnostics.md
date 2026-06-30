# Runtime Diagnostics

## Overview

`RuntimeDiagnostics` collects and serves runtime information — memory usage, loaded plugins, adapters, configuration summary, and event bus status. Exposed via `GET /health/diagnostics`.

## DiagnosticsReport Shape

```ts
interface DiagnosticsReport {
  version: string;
  uptimeMs: number;
  buildInfo: BuildInfo;
  loadedPlugins: string[];
  loadedAdapters: string[];
  configurationSummary: Record<string, unknown>;
  memoryUsage: MemoryUsageReport;
  eventBusStatus: {
    activeListeners: number;
    pendingEvents: number;
  };
  startup: {
    phase: string;
    startedAt?: string;
  };
  shutdown: {
    phase: string;
  };
}
```

## MemoryUsageReport

```ts
interface MemoryUsageReport {
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  externalMb: number;
}
```

## BuildInfo

```ts
interface BuildInfo {
  version: string;
  nodeVersion: string;
  platform: string;
  arch: string;
}
```

## Dynamic Updates

The diagnostics object exposes setter methods to update values at runtime:

```ts
import { RuntimeDiagnostics } from "@agent-os/diagnostics";

const diag = new RuntimeDiagnostics("1.2.3");

diag.setPlugins(["auth", "logging", "metrics"]);
diag.setAdapters(["postgres", "redis"]);
diag.setConfiguration({ logLevel: "info", port: 3000 });

// Access the full report
const report = diag.getReport();
console.log(report.memoryUsage.heapUsedMb);
console.log(report.loadedPlugins); // ["auth", "logging", "metrics"]
```

## Accessing via HTTP

The diagnostics endpoint is served at `GET /health/diagnostics` (requires auth — not a public path).

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/health/diagnostics
```

## Example Response

```json
{
  "version": "1.2.3",
  "uptimeMs": 348921,
  "buildInfo": {
    "version": "1.2.3",
    "nodeVersion": "v20.11.0",
    "platform": "linux",
    "arch": "x64"
  },
  "loadedPlugins": ["auth", "logging"],
  "loadedAdapters": ["postgres"],
  "configurationSummary": {
    "logLevel": "info",
    "port": 3000
  },
  "memoryUsage": {
    "heapUsedMb": 42.3,
    "heapTotalMb": 65.8,
    "rssMb": 112.4,
    "externalMb": 2.1
  },
  "eventBusStatus": {
    "activeListeners": 3,
    "pendingEvents": 0
  },
  "startup": {
    "phase": "running",
    "startedAt": "2026-06-30T08:00:00.000Z"
  },
  "shutdown": {
    "phase": "idle"
  }
}
```
