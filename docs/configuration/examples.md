# Configuration Examples

## Basic API Configuration

```ts
import { createConfigProvider } from '@agent-os/config';
import type { ConfigSchema } from '@agent-os/config';

const apiSchema: ConfigSchema = {
  host: { type: 'string', default: '0.0.0.0' },
  port: { type: 'number', default: 3000, min: 1, max: 65535 },
  debug: { type: 'boolean', default: false },
  logLevel: {
    type: 'enum',
    values: ['debug', 'info', 'warn', 'error'],
    default: 'info',
  },
};

const config = createConfigProvider('api', apiSchema, [
  { kind: 'defaults', values: {} },
  { kind: 'env', prefix: 'AGENT_OS_' },
]);
```

## Nested Configuration

```ts
const schema: ConfigSchema = {
  db: {
    type: 'object',
    properties: {
      host: { type: 'string', default: 'localhost' },
      port: { type: 'number', default: 5432 },
      name: { type: 'string', required: true },
    },
  },
};

const config = createConfigProvider('app', schema, [
  { kind: 'defaults', values: {} },
  { kind: 'runtime', values: { db: { name: 'agent_os' } } },
]);

const dbHost = config.getTyped<{ host: string; port: number }>('db').host;
```

## Secrets

```ts
import { SecretValue } from '@agent-os/config';

const schema: ConfigSchema = {
  apiKey: { type: 'string', required: true },
  dbPassword: { type: 'string', required: true },
};

const config = createConfigProvider('secrets', schema, [
  { kind: 'defaults', values: {} },
  { kind: 'env', prefix: 'AGENT_OS_' },
]);

const apiKey = SecretValue.of(config.getTyped<string>('apiKey'));
const dbPass = SecretValue.of(config.getTyped<string>('dbPassword'));

// Safe for logging
logger.info({ apiKey: apiKey.masked() }, 'secrets loaded');
```

## Registry Pattern

```ts
import { createConfigRegistry, createConfigProvider } from '@agent-os/config';

const registry = createConfigRegistry();

// Register per-service configs
registry.register(createConfigProvider('api', apiSchema, sources));
registry.register(createConfigProvider('hermes', hermesSchema, sources));

// Consumers look up by name
const apiConfig = registry.getProvider('api');
const hermesConfig = registry.getProvider('hermes');
```

## Custom Validators

```ts
const schema: ConfigSchema = {
  email: { type: 'string', pattern: '^.+@.+\\..+$' },
  ports: { type: 'array', items: { type: 'number', min: 1, max: 65535 } },
};

const config = createConfigProvider('app', schema, [
  { kind: 'defaults', values: {} },
  { kind: 'runtime', values: { email: 'admin@example.com', ports: [3000, 8080] } },
]);
```

## Environment Variable Mapping

```bash
# .env or system environment
AGENT_OS_HOST=0.0.0.0
AGENT_OS_PORT=8080
AGENT_OS_DEBUG=true
AGENT_OS_DB_HOST=localhost
AGENT_OS_DB_PORT=5432
AGENT_OS_LOG_LEVEL=debug
```

```ts
const config = createConfigProvider('api', schema, [
  { kind: 'defaults', values: {} },
  { kind: 'env' },  // reads process.env with AGENT_OS_ prefix
]);

// config.get('host') → "0.0.0.0"
// config.get('port') → 8080 (coerced to number)
// config.get('debug') → true (coerced to boolean)
// config.get('db') → { host: "localhost", port: 5432 }
```
