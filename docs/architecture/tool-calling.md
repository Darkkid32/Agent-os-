# Tool Calling Framework — Architecture

**Layer:** 2 (Platform) · **Package:** `@agent-os/llm` · **Status:** Phase 9.2

## Overview

The tool calling framework enables Hermes to expose plugin capabilities as callable tools to any LLM provider. Hermes orchestrates tool execution — the LLM never invokes plugins directly.

## Architecture

```
LLM Provider (OpenAI/Gemini/Anthropic)
        │
        ▼
  Tool Calling Response
        │
        ▼
┌─────────────────────────────────────────────┐
│           DefaultToolExecutor               │
│                                             │
│  1. Validate (ToolValidation)               │
│  2. Permission check (PermissionChecker)    │
│  3. Observability (instrument)              │
│  4. Timeout management                      │
│  5. Event emission (ToolEventHandler)       │
│  6. Execute handler                         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│          DefaultToolRegistry                │
│                                             │
│  Map<toolId, {definition, handler}>         │
│  + findByPlugin, list, has, get, etc.       │
└─────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│      ToolTranslator (Provider-specific)     │
│                                             │
│  toOpenAITool  │  toAnthropicTool           │
│  toGeminiTool  │  translateTools (batch)    │
└─────────────────────────────────────────────┘
```

## Components

### ToolDefinition (`types.ts`)

Every tool is described by a `ToolDefinition`:

```typescript
interface ToolDefinition {
  id: string;              // unique identifier
  name: string;            // human-readable name
  description: string;     // for LLM context
  version: string;         // semver
  pluginId: string;        // owning plugin
  enabled: boolean;        // can be toggled
  timeoutMs?: number;      // per-tool timeout override
  parameters: ToolParameterSet;
  permissions: ToolPermission[];
}
```

Parameters use a typed schema (`string | number | boolean | array | object`) with required/optional separation.

### ToolRegistry

The `DefaultToolRegistry` is a `Map<string, ToolRegistryEntry>` where each entry holds `{definition, handler}`. Methods:

- `register(definition, handler)` — add or replace
- `unregister(toolId)` — remove
- `get(toolId)` — retrieve or throw `ToolNotFoundError`
- `has(toolId)` — existence check
- `list()` — all entries (copy)
- `findByPlugin(pluginId)` — filter by plugin

A global singleton (`getGlobalToolRegistry / resetGlobalToolRegistry`) follows the LLMRegistry pattern.

### ToolValidation

Chain validation before execution:

1. **Tool exists** in registry
2. **Enabled** (not `enabled: false`)
3. **Plugin available** (in the caller's available set)
4. **Required parameters** present
5. **Parameter types** match schema
6. **No unknown** parameters

Returns `ValidationResult { valid, errors[] }`. Individual validators can be used standalone.

### ToolExecutor

`DefaultToolExecutor` orchestrates execution:

1. Look up tool in registry
2. Run `validateToolCall`
3. Check permissions via `PermissionChecker`
4. Wrap execution in `instrument()` observability span
5. Apply timeout (per-tool `timeoutMs` or default)
6. Emit events: `ToolRequested → ToolStarted → ToolCompleted|ToolFailed`
7. Map to `ToolResult { callId, toolId, success, data|error, durationMs }`

### ToolTranslator

Pure functions converting `ToolDefinition` to provider formats:

- `toOpenAITool` → OpenAI function calling
- `toAnthropicTool` → Anthropic tool use
- `toGeminiTool` → Gemini function calling
- `translateTools(defs, provider)` → batch translation

### ToolErrors

Eight error classes extending `ToolError` (which extends `Error`):

| Class | Code | When |
|---|---|---|
| `ToolNotFoundError` | `TOOL_NOT_FOUND` | Tool not in registry |
| `ToolValidationError` | `TOOL_VALIDATION_FAILED` | Params/schema issues |
| `ToolPermissionError` | `TOOL_PERMISSION_DENIED` | Missing permissions |
| `ToolTimeoutError` | `TOOL_TIMEOUT` | Execution exceeded timeout |
| `ToolPluginUnavailableError` | `TOOL_PLUGIN_UNAVAILABLE` | Plugin not available |
| `ToolExecutionError` | `TOOL_EXECUTION_FAILED` | Handler threw |
| `ToolDisabledError` | `TOOL_DISABLED` | Tool disabled |

### Observability

Every tool call emits:
- Structured logs via `@agent-os/observability`
- OpenTelemetry span: `llm.<pluginId>.tool`
- Duration measurement
- Dashboard events: `ToolRequested`, `ToolStarted`, `ToolCompleted`, `ToolFailed`

## Dashboard Events

```typescript
type ToolEvent =
  | ToolRequestedEvent   // call received
  | ToolStartedEvent     // execution began
  | ToolCompletedEvent   // success
  | ToolFailedEvent;     // failure (validation/permission/timeout/execution)
```

Each event includes `toolId`, `pluginId`, `callId`, `timestamp`, and optional `requestId`.

## Usage Pattern

```typescript
import { DefaultToolRegistry, DefaultToolExecutor, translateTools } from '@agent-os/llm';

// 1. Register tools
const registry = new DefaultToolRegistry();
registry.register(searchToolDef, async (ctx) => {
  return await webSearch(ctx.call.arguments.query);
});

// 2. Create executor
const executor = new DefaultToolExecutor(registry);
executor.onEvent((e) => dashboard.emit(e));

// 3. Translate for LLM
const llmTools = translateTools([searchToolDef], 'openai');

// 4. Send to LLM, get tool calls back
const response = await provider.chat({ model: 'gpt-4o', messages, tools: llmTools });

// 5. Execute tool calls
for (const call of response.toolCalls) {
  const result = await executor.execute(call, {
    availablePlugins: new Set(['web']),
    requestId: response.requestId,
  });
  // Send result back to LLM...
}
```

## What's NOT in Scope (Phase 9.2)

- Execution loop (Phase 9.3)
- Planning / reasoning (Phase 9.4)
- Memory retrieval (Phase 9.5)
- Dashboard visualization (Phase 9.6)

## Files

| File | Purpose |
|---|---|
| `src/tools/types.ts` | All type definitions |
| `src/tools/ToolError.ts` | Error hierarchy |
| `src/tools/ToolRegistry.ts` | Registry + global singleton |
| `src/tools/ToolValidation.ts` | Validation chain |
| `src/tools/ToolTranslator.ts` | Provider translation |
| `src/tools/ToolExecutor.ts` | Execution engine |
| `src/tools/index.ts` | Barrel export |
