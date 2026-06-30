# Configuration Schema

`ConfigSchema` defines the shape of valid configuration. Each key maps to a `FieldSchema` specifying type, constraints, and defaults.

## Field Types

### string

```ts
{
  type: 'string',
  required: true,
  minLength: 1,
  maxLength: 255,
  pattern: '^[a-z]+$',
  default: 'hello',
  description: 'A lowercase identifier',
}
```

### number

```ts
{
  type: 'number',
  required: true,
  min: 1,
  max: 65535,
  integer: true,
  default: 3000,
}
```

### boolean

```ts
{
  type: 'boolean',
  default: false,
}
```

### array

```ts
{
  type: 'array',
  items: { type: 'string' },
  minItems: 1,
  maxItems: 10,
  default: ['*'],
}
```

### object

```ts
{
  type: 'object',
  properties: {
    host: { type: 'string', default: 'localhost' },
    port: { type: 'number', default: 5432 },
  },
  additionalProperties: false,
}
```

### enum

```ts
{
  type: 'enum',
  values: ['debug', 'info', 'warn', 'error'],
  default: 'info',
}
```

## Validation Rules

| Rule | Applicable types | Description |
|------|-----------------|-------------|
| `required` | all | Field must be present |
| `default` | all | Fallback value when missing |
| `minLength` / `maxLength` | string | String length bounds |
| `pattern` | string | Regex pattern match |
| `min` / `max` | number | Numeric range |
| `integer` | number | Must be integer |
| `minItems` / `maxItems` | array | Array length bounds |
| `items` | array | Schema for array elements |
| `properties` | object | Schema for nested fields |
| `additionalProperties` | object | Allow/disallow extra keys |
| `values` | enum | Allowed values |

## Error Codes

| Code | Meaning |
|------|---------|
| `REQUIRED` | Missing required field |
| `TYPE` | Wrong type |
| `MIN_LENGTH` / `MAX_LENGTH` | String length out of bounds |
| `PATTERN` | String doesn't match regex |
| `MIN` / `MAX` | Number out of range |
| `INTEGER` | Expected integer |
| `MIN_ITEMS` / `MAX_ITEMS` | Array length out of bounds |
| `ENUM` | Invalid enum value |
| `UNKNOWN` | Unknown property |
| `ADDITIONAL_PROPERTIES` | Extra property not allowed |
