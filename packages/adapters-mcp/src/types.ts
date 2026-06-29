/**
 * MCP adapter types.
 *
 * Per docs/architecture/platform.md §11, MCP is one of the Layer-4
 * surface adapters. The adapter is a stateless server that exposes the
 * seven kernel operations as MCP tools. No business logic lives here;
 * the adapter only knows how to map tool calls onto HermesPort.
 *
 * Expected Hermes failures propagate through the MCP tool result as
 * `isError: true`. Only programming errors and SDK failures are caught
 * by the dispatcher and translated into a generic isError response.
 */
import type {
  AdapterHealth,
  AdapterHealthStatus,
  AdapterMetadata,
} from '@agent-os/core/adapter-metadata';
import type { HermesPort } from '@agent-os/hermes';
import type { Logger } from '@agent-os/observability';
import type { McpAction, McpRole } from './permissions.js';

export interface McpInitConfig {
  readonly transport: 'stdio';
  readonly serverInfo: {
    readonly name: string;
    readonly version: string;
  };
  /**
   * Identity resolver. Given an MCP request context, returns the role
   * of the caller. Defaults to 'admin' if not supplied — production
   * deployments are expected to wire an authenticated resolver.
   */
  readonly resolveRole?: (ctx: McpRequestContext) => McpRole;
  /** Optional structured logger. */
  readonly logger?: Logger;
}

export interface McpRequestContext {
  readonly toolName: string;
}

export interface McpToolContext {
  readonly hermes: HermesPort;
  readonly role: McpRole;
  readonly toolName: string;
}

export interface McpToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly requires: McpAction;
  readonly handler: (ctx: McpToolContext) => Promise<McpToolResult>;
}

export interface McpToolResult {
  readonly text: string;
  readonly isError: boolean;
  readonly data?: unknown;
}

export type McpAdapterHealthStatus = AdapterHealthStatus;

export type McpAdapterHealth = AdapterHealth;

export type McpMetadata = AdapterMetadata & {
  readonly transport: 'stdio';
  readonly toolCount: number;
};
