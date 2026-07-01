/**
 * Tool calling framework barrel export.
 *
 * Layer: 2 (Platform)
 */

export type {
  ToolParameterSchema,
  ToolParameterSet,
  ToolParameter,
  ToolPermission,
  ToolDefinition,
  ToolCall,
  ToolResult,
  ProviderToolDefinition,
  ToolTranslator,
  ToolExecutionContext,
  ToolExecutionHandler,
  ToolRegistryEntry,
  ToolEventBase,
  ToolRequestedEvent,
  ToolStartedEvent,
  ToolCompletedEvent,
  ToolFailedEvent,
  ToolEvent,
  ToolEventHandler,
} from './types.js';

export {
  type ToolErrorCode,
  ToolError,
  ToolNotFoundError,
  ToolValidationError,
  ToolPermissionError,
  ToolTimeoutError,
  ToolPluginUnavailableError,
  ToolExecutionError,
  ToolDisabledError,
  isToolError,
} from './ToolError.js';

export type { ToolRegistry } from './ToolRegistry.js';
export {
  DefaultToolRegistry,
  getGlobalToolRegistry,
  resetGlobalToolRegistry,
} from './ToolRegistry.js';

export type { ValidationResult } from './ToolValidation.js';
export {
  validateRequired,
  validateTypes,
  validateUnknown,
  validatePluginAvailable,
  validateEnabled,
  validateToolCall,
} from './ToolValidation.js';

export type { ProviderType } from './ToolTranslator.js';
export { toOpenAITool, toAnthropicTool, toGeminiTool, translateTools } from './ToolTranslator.js';

export type { PermissionChecker } from './ToolExecutor.js';
export { DefaultToolExecutor, allowAllPermissions } from './ToolExecutor.js';
