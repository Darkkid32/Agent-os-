/**
 * Tests for DefaultToolRegistry.
 */
import { describe, it, expect } from 'vitest';
import {
  DefaultToolRegistry,
  getGlobalToolRegistry,
  resetGlobalToolRegistry,
} from './ToolRegistry.js';
import { ToolNotFoundError } from './ToolError.js';
import type { ToolDefinition } from './types.js';

const makeTool = (id: string, overrides?: Partial<ToolDefinition>): ToolDefinition => ({
  id,
  name: `Tool ${id}`,
  description: `Description for ${id}`,
  version: '1.0.0',
  pluginId: 'test-plugin',
  enabled: true,
  parameters: {
    required: [],
    optional: [],
  },
  permissions: [],
  ...overrides,
});

const handler = async () => 'ok';

describe('DefaultToolRegistry', () => {
  it('registers and retrieves a tool', () => {
    const r = new DefaultToolRegistry();
    const def = makeTool('t1');
    r.register(def, handler);

    const entry = r.get('t1');
    expect(entry.definition.id).toBe('t1');
    expect(entry.handler).toBe(handler);
  });

  it('lists all registered tools', () => {
    const r = new DefaultToolRegistry();
    r.register(makeTool('t1'), handler);
    r.register(makeTool('t2'), handler);

    const all = r.list();
    expect(all).toHaveLength(2);
    expect(all.map((e) => e.definition.id)).toEqual(['t1', 't2']);
  });

  it('has() returns true for registered tools', () => {
    const r = new DefaultToolRegistry();
    r.register(makeTool('t1'), handler);

    expect(r.has('t1')).toBe(true);
    expect(r.has('t2')).toBe(false);
  });

  it('throws ToolNotFoundError for missing tools', () => {
    const r = new DefaultToolRegistry();
    expect(() => r.get('missing')).toThrow(ToolNotFoundError);
    expect(() => r.get('missing')).toThrow('Tool "missing" is not registered.');
  });

  it('unregisters a tool', () => {
    const r = new DefaultToolRegistry();
    r.register(makeTool('t1'), handler);
    r.register(makeTool('t2'), handler);

    r.unregister('t1');

    expect(r.has('t1')).toBe(false);
    expect(r.list()).toHaveLength(1);
    expect(r.list()[0]?.definition.id).toBe('t2');
  });

  it('unregister on non-existent tool does not throw', () => {
    const r = new DefaultToolRegistry();
    expect(() => r.unregister('ghost')).not.toThrow();
  });

  it('re-registering replaces the previous entry', () => {
    const r = new DefaultToolRegistry();
    const handler1 = async () => 'first';
    const handler2 = async () => 'second';

    r.register(makeTool('t1'), handler1);
    r.register(makeTool('t1'), handler2);

    expect(r.list()).toHaveLength(1);
    expect(r.get('t1').handler).toBe(handler2);
  });

  it('findByPlugin returns tools for a specific plugin', () => {
    const r = new DefaultToolRegistry();
    r.register(makeTool('t1', { pluginId: 'p1' }), handler);
    r.register(makeTool('t2', { pluginId: 'p1' }), handler);
    r.register(makeTool('t3', { pluginId: 'p2' }), handler);

    const p1Tools = r.findByPlugin('p1');
    expect(p1Tools).toHaveLength(2);
    expect(p1Tools.map((e) => e.definition.id)).toEqual(['t1', 't2']);

    const p2Tools = r.findByPlugin('p2');
    expect(p2Tools).toHaveLength(1);

    const p3Tools = r.findByPlugin('p3');
    expect(p3Tools).toHaveLength(0);
  });

  it('list() returns a copy', () => {
    const r = new DefaultToolRegistry();
    r.register(makeTool('t1'), handler);
    const snapshot = r.list();
    expect(snapshot).toHaveLength(1);
    r.register(makeTool('t2'), handler);
    expect(snapshot).toHaveLength(1);
  });
});

describe('global tool registry', () => {
  it('lazily creates a singleton', () => {
    resetGlobalToolRegistry();
    const a = getGlobalToolRegistry();
    const b = getGlobalToolRegistry();
    expect(a).toBe(b);
    resetGlobalToolRegistry();
    expect(getGlobalToolRegistry()).not.toBe(a);
  });

  it('resetGlobalToolRegistry resets across accessors', () => {
    resetGlobalToolRegistry();
    const first = getGlobalToolRegistry();
    resetGlobalToolRegistry();
    const second = getGlobalToolRegistry();
    expect(first).not.toBe(second);
  });
});
