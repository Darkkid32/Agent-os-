# Docker configuration

Agent OS ships two per-app Dockerfiles and two compose files for two distinct
workflows.

| File                         | Role                                                     |
| ---------------------------- | -------------------------------------------------------- |
| `api.Dockerfile`             | Fastify API (targets: `development`, `builder`, `production`) |
| `dashboard.Dockerfile`       | Next.js dashboard (targets: `development`, `builder`, `production`) |
| `docker-compose.yml`         | Production orchestration (api, dashboard, postgres, redis) |
| `docker-compose.dev.yml`     | Development overlay (mounts source, dev targets, debug logs) |
| `.env.example`               | Environment template — copy to `.env` before running     |
| `.env.gitignore`             | Local-only env rules                                     |

See also: `docs/deployment/docker.md` for the full deployment guide.

## Build images locally

```bash
docker build -f docker/api.Dockerfile       --target production -t agent-os/api:prod       .
docker build -f docker/dashboard.Dockerfile --target production -t agent-os/dashboard:prod .
```

## Run production stack

```bash
cp docker/.env.example docker/.env
# Edit docker/.env (at minimum set OPENROUTER_API_KEY)
docker compose -f docker/docker-compose.yml --env-file docker/.env up --build
```

This starts:

- `api`        on `http://localhost:4000`
- `dashboard`  on `http://localhost:3000`
- `postgres`   on `localhost:5432` (user `agent_os`, db `agent_os`)
- `redis`      on `localhost:6379`

## Run development stack

The dev overlay binds source directories into the containers so the dev
processes (`tsx watch`, `next dev`) hot-reload on host edits:

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
  --env-file docker/.env \
  up --build
```

Tear down without losing data:

```bash
docker compose -f docker/docker-compose.yml down          # keeps volumes
docker compose -f docker/docker-compose.yml down --volumes # nukes db & cache
```

## Health checks

All services have Docker health checks configured:

- **API**: `GET /health` every 10s (liveness)
- **Dashboard**: `GET /health` every 10s
- **Postgres**: `pg_isready` every 5s
- **Redis**: `redis-cli ping` every 5s

The API also exposes a readiness endpoint at `GET /health/ready`.

## Graceful shutdown

The API handles `SIGINT`/`SIGTERM` with a configurable timeout (default 30s,
configurable via `SHUTDOWN_TIMEOUT_MS`). Docker's `stop_grace_period` is set
to 35s to allow clean shutdown before `SIGKILL`.

## Image size

Both production images are pinned to `node:20.11.1-bookworm-slim` and run as
the built-in `node` user. The dashboard uses Next.js's `output: 'standalone'`
mode in `apps/dashboard/next.config.cjs` to ship only the JS the runtime
needs.

## Common leaks to avoid

- Never copy `pnpm-lock.yaml` from a different Node version.
- Never bake `.env` into an image — `.env` is meant only for compose.
- The dashboard container must reach the API via the internal Docker network,
  not `localhost`. Override `NEXT_PUBLIC_API_BASE_URL=http://api:4000`.
