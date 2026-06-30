# @agent-os/plugins

Plugin system for Agent OS.

## Overview

The plugins package provides a complete plugin system with manifest validation, lifecycle management, dependency resolution, and configuration support.

## Features

- **Plugin Manifest**: Define plugins with metadata, capabilities, and dependencies
- **Lifecycle Management**: Register → Initialize → Start → Stop → Dispose
- **Dependency Resolution**: Validate plugin dependencies at registration
- **Configuration Support**: Schema-based configuration with validation
- **Dynamic Loading**: Load plugins from directories at runtime

## Usage

```typescript
import { createPluginPlatform, definePlugin } from '@agent-os/plugins';

// Define a plugin
const myPlugin = definePlugin({
  manifest: {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    author: 'developer',
    description: 'A sample plugin',
    capabilities: ['greeting'],
    dependencies: [],
    minimumAgentOSVersion: '>=0.1.0',
  },
  initialize: async (context) => ({ ok: true, value: undefined }),
  start: async (context) => ({ ok: true, value: undefined }),
  stop: async (context) => ({ ok: true, value: undefined }),
  dispose: async (context) => ({ ok: true, value: undefined }),
});

// Create platform and register
const platform = createPluginPlatform({
  directories: ['./plugins'],
  agentOSVersion: '1.0.0',
  logger,
});

platform.registry.register(myPlugin);
```

## Plugin Lifecycle

```
REGISTERED → INITIALIZING → INITIALIZED → STARTING → RUNNING → STOPPING → STOPPED → DISPOSED
```

## API

### `createPluginPlatform(config)`

Creates a plugin platform with registry, lifecycle, and discovery.

### `definePlugin(plugin)`

Type-safe plugin definition helper.

### `createPluginManifest(manifest)`

Type-safe manifest creation helper.

## Manifest Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique plugin identifier |
| `name` | string | Human-readable name |
| `version` | string | Semver version |
| `author` | string | Plugin author |
| `description` | string | Plugin description |
| `capabilities` | string[] | Plugin capabilities |
| `dependencies` | PluginDependency[] | Required plugins |
| `minimumAgentOSVersion` | string | Minimum Agent OS version |

## Testing

```bash
pnpm --filter @agent-os/plugins test
```
