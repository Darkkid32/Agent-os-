/**
 * @agent-os/agents
 *
 * Agent definition types. Phase 1.1 exports contracts only.
 */

import type { Identifier } from '@agent-os/core';
import type { RuntimeContext } from '@agent-os/runtime';

export const PACKAGE_NAME = '@agent-os/agents' as const;
export const PACKAGE_VERSION = '1.0.0' as const;

export type AgentId = Identifier<'AgentId'>;

export interface AgentSpec {
  readonly id: AgentId;
  readonly name: string;
  readonly version: string;
  readonly capabilities: readonly string[];
}

export type AgentMessage =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'tool_call'; readonly name: string; readonly args: Record<string, unknown> };

export interface AgentPort {
  readonly id: AgentId;
  readonly invoke: (ctx: RuntimeContext, input: AgentMessage) => Promise<AgentMessage>;
}
