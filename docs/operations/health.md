# Health Monitoring

## Overview

The health system provides two probe types:

- **Liveness** — Is the process alive and responsive? Use this to decide if a container should be restarted.
- **Readiness** — Are all dependencies connected and ready to serve traffic? Use this to decide if a container should receive requests.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness probe (default) |
| GET | `/health/live` | Liveness alias |
| GET | `/health/ready` | Readiness probe with dependency checks |
| GET | `/health/diagnostics` | Runtime diagnostics (memory, plugins, uptime) |

Both `/health` and `/health/ready` are **public paths** — no auth required. This is intentional so orchestrators can probe without credentials.

## Health Check Results

Every check returns a result with this shape:

```ts
interface HealthCheckResult {
  name: string;
  status: "ok" | "degraded" | "down";
  message?: string;
  latencyMs?: number;
}
```

## Readiness Behavior

`GET /health/ready` runs all registered dependency checks. If **any** check returns `"down"`, the endpoint responds with **503** and the full check results. All checks must pass (or be `"degraded"`) for a 200 response.

## Registering Custom Checks

Use `HealthManager` to register dependency checks:

```ts
import { HealthManager } from "@agent-os/health";

const health = new HealthManager();

health.register({
  name: "database",
  check: async () => {
    const start = Date.now();
    await db.ping();
    return {
      name: "database",
      status: "ok",
      latencyMs: Date.now() - start,
    };
  },
});

health.register({
  name: "redis",
  check: async () => {
    const start = Date.now();
    const ok = await redis.ping();
    return {
      name: "redis",
      status: ok ? "ok" : "down",
      message: ok ? undefined : "Connection refused",
      latencyMs: Date.now() - start,
    };
  },
});
```

## Docker Healthcheck

Use `/health` (liveness) in your Dockerfile or Compose file:

```dockerfile
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

Compose equivalent:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 10s
  timeout: 3s
  start_period: 5s
  retries: 3
```
