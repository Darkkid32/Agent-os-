# Configuration System

Agent OS uses a centralized configuration system provided by `@agent-os/config` (Layer 2).

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 ConfigRegistry                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  api     │ │  hermes  │ │  plugins │  ...   │
│  │ provider │ │ provider │ │ provider │        │
│  └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────┘
         ▲                ▲               ▲
         │                │               │
    ┌────┴────┐     ┌─────┴─────┐   ┌─────┴─────┐
    │ Config  │     │  Config   │   │  Config   │
    │Provider │     │ Provider  │   │ Provider  │
    └────┬────┘     └─────┬─────┘   └─────┬─────┘
         │                │               │
    ┌────┴────────────────┴───────────────┴────┐
    │              ConfigLoader                 │
    │  (merges sources with priority)           │
    └────┬────────────────┬───────────────┬────┘
         │                │               │
    ┌────┴────┐     ┌─────┴─────┐   ┌─────┴─────┐
    │Defaults │     │File/JSON  │   │Env/Runtime│
    └─────────┘     └───────────┘   └───────────┘
```

## Configuration Precedence

Sources are merged in order from lowest to highest priority:

1. **Defaults** — Schema-defined fallback values
2. **Config files** — JSON/YAML files loaded from disk
3. **Environment variables** — `AGENT_OS_` prefixed env vars (apps only)
4. **Runtime overrides** — Programmatic values set at startup

Higher priority sources override lower ones. Deep objects are merged, not replaced.

## Environment Variables

Applications (not libraries) may read `process.env`. Environment variables are mapped to config paths using `UPPER_SNAKE_CASE` with a configurable prefix (default: `AGENT_OS_`).

```
AGENT_OS_HOST=0.0.0.0       → config.host = "0.0.0.0"
AGENT_OS_PORT=8080           → config.port = 8080
AGENT_OS_DB_HOST=localhost   → config.db.host = "localhost"
AGENT_OS_DEBUG=true          → config.debug = true
```

Type coercion is automatic: `"true"/"false"` → boolean, numeric strings → number.

## Libraries Must Not Access process.env

Libraries receive configuration through constructor injection via `ConfigProvider`. Never use `process.env` directly in packages.

## Validation

Startup fails with descriptive errors when required configuration is invalid. The `ConfigValidator` checks:

- Required fields
- Type correctness
- Min/max constraints
- Pattern matching
- Enum membership
- Unknown properties
