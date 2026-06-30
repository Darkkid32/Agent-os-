# Plugin Configuration

Plugins can define typed configuration schemas using `definePluginConfig()`. This document covers the builder API, field types, config access, and validation.

## Defining a Config Schema

Use `definePluginConfig()` to create a chainable builder:

```ts
import { definePluginConfig } from '@agent-os/plugin-sdk';

const configSchema = definePluginConfig()
  .field('host', 'string')
    .required()
    .default('localhost')
    .description('Server host')
    .build()
  .field('port', 'number')
    .required()
    .default(3000)
    .description('Server port')
    .build()
  .build();
```

Call `.build()` on each field to commit it, then call `.build()` on the schema builder to produce the final `PluginConfigSchema`.

## Supported Field Types

| Type | JavaScript type | Example |
|------|----------------|---------|
| `'string'` | `string` | `'localhost'` |
| `'number'` | `number` | `3000` |
| `'boolean'` | `boolean` | `true` |
| `'object'` | `Record<string, unknown>` | `{ host: 'localhost', port: 5432 }` |
| `'array'` | `unknown[]` | `['tag1', 'tag2']` |

## Field Builder Methods

Each field supports these chained methods:

| Method | Description |
|--------|-------------|
| `.required(required?)` | Mark field as required (default: `true`) |
| `.default(value)` | Set a default value |
| `.description(desc)` | Human-readable description |
| `.enum(values)` | Restrict to a set of allowed values |
| `.properties(props)` | Define nested fields for `object` type |
| `.items(itemSchema)` | Define element schema for `array` type |

## Examples

### String with Enum

```ts
const schema = definePluginConfig()
  .field('mode', 'string')
    .enum(['development', 'production'])
    .default('development')
    .build()
  .build();
```

### Boolean

```ts
const schema = definePluginConfig()
  .field('debug', 'boolean')
    .default(false)
    .build()
  .build();
```

### Nested Object

```ts
const schema = definePluginConfig()
  .field('database', 'object')
    .properties({
      host: { type: 'string', default: 'localhost' },
      port: { type: 'number', default: 5432 },
    })
    .build()
  .build();
```

### Array

```ts
const schema = definePluginConfig()
  .field('tags', 'array')
    .items({ type: 'string' })
    .build()
  .build();
```

## Accessing Config in Your Plugin

Pass the schema to `definePlugin` and access values via `context.config`:

```ts
import { definePlugin, definePluginConfig } from '@agent-os/plugin-sdk';

const configSchema = definePluginConfig()
  .field('apiKey', 'string')
    .required()
    .description('API key for external service')
    .build()
  .build();

const myPlugin = definePlugin({
  manifest: {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    author: 'Developer',
    description: 'Plugin with config',
    capabilities: [],
    dependencies: [],
    minimumAgentOSVersion: '1.0.0',
    configSchema,
  },
  configSchema,
  initialize: async (context) => {
    // Get a single value
    const apiKey = context.config.get<string>('apiKey');

    // Check if a key exists
    if (context.config.has('apiKey')) {
      context.logger.info('API key configured');
    }

    // Get all config values
    const all = context.config.all();

    // Get the schema
    const schema = context.config.schema();
  },
});
```

## Config API Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `config.get<T>(key)` | `T \| undefined` | Get a typed config value |
| `config.require<T>(key)` | `T` | Get a value or throw if missing |
| `config.has(key)` | `boolean` | Check if a key exists |
| `config.all()` | `Record<string, unknown>` | Get all config values |
| `config.schema()` | `PluginConfigSchema \| undefined` | Get the config schema |

## Config Sources

Configuration values come from sources with numeric priority (lower = higher priority):

```ts
const context = createPluginContext({
  hermes: mockHermes,
  logger: mockLogger,
  metrics: mockMetrics,
  tracer: mockTracer,
  eventBus: mockEventBus,
  pluginId: 'my-plugin',
  configValues: { host: 'prod.example.com' },  // priority 0
  configSchema: myConfigSchema,
});
```

When multiple sources provide the same key, the source with the lowest priority number wins.

## Using with `createPluginContext`

When testing, pass `configValues` and `configSchema` directly:

```ts
const context = createPluginContext({
  hermes: mockHermes,
  logger: mockLogger,
  metrics: mockMetrics,
  tracer: mockTracer,
  eventBus: mockEventBus,
  pluginId: 'my-plugin',
  configSchema: {
    host: { type: 'string', default: 'localhost' },
    port: { type: 'number', default: 3000 },
  },
  configValues: { host: 'test.local', port: 4000 },
});

expect(context.config.get('host')).toBe('test.local');
expect(context.config.get('port')).toBe(4000);
```

## Reference

- See `src/definePluginConfig.ts` for the builder implementation
- See `src/definePluginConfig.test.ts` for config schema examples
- See `src/createPluginContext.ts` for config source resolution
