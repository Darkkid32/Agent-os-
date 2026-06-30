# Docker Deployment

Agent OS ships with Docker support for deploying the full platform (API + Dashboard + Postgres + Redis) as containers.

## Prerequisites

- Docker Engine 24.0+ or Docker Desktop 4.25+
- Docker Compose v2.20+
- 4 GB RAM minimum for all services

## Quick Start

```bash
# Copy environment template
cp docker/.env.example docker/.env

# Edit docker/.env with your settings (at minimum, set OPENROUTER_API_KEY)
# Then start the stack:
docker compose -f docker/docker-compose.yml --env-file docker/.env up --build
```

This starts:

| Service    | URL                        | Description              |
| ---------- | -------------------------- | ------------------------ |
| API        | http://localhost:4000       | Fastify HTTP API         |
| Dashboard  | http://localhost:3000       | Next.js dashboard        |
| Postgres   | localhost:5432             | PostgreSQL 16            |
| Redis      | localhost:6379             | Redis 7                  |

## Building Images

### Production images

```bash
docker build -f docker/api.Dockerfile --target production -t agent-os/api:prod .
docker build -f docker/dashboard.Dockerfile --target production -t agent-os/dashboard:prod .
```

### Development images

```bash
docker build -f docker/api.Dockerfile --target development -t agent-os/api:dev .
docker build -f docker/dashboard.Dockerfile --target development -t agent-os/dashboard:dev .
```

## Docker Compose Files

| File                         | Purpose                                            |
| ---------------------------- | -------------------------------------------------- |
| `docker-compose.yml`         | Production orchestration (api, dashboard, postgres, redis) |
| `docker-compose.dev.yml`     | Development overlay (hot reload, debug logs)       |

### Production stack

```bash
docker compose -f docker/docker-compose.yml --env-file docker/.env up --build
```

### Development stack

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
  --env-file docker/.env up --build
```

### Tear down

```bash
# Stop containers (keeps volumes)
docker compose -f docker/docker-compose.yml down

# Stop containers and remove volumes (loses data)
docker compose -f docker/docker-compose.yml down --volumes
```

## Environment Variables

Copy `docker/.env.example` to `docker/.env` and configure:

### Required

| Variable            | Description                                      |
| ------------------- | ------------------------------------------------ |
| `OPENROUTER_API_KEY`| API key for OpenRouter LLM provider              |

### Optional

| Variable               | Default                                          |
| ---------------------- | ------------------------------------------------ |
| `NODE_ENV`             | `development`                                    |
| `PORT`                 | `4000`                                           |
| `LOG_LEVEL`            | `info`                                           |
| `SHUTDOWN_TIMEOUT_MS`  | `30000`                                          |
| `DATABASE_URL`         | `postgres://agent_os:agent_os@postgres:5432/agent_os` |
| `POSTGRES_DB`          | `agent_os`                                       |
| `POSTGRES_USER`        | `agent_os`                                       |
| `POSTGRES_PASSWORD`    | `agent_os`                                       |
| `REDIS_URL`            | `redis://redis:6379`                             |
| `OTEL_ENABLED`         | `false`                                          |
| `OTEL_SERVICE_NAME`    | `agent-os`                                       |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | (empty)                                  |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:4000`                       |

## Health Checks

All services have Docker health checks configured:

- **API**: `GET /health` every 10s (liveness), 5s timeout, 3 retries, 10s start period
- **Dashboard**: `GET /health` every 10s, 5s timeout, 3 retries, 15s start period
- **Postgres**: `pg_isready` every 5s, 5s timeout, 5 retries
- **Redis**: `redis-cli ping` every 5s, 5s timeout, 5 retries

### Readiness endpoint

The API exposes a `/health/ready` endpoint for readiness probes. This is separate from the liveness `/health` endpoint and can be used to verify the service is ready to accept traffic.

### Docker healthcheck behavior

- **Healthy**: Container is operational and responding to health checks
- **Unhealthy**: Container failed health checks after the specified retries
- **Starting**: Container is within the start_period and hasn't failed yet

## Graceful Shutdown

The API server handles `SIGINT` and `SIGTERM` signals for graceful shutdown:

1. Stops accepting new connections
2. Drains in-flight requests
3. Closes database connections
4. Exits cleanly

The shutdown timeout defaults to 30 seconds and is configurable via `SHUTDOWN_TIMEOUT_MS`. If shutdown takes longer than the timeout, the process exits with code 1.

Docker's `stop_grace_period` is set to 35 seconds (5 seconds above the default shutdown timeout) to allow the application to finish before Docker sends `SIGKILL`.

## Architecture

### Dockerfiles

Both Dockerfiles use multi-stage builds with three targets:

| Target       | Purpose                                         |
| ------------ | ----------------------------------------------- |
| `development`| Hot reload with `tsx watch` / `next dev`        |
| `builder`    | Compiles TypeScript and builds Next.js           |
| `production` | Minimal runtime image with compiled output       |

Base image: `node:20.11.1-bookworm-slim`

### Production images

- **API**: Copies compiled `dist/` and workspace package dependencies into a minimal image. Runs as `node` user on port 4000.
- **Dashboard**: Uses Next.js `output: 'standalone'` for a self-contained production build. Runs as `node` user on port 3000.

### Networking

All services communicate over a shared bridge network (`agent-os-net`). Internal service discovery uses Docker DNS:

- API connects to Postgres via `postgres:5432`
- API connects to Redis via `redis:6379`
- Dashboard connects to API via `http://api:4000`

## Troubleshooting

### Container fails to start

Check logs:
```bash
docker compose -f docker/docker-compose.yml logs api
docker compose -f docker/docker-compose.yml logs dashboard
```

### Health check failures

Verify the API is responding:
```bash
curl http://localhost:4000/health
curl http://localhost:4000/health/ready
```

### Database connection issues

Ensure Postgres is healthy:
```bash
docker compose -f docker/docker-compose.yml ps postgres
docker compose -f docker/docker-compose.yml exec postgres pg_isready -U agent_os
```

### Build cache issues

Clean Docker build cache:
```bash
docker builder prune -af
```

### Port conflicts

If ports 4000, 3000, 5432, or 6379 are in use, stop conflicting services or modify the port mappings in `docker-compose.yml`.

## Security Notes

- Never bake `.env` files into Docker images
- Production containers run as the `node` user (non-root)
- Use strong `POSTGRES_PASSWORD` values in production
- The `.dockerignore` excludes `.git`, `node_modules`, and other unnecessary files from the build context
