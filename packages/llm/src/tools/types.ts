/**
 * Tool calling framework types.
 *
 * Hermes owns the tool-calling lifecycle. The LLM never executes code
 * directly — it only requests tool calls. Hermes validates, executes,
 * and maps results back to the LLM.
 *
 * Layer: 2 (Platform)
 * Dependencies: @agent-os/core (Result), @agent-os/llm (types)
 */

// ---------------------------------------------------------------------------
// Tool parameter schema
// ---------------------------------------------------------------------------

/**
 * JSON Schema definition for a single tool parameter.
 */
export interface ToolParameterSchema {
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  readonly description?: string;
  readonly required?: boolean;
  readonly default?: unknown;
  readonly enum?: readonly unknown[];
  readonly items?: Readonly<Record<string, unknown>>;
  readonly properties?: Readonly<Record<string, ToolParameterSchema>>;
}

/**
 * Complete parameter schema for a tool.
 */
export interface ToolParameterSet {
  readonly required?: readonly ToolParameter[];
  readonly optional?: readonly ToolParameter[];
}

export interface ToolParameter {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  readonly description?: string;
  readonly required?: boolean;
  readonly default?: unknown;
  readonly enum?: readonly unknown[];
  readonly items?: Readonly<Record<string, unknown>>;
  readonly properties?: Readonly<Record<string, ToolParameterSchema>>;
}

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

/**
 * Permission level required to execute a tool.
 */
export type ToolPermission = 'read' | 'write' | 'admin' | 'network';

/**
 * Complete definition of a tool that can be called by the LLM.
 */
export interface ToolDefinition {
  /** Unique tool identifier (e.g., "github.searchIssues") */
  readonly id: string;

  /** Human-readable name for display */
  readonly name: string;

  /** Description of what the tool does (sent to LLM) */
  readonly description: string;

  /** Plugin that owns this tool */
  readonly pluginId: string;

  /** Parameter schema */
  readonly parameters: ToolParameterSet;

  /** Return type description */
  readonly returnType?: string;

  /** Permissions required to execute */
  readonly permissions: readonly ToolPermission[];

  /** Maximum execution time in ms (default: 30000) */
  readonly timeoutMs?: number;

  /** Whether this tool is enabled */
  readonly enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Tool call and result
// ---------------------------------------------------------------------------

/**
 * A request to execute a tool, as received from the LLM.
 */
export interface ToolCall {
  /** Unique call ID from the LLM */
  readonly id: string;

  /** Tool identifier to execute */
  readonly toolId: string;

  /** Parsed arguments from the LLM */
  readonly arguments: Readonly<Record<string, unknown>>;
}

/**
 * Result of a tool execution.
 */
export interface ToolResult {
  /** Call ID this result corresponds to */
  readonly callId: string;

  /** Tool identifier that was executed */
  readonly toolId: string;

  /** Whether execution succeeded */
  readonly success: boolean;

  /** Result data (on success) */
  readonly data?: unknown;

  /** Error message (on failure) */
  readonly error?: string;

  /** Error code (on failure) */
  readonly errorCode?: string;

  /** Execution duration in ms */
  readonly durationMs: number;

  /** Whether the execution timed out */
  readonly timedOut?: boolean;
}

// ---------------------------------------------------------------------------
// Provider translation
// ---------------------------------------------------------------------------

/**
 * Provider-specific tool format (e.g., OpenAI, Anthropic, Gemini).
 */
export interface ProviderToolDefinition {
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Readonly<Record<string, unknown>>;
  };
}

/**
 * Translation function from Hermes tool definition to provider format.
 */
export type ToolTranslator = (definition: ToolDefinition) => ProviderToolDefinition;

// ---------------------------------------------------------------------------
// Tool executor context
// ---------------------------------------------------------------------------

/**
 * Context passed to a tool execution handler.
 */
export interface ToolExecutionContext {
  /** Tool call being executed */
  readonly call: ToolCall;

  /** Tool definition */
  readonly definition: ToolDefinition;

  /** User ID (if available) */
  readonly userId?: string;

  /** Request ID for tracing */
  readonly requestId?: string;

  /** Abort signal for cancellation */
  readonly signal?: AbortSignal;
}

/**
 * Function that handles tool execution.
 */
export type ToolExecutionHandler = (context: ToolExecutionContext) => Promise<unknown>;

// ---------------------------------------------------------------------------
// Tool registry entry
// ---------------------------------------------------------------------------

/**
 * Internal registry entry wrapping a tool definition with its handler.
 */
export interface ToolRegistryEntry {
  readonly definition: ToolDefinition;
  readonly handler: ToolExecutionHandler;
}

// ---------------------------------------------------------------------------
// Tool events (dashboard)
// ---------------------------------------------------------------------------

export interface ToolEventBase {
  readonly toolId: string;
  readonly pluginId: string;
  readonly callId: string;
  readonly timestamp: string;
  readonly requestId?: string;
}

export interface ToolRequestedEvent extends ToolEventBase {
  readonly type: 'ToolRequested';
  readonly arguments: Readonly<Record<string, unknown>>;
}

export interface ToolStartedEvent extends ToolEventBase {
  readonly type: 'ToolStarted';
}

export interface ToolCompletedEvent extends ToolEventBase {
  readonly type: 'ToolCompleted';
  readonly durationMs: number;
  readonly success: boolean;
}

export interface ToolFailedEvent extends ToolEventBase {
  readonly type: 'ToolFailed';
  readonly durationMs: number;
  readonly error: string;
  readonly errorCode?: string;
}

export type ToolEvent =
  ToolRequestedEvent | ToolStartedEvent | ToolCompletedEvent | ToolFailedEvent;

/**
 * Function that receives tool events.
 */
export type ToolEventHandler = (event: ToolEvent) => void;
