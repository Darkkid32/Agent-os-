/**
 * Tool execution engine.
 *
 * Responsibilities:
 * - Lookup tool in registry
 * - Validate parameters
 * - Check permissions
 * - Execute with timeout
 * - Emit observability events
 * - Map results
 *
 * Hermes executes tools — the LLM never invokes plugins directly.
 *
 * Layer: 2 (Platform)
 */

import type {
  ToolCall,
  ToolResult,
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionHandler,
  ToolEvent,
  ToolEventHandler,
} from './types.js';
import type { ToolRegistry } from './ToolRegistry.js';
import { validateToolCall } from './ToolValidation.js';
import { ToolValidationError, ToolPermissionError, ToolTimeoutError } from './ToolError.js';
import { instrument } from '../observability.js';

// ---------------------------------------------------------------------------
// Permission checker
// ---------------------------------------------------------------------------

export interface PermissionChecker {
  hasPermission(userId: string | undefined, permission: string): boolean;
}

/**
 * Default permissive checker (always allows).
 */
export const allowAllPermissions: PermissionChecker = {
  hasPermission: () => true,
};

// ---------------------------------------------------------------------------
// Tool executor interface
// ---------------------------------------------------------------------------

export interface ToolExecutor {
  execute(
    call: ToolCall,
    options?: {
      userId?: string;
      requestId?: string;
      availablePlugins?: ReadonlySet<string>;
      signal?: AbortSignal;
    },
  ): Promise<ToolResult>;
}

// ---------------------------------------------------------------------------
// Default implementation
// ---------------------------------------------------------------------------

export class DefaultToolExecutor implements ToolExecutor {
  private readonly eventHandlers: ToolEventHandler[] = [];

  public constructor(
    private readonly registry: ToolRegistry,
    private readonly permissionChecker: PermissionChecker = allowAllPermissions,
    private readonly defaultTimeoutMs: number = 30000,
  ) {}

  /**
   * Register an event handler for dashboard events.
   */
  public onEvent(handler: ToolEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Execute a tool call.
   */
  public async execute(
    call: ToolCall,
    options?: {
      userId?: string;
      requestId?: string;
      availablePlugins?: ReadonlySet<string>;
      signal?: AbortSignal;
    },
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const availablePlugins = options?.availablePlugins ?? new Set<string>();

    // Emit ToolRequested event
    this.emitEvent({
      type: 'ToolRequested',
      toolId: call.toolId,
      pluginId: this.getPluginId(call.toolId),
      callId: call.id,
      timestamp: new Date().toISOString(),
      arguments: call.arguments,
      ...(options?.requestId !== undefined ? { requestId: options.requestId } : {}),
    });

    // Validate
    const validation = validateToolCall(this.registry, call, availablePlugins);
    if (!validation.valid) {
      const error = new ToolValidationError(call.toolId, validation.errors);
      const durationMs = Date.now() - startTime;
      this.emitEvent({
        type: 'ToolFailed',
        toolId: call.toolId,
        pluginId: this.getPluginId(call.toolId),
        callId: call.id,
        timestamp: new Date().toISOString(),
        durationMs,
        error: error.message,
        errorCode: error.code,
        ...(options?.requestId !== undefined ? { requestId: options.requestId } : {}),
      });
      return {
        callId: call.id,
        toolId: call.toolId,
        success: false,
        error: error.message,
        errorCode: error.code,
        durationMs,
      };
    }

    const { definition, handler } = this.registry.get(call.toolId);

    // Check permissions
    const permResult = this.checkPermissions(definition, options?.userId);
    if (!permResult.valid) {
      const error = new ToolPermissionError(call.toolId, permResult.required);
      const durationMs = Date.now() - startTime;
      this.emitEvent({
        type: 'ToolFailed',
        toolId: call.toolId,
        pluginId: definition.pluginId,
        callId: call.id,
        timestamp: new Date().toISOString(),
        durationMs,
        error: error.message,
        errorCode: error.code,
        ...(options?.requestId !== undefined ? { requestId: options.requestId } : {}),
      });
      return {
        callId: call.id,
        toolId: call.toolId,
        success: false,
        error: error.message,
        errorCode: error.code,
        durationMs,
      };
    }

    // Emit ToolStarted event
    this.emitEvent({
      type: 'ToolStarted',
      toolId: call.toolId,
      pluginId: definition.pluginId,
      callId: call.id,
      timestamp: new Date().toISOString(),
      ...(options?.requestId !== undefined ? { requestId: options.requestId } : {}),
    });

    // Execute with timeout and observability
    const timeoutMs = definition.timeoutMs ?? this.defaultTimeoutMs;
    try {
      const result = await instrument(
        {
          providerId: definition.pluginId,
          operation: 'tool',
          model: call.toolId,
        },
        async () => {
          return this.executeWithTimeout(definition, handler, call, timeoutMs, options?.signal);
        },
      );

      const durationMs = Date.now() - startTime;
      this.emitEvent({
        type: 'ToolCompleted',
        toolId: call.toolId,
        pluginId: definition.pluginId,
        callId: call.id,
        timestamp: new Date().toISOString(),
        durationMs,
        success: true,
        ...(options?.requestId !== undefined ? { requestId: options.requestId } : {}),
      });

      return {
        callId: call.id,
        toolId: call.toolId,
        success: true,
        data: result,
        durationMs,
      };
    } catch (e) {
      const durationMs = Date.now() - startTime;
      const error = e instanceof Error ? e : new Error(String(e));
      const errorCode = e instanceof ToolTimeoutError ? 'TOOL_TIMEOUT' : 'TOOL_EXECUTION_FAILED';

      this.emitEvent({
        type: 'ToolFailed',
        toolId: call.toolId,
        pluginId: definition.pluginId,
        callId: call.id,
        timestamp: new Date().toISOString(),
        durationMs,
        error: error.message,
        errorCode,
        ...(options?.requestId !== undefined ? { requestId: options.requestId } : {}),
      });

      return {
        callId: call.id,
        toolId: call.toolId,
        success: false,
        error: error.message,
        errorCode,
        durationMs,
        timedOut: errorCode === 'TOOL_TIMEOUT',
      };
    }
  }

  private async executeWithTimeout(
    definition: ToolDefinition,
    handler: ToolExecutionHandler,
    call: ToolCall,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new ToolTimeoutError(call.toolId, timeoutMs));
      }, timeoutMs);

      const context: ToolExecutionContext = {
        call,
        definition,
        ...(signal !== undefined ? { signal } : {}),
      };

      handler(context)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private checkPermissions(
    definition: ToolDefinition,
    userId: string | undefined,
  ): { valid: boolean; required: string[] } {
    const required = definition.permissions;
    if (required.length === 0) {
      return { valid: true, required: [] };
    }

    const missing = required.filter((perm) => !this.permissionChecker.hasPermission(userId, perm));

    if (missing.length > 0) {
      return { valid: false, required: missing };
    }

    return { valid: true, required: [] };
  }

  private getPluginId(toolId: string): string {
    try {
      return this.registry.get(toolId).definition.pluginId;
    } catch {
      return 'unknown';
    }
  }

  private emitEvent(event: ToolEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }
}
