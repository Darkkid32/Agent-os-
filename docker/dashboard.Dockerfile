# Agent OS Dashboard — multi-stage Dockerfile.
#
# Targets built from this file:
#   development  → next dev with hot reload
#   builder      → next build (static output + standalone server)
#   production   → standalone Next.js server as a non-root user
#
# Builds from repo root:
#   docker build -f docker/dashboard.Dockerfile --target development   -t agent-os/dashboard:dev      .
#   docker build -f docker/dashboard.Dockerfile --target production    -t agent-os/dashboard:prod     .

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
COPY packages/agents/package.json   ./packages/agents/
COPY packages/adapters-cli/package.json ./packages/adapters-cli/
COPY packages/adapters-discord/package.json ./packages/adapters-discord/
COPY packages/adapters-telegram/package.json ./packages/adapters-telegram/
COPY packages/adapters-webhook/package.json ./packages/adapters-webhook/
COPY packages/adapters-mcp/package.json ./packages/adapters-mcp/
COPY packages/adapters-whatsapp/package.json ./packages/adapters-whatsapp/
COPY packages/adapters-email/package.json ./packages/adapters-email/

RUN --mount=type=cache,id=pnpm-dashboard,target=/pnpm/store pnpm fetch
RUN --mount=type=cache,id=pnpm-dashboard,target=/pnpm/store pnpm install --frozen-lockfile --filter @agent-os/dashboard...

# ---------- Development ----------
FROM deps AS development
WORKDIR /repo
COPY . .
ENV NODE_ENV=development
ENV PORT=3000
ENV PATH="/repo/apps/dashboard/node_modules/.bin:$PATH"
EXPOSE 3000
CMD ["pnpm", "--filter", "@agent-os/dashboard", "run", "dev"]

# ---------- Builder ----------
FROM deps AS builder
WORKDIR /repo
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @agent-os/core --filter @agent-os/shared --filter @agent-os/ui run build
RUN pnpm --filter @agent-os/dashboard run build

# ---------- Production ----------
FROM node:20.11.1-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Use Next.js standalone output for the smallest final image.
COPY --from=builder /repo/apps/dashboard/.next/standalone ./
COPY --from=builder /repo/apps/dashboard/.next/static     ./.next/static
COPY --from=builder /repo/apps/dashboard/public           ./public

EXPOSE 3000
USER node
CMD ["node", "server.js"]
