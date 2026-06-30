# @agent-os/plugin-sdk

SDK for building Agent OS plugins.

## Overview

The plugin-sdk provides utilities and helpers for creating, testing, and validating Agent OS plugins.

## Features

- **Type-Safe Definitions**: Strongly typed plugin manifests and interfaces
- **Configuration Builder**: Schema builder for plugin configuration
- **Lifecycle Helpers**: Typed lifecycle method implementations
- **Testing Utilities**: Mock context and test helpers

## Usage

```typescript
import { definePlugin, createPluginManifest } from '@agent-os/plugin-sdk';

// Create manifest
const manifest = createPluginManifest({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  author: 'developer',
  description: 'A sample plugin',
  capabilities: ['greeting'],
  dependencies: [],
  minimumAgentOSVersion: '>=0.1.0',
});

// Define plugin with manifest
const myPlugin = definePlugin({
  manifest,
  initialize: async (context) => {
    context.logger.info('Plugin initialized');
    return { ok: true, value: undefined };
  },
  start: async (context) => {
    context.logger.info('Plugin started');
    return { ok: true, value: undefined };
  },
  stop: async (context) => {
    context.logger.info('Plugin stopped');
    return { ok: true, value: undefined };
  },
  dispose: async (context) => {
    context.logger.info('Plugin disposed');
    return { ok: true, value: undefined };
  },
});
```

## Documentation

- [Creating Your First Plugin](./docs/creating-your-first-plugin.md)
- [Plugin Lifecycle](./docs/plugin-lifecycle.md)
- [Plugin Configuration](./docs/plugin-configuration.md)
- [Plugin Best Practices](./docs/plugin-best-practices.md)

## API

### `definePlugin(plugin)`

Type-safe plugin definition helper.

### `createPluginManifest(manifest)`

Type-safe manifest creation helper.

### `createPluginContext(context)`

Type-safe context creation helper.

## Testing

```bash
pnpm --filter @agent-os/plugin-sdk test
```
