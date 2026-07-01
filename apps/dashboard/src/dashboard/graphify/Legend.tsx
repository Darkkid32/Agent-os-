'use client';

import { getNodeColor, getEdgeColor, ALL_NODE_TYPES, ALL_EDGE_TYPES } from './colors';
import { useState } from 'react';

const NODE_TYPE_LABELS: Record<string, string> = {
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

export function Legend() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute top-2 right-2 z-10">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="px-2 py-1 text-xs bg-background/80 backdrop-blur border rounded hover:bg-background"
      >
        {expanded ? 'Hide Legend' : 'Legend'}
      </button>

      {expanded && (
        <div className="mt-1 p-2 bg-background/95 backdrop-blur border rounded shadow-lg max-h-64 overflow-y-auto text-xs">
          <div className="font-medium mb-1 text-muted-foreground">Nodes</div>
          <div className="space-y-0.5 mb-2">
            {ALL_NODE_TYPES.map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: getNodeColor(type) }}
                />
                <span>{NODE_TYPE_LABELS[type]}</span>
              </div>
            ))}
          </div>
          <div className="font-medium mb-1 text-muted-foreground">Edges</div>
          <div className="space-y-0.5">
            {ALL_EDGE_TYPES.map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-0.5 shrink-0"
                  style={{ backgroundColor: getEdgeColor(type) }}
                />
                <span>{type.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
