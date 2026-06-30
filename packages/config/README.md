# @agent-os/config

Configuration management for Agent OS.

## Overview

The config package provides a layered configuration system with schema validation, secret handling, and priority-based merging.

## Features

- **Schema Validation**: Define configuration schemas with types, constraints, and defaults
- **Priority Merging**: Runtime overrides > env vars > config file > defaults
- **Secret Handling**: Safe secret masking and logging with `SecretValue`
- **Environment Variables**: Automatic env var mapping with `AGENT_OS_` prefix
- **Type-Safe Access**: Typed configuration access with `getTyped<T>()`

## Usage

```typescript
import { createConfigProvider, createConfigRegistry } from '@agent-os/config';

// Define schema
const schema = {
  port: { type: 'number', required: true, min: 1, max: 65535 },
  host: { type: 'string', required: true, minLength: 1 },
  debug: { type: 'boolean', default: false },
};

// Create provider
const provider = createConfigProvider({
  schema,
  defaults: { port: 3000, host: 'localhost' },
});

// Access config
const port = provider.getTyped('port', schema.port); // 3000
```

## API

### `createConfigProvider(config)`

Creates a typed configuration provider.

### `createConfigRegistry()`

Creates a registry for named configuration providers.

### `createConfigLoader(config)`

Creates a config loader with priority merging.

### `validateConfig(schema, data)`

Validates configuration data against a schema.

## Schema Types

| Type | Description |
|------|-------------|
| `string` | String values with minLength/maxLength/pattern |
| `number` | Numeric values with min/max/integer |
| `boolean` | Boolean values |
| `array` | Array values with minItems/maxItems |
| `object` | Nested object values |
| `enum` | Enumerated values |

## Environment Variables

Configuration can be provided via environment variables with the `AGENT_OS_` prefix:

- `AGENT_OS_PORT=3000` → `port: 3000`
- `AGENT_OS_DEBUG=true` → `debug: true`

## Testing

```bash
pnpm --filter @agent-os/config test
```
