/**
 * Tests for PlanningContext.
 */
import { describe, it, expect } from 'vitest';
import { createPlanningContext, getToolsForPlugins, findToolById } from './PlanningContext.js';
import type { ToolDefinition } from '../tools/types.js';

const tools: ToolDefinition[] = [
  {
    id: 'search',
    name: 'Search',
    description: 'Search the web',
    pluginId: 'web',
    parameters: { required: [{ name: 'q', type: 'string', required: true }], optional: [] },
    permissions: [],
  },
  {
    id: 'read',
    name: 'Read',
    description: 'Read a file',
    pluginId: 'fs',
    parameters: { required: [{ name: 'path', type: 'string', required: true }], optional: [] },
    permissions: ['read'],
  },
  {
    id: 'write',
    name: 'Write',
    description: 'Write a file',
    pluginId: 'fs',
    parameters: { required: [{ name: 'path', type: 'string', required: true }], optional: [] },
    permissions: ['write'],
  },
];

describe('createPlanningContext', () => {
  it('creates context with defaults', () => {
    const ctx = createPlanningContext({ goal: 'test' });
    expect(ctx.goal).toBe('test');
    expect(ctx.availableTools).toEqual([]);
    expect(ctx.availablePlugins).toEqual([]);
    expect(ctx.systemContext).toBe('');
    expect(ctx.preferredStrategy).toBe('sequential');
    expect(ctx.maxSteps).toBe(50);
    expect(ctx.constraints).toEqual([]);
    expect(ctx.requestId).toBe('');
  });

  it('creates context with all options', () => {
    const ctx = createPlanningContext({
      goal: 'complex task',
      availableTools: tools,
      availablePlugins: ['web', 'fs'],
      systemContext: 'You are helpful',
      preferredStrategy: 'parallel',
      maxSteps: 10,
      constraints: [{ id: 'c1', description: 'no network', type: 'resource' }],
      requestId: 'req-1',
    });
    expect(ctx.goal).toBe('complex task');
    expect(ctx.availableTools).toHaveLength(3);
    expect(ctx.availablePlugins).toEqual(['web', 'fs']);
    expect(ctx.systemContext).toBe('You are helpful');
    expect(ctx.preferredStrategy).toBe('parallel');
    expect(ctx.maxSteps).toBe(10);
    expect(ctx.constraints).toHaveLength(1);
    expect(ctx.requestId).toBe('req-1');
  });
});

describe('getToolsForPlugins', () => {
  it('returns all tools when plugins is empty', () => {
    expect(getToolsForPlugins(tools, [])).toHaveLength(3);
  });

  it('filters tools by plugin', () => {
    const fsTools = getToolsForPlugins(tools, ['fs']);
    expect(fsTools).toHaveLength(2);
    expect(fsTools.map((t) => t.id)).toEqual(['read', 'write']);
  });

  it('returns empty when no tools match', () => {
    expect(getToolsForPlugins(tools, ['nonexistent'])).toHaveLength(0);
  });
});

describe('findToolById', () => {
  it('finds a tool by id', () => {
    const tool = findToolById(tools, 'search');
    expect(tool?.id).toBe('search');
  });

  it('returns undefined for missing tool', () => {
    expect(findToolById(tools, 'nonexistent')).toBeUndefined();
  });
});
