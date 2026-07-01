/**
 * Tests for PlanningPrompt.
 */
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt, buildReplanPrompt } from './PlanningPrompt.js';
import type { ToolDefinition } from '../tools/types.js';

const tools: ToolDefinition[] = [
  {
    id: 'search',
    name: 'Search',
    description: 'Search the web',
    pluginId: 'web',
    parameters: {
      required: [{ name: 'query', type: 'string', required: true, description: 'Search query' }],
      optional: [{ name: 'limit', type: 'number', required: false }],
    },
    permissions: [],
  },
];

describe('buildSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildSystemPrompt();
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('instructs planner not to execute tools', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('NEVER execute tools');
  });

  it('instructs planner to output JSON', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('JSON');
  });
});

describe('buildUserPrompt', () => {
  it('includes the goal', () => {
    const prompt = buildUserPrompt({ goal: 'find cats', availableTools: tools });
    expect(prompt).toContain('find cats');
  });

  it('includes tool definitions', () => {
    const prompt = buildUserPrompt({ goal: 'test', availableTools: tools });
    expect(prompt).toContain('search');
    expect(prompt).toContain('Search the web');
  });

  it('includes system context when provided', () => {
    const prompt = buildUserPrompt({
      goal: 'test',
      availableTools: tools,
      systemContext: 'You are helpful',
    });
    expect(prompt).toContain('You are helpful');
  });

  it('includes preferred strategy when provided', () => {
    const prompt = buildUserPrompt({
      goal: 'test',
      availableTools: tools,
      preferredStrategy: 'parallel',
    });
    expect(prompt).toContain('parallel');
  });

  it('includes max steps when provided', () => {
    const prompt = buildUserPrompt({
      goal: 'test',
      availableTools: tools,
      maxSteps: 5,
    });
    expect(prompt).toContain('5');
  });

  it('includes constraints when provided', () => {
    const prompt = buildUserPrompt({
      goal: 'test',
      availableTools: tools,
      constraints: [{ id: 'c1', description: 'No network', type: 'resource' }],
    });
    expect(prompt).toContain('No network');
  });

  it('includes available plugins when provided', () => {
    const prompt = buildUserPrompt({
      goal: 'test',
      availableTools: tools,
      availablePlugins: ['web', 'fs'],
    });
    expect(prompt).toContain('web');
    expect(prompt).toContain('fs');
  });

  it('handles no tools gracefully', () => {
    const prompt = buildUserPrompt({ goal: 'test', availableTools: [] });
    expect(prompt).toContain('No tools available');
  });
});

describe('buildReplanPrompt', () => {
  it('includes failure details', () => {
    const prompt = buildReplanPrompt({
      originalGoal: 'search web',
      failedStep: 'step-2',
      error: 'timeout',
      completedSteps: ['step-1'],
      remainingSteps: ['step-3'],
      availableTools: tools,
    });
    expect(prompt).toContain('Re-planning');
    expect(prompt).toContain('step-2');
    expect(prompt).toContain('timeout');
    expect(prompt).toContain('step-1');
    expect(prompt).toContain('step-3');
  });
});
