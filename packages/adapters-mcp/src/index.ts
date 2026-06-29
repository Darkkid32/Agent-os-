/**
 * Public exports for @agent-os/adapters-mcp (Phase 3.7).
 *
 * The MCP adapter is a stateless Layer-4 surface. Consumers (apps/api,
 * apps/cli) own transport wiring, identity resolution, and lifecycle.
 */
export { McpAdapter, ADAPTER_NAME, ADAPTER_VERSION } from './McpAdapter.js';
export type {
  McpAdapterHealth,
  McpInitConfig,
  McpMetadata,
  McpRequestContext,
  McpToolContext,
  McpToolDefinition,
  McpToolResult,
} from './types.js';
export { PermissionError, can, requireRole } from './permissions.js';
export type { McpAction, McpRole } from './permissions.js';
