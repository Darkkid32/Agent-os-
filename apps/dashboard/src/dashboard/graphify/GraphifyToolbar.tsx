'use client';

import { useState } from 'react';
import type { GraphLayoutType, GraphNodeType, GraphEdgeType } from './types';
import { ALL_NODE_TYPES, ALL_EDGE_TYPES } from './colors';

interface GraphifyToolbarProps {
  readonly layout: GraphLayoutType;
  readonly onLayoutChange: (layout: GraphLayoutType) => void;
  readonly searchQuery: string;
  readonly onSearchChange: (query: string) => void;
  readonly activeNodeTypes: ReadonlySet<GraphNodeType>;
  readonly onNodeTypesChange: (types: ReadonlySet<GraphNodeType>) => void;
  readonly activeEdgeTypes: ReadonlySet<GraphEdgeType>;
  readonly onEdgeTypesChange: (types: ReadonlySet<GraphEdgeType>) => void;
  readonly onZoomToFit: () => void;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly onHistoryBack: () => void;
  readonly onHistoryForward: () => void;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
}

const LAYOUTS: { value: GraphLayoutType; label: string }[] = [
  { value: 'force', label: 'Force' },
  { value: 'hierarchical', label: 'Hierarchy' },
  { value: 'radial', label: 'Radial' },
  { value: 'tree', label: 'Tree' },
  { value: 'dag', label: 'DAG' },
];

const NODE_TYPE_LABELS: Record<GraphNodeType, string> = {
  hermes: 'Hermes',
  agent: 'Agent',
  mission: 'Mission',
  plan: 'Plan',
  step: 'Step',
  memory: 'Memory',
  plugin: 'Plugin',
  skill: 'Skill',
  tool: 'Tool',
  model: 'Model',
  configuration: 'Config',
  file: 'File',
  project: 'Project',
  user: 'User',
  session: 'Session',
  goal: 'Goal',
  execution: 'Execution',
  log: 'Log',
  entity: 'Entity',
};

export function GraphifyToolbar({
  layout,
  onLayoutChange,
  searchQuery,
  onSearchChange,
  activeNodeTypes,
  onNodeTypesChange,
  activeEdgeTypes,
  onEdgeTypesChange,
  onZoomToFit,
  nodeCount,
  edgeCount,
  onHistoryBack,
  onHistoryForward,
  canGoBack,
  canGoForward,
}: GraphifyToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const toggleNodeType = (type: GraphNodeType) => {
    const next = new Set(activeNodeTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    onNodeTypesChange(next);
  };

  const toggleEdgeType = (type: GraphEdgeType) => {
    const next = new Set(activeEdgeTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    onEdgeTypesChange(next);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b bg-background/95 backdrop-blur">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onHistoryBack}
          disabled={!canGoBack}
          className="p-1 rounded hover:bg-muted disabled:opacity-30"
          title="Back"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onHistoryForward}
          disabled={!canGoForward}
          className="p-1 rounded hover:bg-muted disabled:opacity-30"
          title="Forward"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="w-px h-5 bg-border" />

      <select
        value={layout}
        onChange={(e) => onLayoutChange(e.target.value as GraphLayoutType)}
        className="px-2 py-1 text-xs border rounded bg-background"
      >
        {LAYOUTS.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onZoomToFit}
        className="px-2 py-1 text-xs border rounded hover:bg-muted"
      >
        Fit
      </button>

      <div className="w-px h-5 bg-border" />

      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search nodes…"
          className="w-48 px-2 py-1 text-xs border rounded bg-background"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowFilters(!showFilters)}
        className={`px-2 py-1 text-xs border rounded ${
          showFilters ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
        }`}
      >
        Filters
      </button>

      <div className="ml-auto text-xs text-muted-foreground">
        {nodeCount} nodes · {edgeCount} edges
      </div>

      {showFilters && (
        <div className="absolute top-full left-0 right-0 z-50 p-3 bg-background border-b shadow-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium mb-2 text-muted-foreground">Node Types</div>
              <div className="flex flex-wrap gap-1">
                {ALL_NODE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleNodeType(type)}
                    className={`px-2 py-0.5 text-xs rounded border ${
                      activeNodeTypes.size === 0 || activeNodeTypes.has(type)
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-muted border-border text-muted-foreground'
                    }`}
                  >
                    {NODE_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium mb-2 text-muted-foreground">Edge Types</div>
              <div className="flex flex-wrap gap-1">
                {ALL_EDGE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleEdgeType(type)}
                    className={`px-2 py-0.5 text-xs rounded border ${
                      activeEdgeTypes.size === 0 || activeEdgeTypes.has(type)
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-muted border-border text-muted-foreground'
                    }`}
                  >
                    {type.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={() => {
                onNodeTypesChange(new Set());
                onEdgeTypesChange(new Set());
              }}
              className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
