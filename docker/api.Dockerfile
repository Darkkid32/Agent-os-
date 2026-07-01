# Agent OS API — multi-stage Dockerfile.
#
# Targets built from this file:
#   development  → runs with tsx watch + hot reload
#   builder      → compiles TypeScript to dist/
#   production   → runs compiled JS as a non-root user
#
# Builds from repo root:
#   docker build -f docker/api.Dockerfile --target development   -t agent-os/api:dev       .
#   docker build -f docker/api.Dockerfile --target production    -t agent-os/api:prod      .

# ---------- Base ----------
FROM node:20.11.1-bookworm-slim AS base
WORKDIR /repo
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate && \
    apt-get update && apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# ---------- Dependencies ----------
FROM base AS deps
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc ./
COPY apps/api/package.json          ./apps/api/
COPY apps/dashboard/package.json    ./apps/dashboard/
COPY packages/core/package.json     ./packages/core/
COPY packages/shared/package.json   ./packages/shared/
COPY packages/runtime/package.json  ./packages/runtime/
COPY packages/workflow/package.json ./packages/workflow/
COPY packages/agents/package.json   ./packages/agents/
COPY packages/memory/package.json   ./packages/memory/
COPY packages/event-bus/package.json ./packages/event-bus/
COPY packages/observability/package.json ./packages/observability/
COPY packages/ui/package.json       ./packages/ui/
COPY packages/hermes/package.json   ./packages/hermes/
COPY packages/plugins/package.json  ./packages/plugins/
COPY packages/plugin-sdk/package.json ./packages/plugin-sdk/
COPY packages/adapters-cli/package.json ./packages/adapters-cli/
COPY packages/adapters-discord/package.json ./packages/adapters-discord/
COPY packages/adapters-telegram/package.json ./packages/adapters-telegram/
COPY packages/adapters-webhook/package.json ./packages/adapters-webhook/
COPY packages/adapters-mcp/package.json ./packages/adapters-mcp/
COPY packages/adapters-whatsapp/package.json ./packages/adapters-whatsapp/
COPY packages/adapters-email/package.json ./packages/adapters-email/

RUN --mount=type=cache,id=pnpm-api,target=/pnpm/store pnpm fetch
RUN --mount=type=cache,id=pnpm-api,target=/pnpm/store pnpm install --frozen-lockfile --filter @agent-os/api...

# ---------- Development ----------
FROM deps AS development
WORKDIR /repo
COPY . .
ENV NODE_ENV=development
ENV PORT=4000
ENV PATH="/repo/apps/api/node_modules/.bin:$PATH"
EXPOSE 4000
# `tsx watch` reloads on source changes; the dev container is paired with the
# host source via a bind mount so we don't bake sources into the image.
CMD ["pnpm", "--filter", "@agent-os/api", "run", "dev"]

# ---------- Builder ----------
FROM deps AS builder
WORKDIR /repo
COPY . .
RUN pnpm --filter @agent-os/core --filter @agent-os/shared --filter @agent-os/observability --filter @agent-os/runtime --filter @agent-os/agents --filter @agent-os/workflow --filter @agent-os/memory --filter @agent-os/event-bus --filter @agent-os/hermes run build
RUN pnpm --filter @agent-os/api run build

# ---------- Production ----------
FROM node:20.11.1-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

COPY --from=builder /repo/apps/api/dist           ./dist
COPY --from=builder /repo/apps/api/package.json   ./

# Copy the workspace packages the API needs at runtime. These are referenced
# from package.json as `workspace:*` at build time and resolved via these
# explicit copies so the runtime container is fully self-contained.
COPY --from=builder /repo/packages/core/dist              ./node_modules/@agent-os/core/dist
COPY --from=builder /repo/packages/core/package.json      ./node_modules/@agent-os/core/
COPY --from=builder /repo/packages/shared/dist            ./node_modules/@agent-os/shared/dist
COPY --from=builder /repo/packages/shared/package.json    ./node_modules/@agent-os/shared/
COPY --from=builder /repo/packages/observability/dist     ./node_modules/@agent-os/observability/dist
COPY --from=builder /repo/packages/observability/package.json ./node_modules/@agent-os/observability/
COPY --from=builder /repo/packages/hermes/dist            ./node_modules/@agent-os/hermes/dist
COPY --from=builder /repo/packages/hermes/package.json    ./node_modules/@agent-os/hermes/
COPY --from=builder /repo/packages/runtime/dist           ./node_modules/@agent-os/runtime/dist
COPY --from=builder /repo/packages/runtime/package.json   ./node_modules/@agent-os/runtime/
COPY --from=builder /repo/packages/agents/dist            ./node_modules/@agent-os/agents/dist
COPY --from=builder /repo/packages/agents/package.json    ./node_modules/@agent-os/agents/

EXPOSE 4000
USER node
CMD ["node", "dist/server.js"]
