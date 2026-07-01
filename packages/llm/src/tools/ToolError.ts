/**
 * Tool-specific error classes.
 *
 * Extends Error with tool-specific error codes.
 * NOT part of the LLMError hierarchy — tool errors are domain-specific.
 *
 * Layer: 2 (Platform)
 */

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export type ToolErrorCode =
  | 'TOOL_NOT_FOUND'
  | 'TOOL_VALIDATION_FAILED'
  | 'TOOL_PERMISSION_DENIED'
  | 'TOOL_TIMEOUT'
  | 'TOOL_PLUGIN_UNAVAILABLE'
  | 'TOOL_EXECUTION_FAILED'
  | 'TOOL_DISABLED';

// ---------------------------------------------------------------------------
// Base tool error
// ---------------------------------------------------------------------------

/**
 * Abstract base for all tool-related errors.
 */
export abstract class ToolError extends Error {
  public readonly code: ToolErrorCode;
  public readonly toolId: string;

  protected constructor(
    code: ToolErrorCode,
    toolId: string,
    message: string,
    options?: { readonly cause?: unknown },
  ) {
    super(message, options);
    this.code = code;
    this.toolId = toolId;
    this.name = 'ToolError';
  }
}

// ---------------------------------------------------------------------------
// Concrete errors
// ---------------------------------------------------------------------------

export class ToolNotFoundError extends ToolError {
  public constructor(toolId: string) {
    super('TOOL_NOT_FOUND', toolId, `Tool "${toolId}" is not registered.`);
    this.name = 'ToolNotFoundError';
  }
}

export class ToolValidationError extends ToolError {
  public readonly validationErrors: readonly string[];

  public constructor(toolId: string, errors: readonly string[]) {
    super(
      'TOOL_VALIDATION_FAILED',
      toolId,
      `Tool "${toolId}" validation failed: ${errors.join(', ')}`,
    );
    this.validationErrors = errors;
    this.name = 'ToolValidationError';
  }
}

export class ToolPermissionError extends ToolError {
  public readonly required: readonly string[];

  public constructor(toolId: string, required: readonly string[]) {
    super(
      'TOOL_PERMISSION_DENIED',
      toolId,
      `Tool "${toolId}" requires permissions: ${required.join(', ')}`,
    );
    this.required = required;
    this.name = 'ToolPermissionError';
  }
}

export class ToolTimeoutError extends ToolError {
  public constructor(toolId: string, timeoutMs: number) {
    super('TOOL_TIMEOUT', toolId, `Tool "${toolId}" timed out after ${timeoutMs}ms`);
    this.name = 'ToolTimeoutError';
  }
}

export class ToolPluginUnavailableError extends ToolError {
  public constructor(toolId: string, pluginId: string) {
    super(
      'TOOL_PLUGIN_UNAVAILABLE',
      toolId,
      `Plugin "${pluginId}" for tool "${toolId}" is not available.`,
    );
    this.name = 'ToolPluginUnavailableError';
  }
}

export class ToolExecutionError extends ToolError {
  public constructor(toolId: string, message: string, options?: { readonly cause?: unknown }) {
    super('TOOL_EXECUTION_FAILED', toolId, message, options);
    this.name = 'ToolExecutionError';
  }
}

export class ToolDisabledError extends ToolError {
  public constructor(toolId: string) {
    super('TOOL_DISABLED', toolId, `Tool "${toolId}" is disabled.`);
    this.name = 'ToolDisabledError';
  }
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

/**
 * Check if an error is a ToolError.
 */
export const isToolError = (e: unknown): e is ToolError => e instanceof ToolError;
