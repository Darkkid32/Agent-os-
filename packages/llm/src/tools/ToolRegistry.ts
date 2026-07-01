/**
 * Central registry for tool definitions and handlers.
 *
 * Supports:
 * - register / unregister / get / list
 * - findByPlugin (tools owned by a specific plugin)
 * - validate (check parameters against schema)
 *
 * Layer: 2 (Platform)
 */

import type { ToolDefinition, ToolExecutionHandler, ToolRegistryEntry } from './types.js';
import { ToolNotFoundError } from './ToolError.js';

// ---------------------------------------------------------------------------
// Registry interface
// ---------------------------------------------------------------------------

export interface ToolRegistry {
  register(definition: ToolDefinition, handler: ToolExecutionHandler): void;
  unregister(toolId: string): void;
  get(toolId: string): ToolRegistryEntry;
  list(): readonly ToolRegistryEntry[];
  findByPlugin(pluginId: string): readonly ToolRegistryEntry[];
  has(toolId: string): boolean;
}

// ---------------------------------------------------------------------------
// Default implementation
// ---------------------------------------------------------------------------

export class DefaultToolRegistry implements ToolRegistry {
  private readonly store = new Map<string, ToolRegistryEntry>();

  public register(definition: ToolDefinition, handler: ToolExecutionHandler): void {
    this.store.set(definition.id, { definition, handler });
  }

  public unregister(toolId: string): void {
    this.store.delete(toolId);
  }

  public get(toolId: string): ToolRegistryEntry {
    const entry = this.store.get(toolId);
    if (!entry) {
      throw new ToolNotFoundError(toolId);
    }
    return entry;
  }

  public list(): readonly ToolRegistryEntry[] {
    return Array.from(this.store.values());
  }

  public findByPlugin(pluginId: string): readonly ToolRegistryEntry[] {
    return this.list().filter((e) => e.definition.pluginId === pluginId);
  }

  public has(toolId: string): boolean {
    return this.store.has(toolId);
  }
}

// ---------------------------------------------------------------------------
// Global singleton
// ---------------------------------------------------------------------------

let globalInstance: DefaultToolRegistry | undefined;

export const getGlobalToolRegistry = (): DefaultToolRegistry => {
  if (!globalInstance) {
    globalInstance = new DefaultToolRegistry();
  }
  return globalInstance;
};

export const resetGlobalToolRegistry = (): void => {
  globalInstance = undefined;
};
