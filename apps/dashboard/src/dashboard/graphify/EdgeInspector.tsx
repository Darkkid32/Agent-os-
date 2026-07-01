'use client';

import type { GraphifyEdge, GraphifyNode } from './types';
import { getEdgeColor } from './colors';

interface EdgeInspectorProps {
  readonly edge: GraphifyEdge;
  readonly allNodes: readonly GraphifyNode[];
  readonly onClose: () => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function getNodeLabel(id: string, nodes: readonly GraphifyNode[]): string {
  const found = nodes.find((n) => n.id === id);
  return found ? found.label : id;
}

export function EdgeInspector({ edge, allNodes, onClose }: EdgeInspectorProps) {
  return (
    <div className="w-72 border-l bg-background overflow-y-auto">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: getEdgeColor(edge.type) }} />
          <span className="font-medium text-sm">{edge.type.replace(/_/g, ' ')}</span>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-muted">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-3 space-y-3">
        <div className="space-y-1 text-xs">
          <div>
            <span className="text-muted-foreground">ID:</span>{' '}
            <code className="text-xs">{edge.id}</code>
          </div>
          <div>
            <span className="text-muted-foreground">Source:</span>{' '}
            <span>{getNodeLabel(edge.sourceId, allNodes)}</span>
            <span className="text-muted-foreground ml-1">({edge.sourceId})</span>
          </div>
          <div>
            <span className="text-muted-foreground">Target:</span>{' '}
            <span>{getNodeLabel(edge.targetId, allNodes)}</span>
            <span className="text-muted-foreground ml-1">({edge.targetId})</span>
          </div>
          <div>
            <span className="text-muted-foreground">Weight:</span> {edge.weight}
          </div>
          <div>
            <span className="text-muted-foreground">Created:</span> {formatDate(edge.createdAt)}
          </div>
        </div>

        {Object.keys(edge.properties).length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Properties</div>
            <div className="space-y-0.5 text-xs">
              {Object.entries(edge.properties).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="text-right max-w-[140px] truncate">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
