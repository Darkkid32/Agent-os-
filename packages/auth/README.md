# @agent-os/auth

Authentication and authorization for Agent OS.

## Overview

The auth package provides pluggable authentication and role-based authorization for Agent OS adapters and API routes.

## Features

- **API Key Authentication**: Validate API keys mapped to roles
- **Bearer Token Authentication**: Validate JWT/bearer tokens mapped to roles
- **Role-Based Authorization**: Admin and viewer roles with HTTP action permissions
- **Constant-Time Comparison**: Timing-safe credential comparison to prevent timing attacks
- **Audit Logging**: Authentication events logged for security monitoring

## Usage

```typescript
import { createApiKeyProvider, createBearerTokenProvider, canHttp } from '@agent-os/auth';

// Create API key provider
const apiKeyProvider = createApiKeyProvider({
  keys: [
    { key: 'your-api-key', role: 'admin', id: 'admin-1' },
  ],
});

// Create bearer token provider
const bearerProvider = createBearerTokenProvider({
  tokens: [
    { token: 'your-bearer-token', role: 'viewer', id: 'viewer-1' },
  ],
});

// Check permissions
if (canHttp('admin', 'start')) {
  // Allow action
}
```

## API

### `createApiKeyProvider(config)`

Creates an API key authentication provider.

### `createBearerTokenProvider(config)`

Creates a bearer token authentication provider.

### `canHttp(role, action)`

Checks if a role can perform an HTTP action.

### `requireHttpRole(role, action)`

Throws `PermissionError` if role cannot perform action.

## Roles

| Role | Permissions |
|------|-------------|
| `admin` | All actions (start, stop, restart, health, status, config, plugins, admin, modules, version) |
| `viewer` | Read-only actions (health, status, version) |

## Testing

```bash
pnpm --filter @agent-os/auth test
```
