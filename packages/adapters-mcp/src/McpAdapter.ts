/**
 * MCP adapter.
 *
 * Composition root for the seven tools in `tools.ts`. Per
 * docs/architecture/platform.md §11, the MCP adapter is a stateless
 * Layer-4 surface. It owns no business logic. It reads Hermes through
 * HermesPort, never directly, and only knows:
 *
 *   - the seven tool definitions,
 *   - the role taxonomy,
 *   - the McpToolResult transport DTO.
 *
 * No caching. No mutable global state. No adapter-to-adapter links.
 *
 * Lifecycle
 *   initialize(config)  build the SDK server, register tools
 *   start()             connect the stdio transport
 *   stop()              close the transport
 *   health()            adapter-only state (NOT hermes.health())
 *   metadata()          adapter identity
 *
 * The MCP SDK (`@modelcontextprotocol/sdk`) is used directly. The
 * adapter does not wrap it. The SDK is the abstraction.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HermesPort } from '@agent-os/hermes';
import { now as coreNow } from '@agent-os/core';
import {
  type Logger,
  createLogger,
  withSpan,
  createMetricRegistry,
  createAdapterMetrics,
  type AdapterMetrics,
} from '@agent-os/observability';

import {
  type McpAdapterHealth,
  type McpInitConfig,
  type McpMetadata,
  type McpToolContext,
  type McpToolDefinition,
  type McpToolResult,
} from './types.js';
import {
  PermissionError as McpPermissionError,
  can as canPerform,
  requireRole,
} from './permissions.js';
import { formatPermissionDenied, formatUnexpectedError } from './formats.js';
import { ALL_TOOLS } from './tools.js';

export const ADAPTER_NAME = '@agent-os/adapters-mcp';
export const ADAPTER_VERSION = '1.0.0';

const isPermissionError = (e: unknown): e is McpPermissionError => e instanceof McpPermissionError;

const toToolResult = (e: unknown): McpToolResult => {
  if (e instanceof Error) return formatUnexpectedError(e.message);
  return formatUnexpectedError('Unknown error.');
};

const toCallToolResult = (result: McpToolResult): CallToolResult => {
  const content = [{ type: 'text' as const, text: result.text }];
  if (result.isError) {
    return { content, isError: true };
  }
  if (result.data !== undefined) {
    return { content, structuredContent: result.data as Record<string, unknown> };
  }
  return { content };
};

export class McpAdapter {
  private readonly hermes: HermesPort;
  private readonly config: McpInitConfig;
  private readonly tools: readonly McpToolDefinition[];
  private readonly logger: Logger;
  private readonly metrics: AdapterMetrics;

  private server: McpServer | undefined;
  private initialized: boolean;
  private started: boolean;
  private lastError: string | undefined;

  public constructor(hermes: HermesPort, config: McpInitConfig) {
    this.hermes = hermes;
    this.config = config;
    this.tools = ALL_TOOLS;
    this.logger = (config.logger ?? createLogger()).child('mcp');
    this.metrics = createAdapterMetrics(config.metricRegistry ?? createMetricRegistry(), 'mcp');
    this.initialized = false;
    this.started = false;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    const server = new McpServer(
      {
        name: this.config.serverInfo.name,
        version: this.config.serverInfo.version,
      },
      { capabilities: { tools: {} } },
    );
    for (const tool of this.tools) {
      server.registerTool(
        tool.name,
        {
          description: tool.description,
          inputSchema: {},
        },
        async (): Promise<CallToolResult> => toCallToolResult(await this.dispatch(tool)),
      );
    }
    this.server = server;
    this.initialized = true;
    this.logger.info('initialized', { toolCount: this.tools.length });
  }

  public async start(): Promise<void> {
    if (!this.server || !this.initialized) {
      throw new Error(`${ADAPTER_NAME}: initialize() must be called before start().`);
    }
    if (this.started) return;
    if (this.config.transport !== 'stdio') {
      throw new Error(`${ADAPTER_NAME}: unsupported transport "${this.config.transport}".`);
    }
    this.logger.info('starting');
    await this.server.connect(new StdioServerTransport());
    this.started = true;
    this.lastError = undefined;
    this.logger.info('started');
  }

  public async stop(): Promise<void> {
    if (!this.server) return;
    if (!this.started) return;
    this.logger.info('stopping');
    await this.server.close();
    this.started = false;
    this.logger.info('stopped');
  }

  public health(): McpAdapterHealth {
    if (!this.initialized) {
      return { status: 'unknown', detail: 'not initialized', at: coreNow() };
    }
    if (this.lastError) {
      return { status: 'failed', detail: this.lastError, at: coreNow() };
    }
    if (!this.started) {
      return { status: 'degraded', detail: 'initialized but not started', at: coreNow() };
    }
    return { status: 'healthy', at: coreNow() };
  }

  public metadata(): McpMetadata {
    return {
      name: ADAPTER_NAME,
      version: ADAPTER_VERSION,
      interfaceType: 'mcp',
      supportedOperations: ['status', 'health', 'start', 'stop', 'modules', 'config', 'version'],
      transport: 'stdio',
      toolCount: this.tools.length,
    };
  }

  private async dispatch(tool: McpToolDefinition): Promise<McpToolResult> {
    return withSpan(`mcp.${tool.name}`, async (span) => {
      span.setAttribute('tool', tool.name);
      this.metrics.requestsTotal.inc();
      this.metrics.activeRequests.set(this.metrics.activeRequests.getValue() + 1);
      const startMs = performance.now();
      const role = this.resolveRole({ toolName: tool.name });
      const tctx: McpToolContext = {
        hermes: this.hermes,
        role,
        toolName: tool.name,
      };

      this.logger.info('tool start', { tool: tool.name });

      try {
        requireRole(role, tool.requires);
      } catch (err) {
        if (isPermissionError(err)) {
          span.setAttribute('success', 'false');
          this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
          this.metrics.errorsTotal.inc();
          this.logger.warn('permission denied', { tool: tool.name });
          return formatPermissionDenied(tool.name);
        }
        span.setAttribute('success', 'false');
        this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
        this.metrics.errorsTotal.inc();
        return toToolResult(err);
      }

      try {
        const result = await tool.handler(tctx);
        span.setAttribute('success', result.isError ? 'false' : 'true');
        this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
        this.metrics.commandsTotal.inc();
        if (result.isError) this.metrics.errorsTotal.inc();
        this.metrics.commandDurationMs.observe(performance.now() - startMs);
        this.logger.info('tool end', { tool: tool.name, success: !result.isError });
        return result;
      } catch (err) {
        this.lastError = err instanceof Error ? err.message : String(err);
        span.setAttribute('success', 'false');
        this.metrics.activeRequests.set(Math.max(0, this.metrics.activeRequests.getValue() - 1));
        this.metrics.errorsTotal.inc();
        this.logger.error('tool failed', { tool: tool.name, error: this.lastError });
        return toToolResult(err);
      }
    });
  }

  private resolveRole(ctx: { toolName: string }): 'admin' | 'viewer' {
    if (this.config.resolveRole) {
      return this.config.resolveRole(ctx);
    }
    // Default policy: tools requiring admin are admin-only; everything
    // else is open. Production deployments must inject an authenticated
    // resolver. Permission checks still apply regardless.
    const tool = this.tools.find((t) => t.name === ctx.toolName);
    if (!tool) return 'viewer';
    return canPerform('admin', tool.requires) ? 'admin' : 'viewer';
  }
}
