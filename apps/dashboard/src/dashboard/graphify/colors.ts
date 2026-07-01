import type { GraphNodeType, GraphEdgeType } from './types';

const NODE_COLORS: Record<GraphNodeType, string> = {
  hermes: '#f59e0b',
  agent: '#3b82f6',
  mission: '#8b5cf6',
  plan: '#06b6d4',
  step: '#14b8a6',
  memory: '#ec4899',
  plugin: '#f97316',
  skill: '#10b981',
  tool: '#6366f1',
  model: '#a855f7',
  configuration: '#64748b',
  file: '#78716c',
  project: '#0ea5e9',
  user: '#e11d48',
  session: '#84cc16',
  goal: '#eab308',
  execution: '#22d3ee',
  log: '#94a3b8',
  entity: '#fb923c',
};

const EDGE_COLORS: Record<GraphEdgeType, string> = {
  owns: '#6b7280',
  executes: '#3b82f6',
  uses: '#8b5cf6',
  loads: '#06b6d4',
  calls: '#f97316',
  contains: '#10b981',
  depends_on: '#ef4444',
  creates: '#22c55e',
  updates: '#eab308',
  references: '#64748b',
  communicates_with: '#ec4899',
  achieves: '#a855f7',
  produces: '#14b8a6',
  consumes: '#f59e0b',
  triggers: '#ef4444',
  extends: '#6366f1',
  related_to: '#94a3b8',
};

export function getNodeColor(type: GraphNodeType): string {
  return NODE_COLORS[type] ?? '#6b7280';
}

export function getEdgeColor(type: GraphEdgeType): string {
  return EDGE_COLORS[type] ?? '#94a3b8';
}

export function getNodeRadius(type: GraphNodeType): number {
  switch (type) {
    case 'hermes':
      return 12;
    case 'agent':
    case 'mission':
      return 10;
    case 'plan':
    case 'plugin':
    case 'model':
      return 8;
    case 'tool':
    case 'skill':
    case 'memory':
      return 7;
    case 'step':
    case 'execution':
    case 'goal':
      return 6;
    default:
      return 5;
  }
}

export const ALL_NODE_TYPES: readonly GraphNodeType[] = [
  'hermes',
  'agent',
  'mission',
  'plan',
  'step',
  'memory',
  'plugin',
  'skill',
  'tool',
  'model',
  'configuration',
  'file',
  'project',
  'user',
  'session',
  'goal',
  'execution',
  'log',
  'entity',
];

export const ALL_EDGE_TYPES: readonly GraphEdgeType[] = [
  'owns',
  'executes',
  'uses',
  'loads',
  'calls',
  'contains',
  'depends_on',
  'creates',
  'updates',
  'references',
  'communicates_with',
  'achieves',
  'produces',
  'consumes',
  'triggers',
  'extends',
  'related_to',
];
