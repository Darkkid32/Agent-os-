# Authentication & Authorization

Agent OS provides production-grade authentication and authorization for HTTP surfaces via the `@agent-os/auth` package.

## Overview

The authentication system is pluggable and supports multiple credential types:

- **API Key** authentication via `X-API-Key` header
- **Bearer Token** authentication via `Authorization: Bearer <token>` header
- **Custom** authentication via the `AuthenticationProvider` interface

Authorization uses a role-based model with two roles:

| Role | Description |
|------|-------------|
| `admin` | Full access to all operations |
| `viewer` | Read-only access (health, status, config, modules, version) |

## Quick Start

### 1. Create an authentication provider

```ts
import { createApiKeyProvider } from '@agent-os/auth';

const provider = createApiKeyProvider({
  keys: [
    { key: 'your-admin-key', role: 'admin', id: 'admin-1' },
    { key: 'your-viewer-key', role: 'viewer', id: 'viewer-1' },
  ],
});
```

### 2. Configure the API server

```ts
import { buildApp } from './app.js';

const app = await buildApp({
  auth: {
    provider,
    publicPaths: ['/health', '/version'],
  },
});
```

### 3. Add route-level authorization

```ts
import { requireAction } from '@agent-os/auth';

// Admin-only route
app.post('/v1/start', { preHandler: [requireAction('start')] }, async () => {
  // Only admin can reach here
});

// Any authenticated user
app.get('/v1/status', async (request) => {
  const role = request.auth?.role; // 'admin' or 'viewer'
});
```

## Authentication Flow

```
Request
  │
  ├─ Public path? ──yes──> Allow (no auth check)
  │
  ├─ No credentials? ──yes──> 401 AUTH_MISSING
  │
  ├─ Validate credentials via provider
  │   │
  │   ├─ Invalid? ──> 403 AUTH_FORBIDDEN
  │   │
  │   └─ Valid? ──> Attach AuthenticatedSubject to request.auth
  │
  └─ Route requires action? ──> Check canHttp(role, action)
      │
      ├─ Denied? ──> 403 AUTH_FORBIDDEN
      │
      └─ Allowed? ──> Proceed
```

## API Reference

### `createApiKeyProvider(config)`

Creates an API key authentication provider.

```ts
const provider = createApiKeyProvider({
  keys: [
    { key: 'secret-key', role: 'admin', id: 'user-1', metadata: { team: 'platform' } },
  ],
});
```

Each key maps to a role and identity. Credentials are compared in constant time.

### `createBearerTokenProvider(config)`

Creates a bearer token authentication provider.

```ts
const provider = createBearerTokenProvider({
  tokens: [
    { token: 'service-token', role: 'admin', id: 'svc-1' },
  ],
});
```

### `AuthenticationProvider` interface

Implement this for custom authentication (OAuth, SAML, JWT, etc.):

```ts
import type { AuthenticationProvider } from '@agent-os/auth';

const customProvider: AuthenticationProvider = {
  name: 'custom',

  async authenticate(credentials) {
    // Your validation logic
    if (isValid(credentials)) {
      return {
        ok: true,
        subject: { id: 'user-1', role: 'admin', method: 'custom' },
      };
    }
    return { ok: false, reason: 'Invalid credentials' };
  },
};
```

### `authPlugin` (Fastify plugin)

Registers authentication middleware on a Fastify instance.

```ts
await app.register(authPlugin, {
  provider: myProvider,
  publicPaths: ['/health', '/version'],  // optional, defaults shown
});
```

### `requireAction(action)`

Route-level authorization decorator. Use as a `preHandler` hook.

```ts
import { requireAction } from '@agent-os/auth';

// Protect a route
app.delete('/v1/plugins/:id', {
  preHandler: [requireAction('plugins')],
}, async () => { /* ... */ });
```

### `canHttp(role, action)`

Boolean check for role/action combination:

```ts
if (canHttp('viewer', 'status')) {
  // true
}
```

## Actions

| Action | Admin | Viewer | Description |
|--------|-------|--------|-------------|
| `start` | yes | no | Start Hermes kernel |
| `stop` | yes | no | Stop Hermes kernel |
| `restart` | yes | no | Restart Hermes kernel |
| `health` | yes | yes | Health check |
| `status` | yes | yes | Kernel status |
| `config` | yes | yes | View configuration |
| `plugins` | yes | no | Plugin management |
| `admin` | yes | no | Admin operations |
| `modules` | yes | yes | List modules |
| `version` | yes | yes | Version info |

## Security Features

### Constant-time comparison

All credential comparisons use `crypto.timingSafeEqual` to prevent timing attacks. Even if an attacker can measure response times, they cannot determine how many bytes of the credential matched.

### Structured audit logging

All authentication events are logged via `@agent-os/observability`:

- `debug`: successful authentication
- `warn`: missing credentials, failed authentication, authorization denied

Logs include: method, URL, subject ID, role, and denial reason.

### Error responses

Authentication errors use the standard Agent OS error envelope:

```json
{
  "ok": false,
  "error": {
    "code": "AUTH_MISSING",
    "message": "Authentication credentials required"
  }
}
```

| HTTP | Code | When |
|------|------|------|
| 401 | `AUTH_MISSING` | No credentials provided |
| 403 | `AUTH_FORBIDDEN` | Invalid credentials or role denied |

## Environment Variables

Authentication is configured via constructor injection, not environment variables. However, API keys and tokens can be loaded from environment variables at the application entry point:

```ts
const provider = createApiKeyProvider({
  keys: [
    { key: process.env['ADMIN_API_KEY'] ?? '', role: 'admin', id: 'admin' },
    { key: process.env['VIEWER_API_KEY'] ?? '', role: 'viewer', id: 'viewer' },
  ],
});
```

## Testing

The auth package includes comprehensive tests:

```bash
pnpm --filter @agent-os/auth test
```

Test files:
- `credentials.test.ts` — constant-time comparison edge cases
- `ApiKeyProvider.test.ts` — API key validation
- `BearerTokenProvider.test.ts` — Bearer token validation
- `permissions.test.ts` — Role/action authorization matrix
- `authPlugin.test.ts` — Full Fastify middleware integration
