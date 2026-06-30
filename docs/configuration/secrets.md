# Secrets Management

`SecretValue` wraps sensitive configuration values to prevent accidental exposure through logs, metrics, tracing, or API responses.

## Usage

```ts
import { SecretValue } from '@agent-os/config';

const apiKey = SecretValue.of('sk-1234567890abcdef');
```

## Properties

| Method | Returns | Description |
|--------|---------|-------------|
| `unwrap()` | `string` | Raw secret value (use sparingly) |
| `masked()` | `string` | Masked representation safe for logging |
| `toString()` | `string` | Delegates to `masked()` |
| `toJSON()` | `string` | Serializes to masked form |

## Masking Rules

- Values longer than 4 characters: first 2 chars + `********`
- Values 4 characters or shorter: `********`
- Custom hint: `SecretValue.of('value', 'HINT')` → uses hint as masked form

## Safe Patterns

### Logging

```ts
const secret = SecretValue.of('sk-secret123');

logger.info({ apiKey: secret.masked() }, 'config loaded');
// Output: {"apiKey":"sk********","message":"config loaded"}
```

### JSON serialization

```ts
const config = { apiKey: SecretValue.of('sk-secret123') };
JSON.stringify(config);
// → {"apiKey":"sk********"}
```

### Template strings

```ts
const msg = `Using key: ${SecretValue.of('sk-secret123')}`;
// → "Using key: sk********"
```

## What NOT to Do

```ts
// NEVER log the raw value
console.log(apiKey.unwrap());  // ❌ exposes secret

// NEVER include in error responses
res.send({ apiKey: apiKey.unwrap() });  // ❌

// NEVER include in metrics attributes
span.setAttribute('api.key', apiKey.unwrap());  // ❌
```

## Integration with ConfigProvider

Secrets are typically loaded from environment variables and wrapped:

```ts
const provider = createConfigProvider('api', schema, [
  { kind: 'defaults', values: {} },
  { kind: 'env', prefix: 'AGENT_OS_' },
]);

const apiKey = SecretValue.of(provider.getTyped<string>('apiKey'));
```
