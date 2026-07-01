'use client';

import type { GraphifyNode, GraphifyEdge } from './types';
import { getNodeColor } from './colors';

interface NodeInspectorProps {
  readonly node: GraphifyNode;
  readonly edges: readonly GraphifyEdge[];
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

function PropValue({ value }: { readonly value: unknown }): React.ReactNode {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) {
    return (
      <>
        {value.map((v, i) => (
          <span key={i}>
            {i > 0 ? ', ' : ''}
            {String(v)}
          </span>
        ))}
      </>
    );
  }
  return <>{String(value)}</>;
}

function NodeInspectorMission({ properties }: { readonly properties: Record<string, unknown> }) {
  return (
    <div className="space-y-1 text-xs">
      {properties.plan !== undefined && (
        <div>
          <span className="text-muted-foreground">Plan:</span> <PropValue value={properties.plan} />
        </div>
      )}
      {properties.progress !== undefined && (
        <div>
          <span className="text-muted-foreground">Progress:</span>{' '}
          <PropValue value={properties.progress} />
        </div>
      )}
      {properties.assignedAgent !== undefined && (
        <div>
          <span className="text-muted-foreground">Agent:</span>{' '}
          <PropValue value={properties.assignedAgent} />
        </div>
      )}
      {properties.tools !== undefined && (
        <div>
          <span className="text-muted-foreground">Tools:</span>{' '}
          <PropValue value={properties.tools} />
        </div>
      )}
      {properties.memoryUsed !== undefined && (
        <div>
          <span className="text-muted-foreground">Memory:</span>{' '}
          <PropValue value={properties.memoryUsed} />
        </div>
      )}
    </div>
  );
}

function NodeInspectorAgent({ properties }: { readonly properties: Record<string, unknown> }) {
  return (
    <div className="space-y-1 text-xs">
      {properties.status !== undefined && (
        <div>
          <span className="text-muted-foreground">Status:</span>{' '}
          <PropValue value={properties.status} />
        </div>
      )}
      {properties.goal !== undefined && (
        <div>
          <span className="text-muted-foreground">Goal:</span> <PropValue value={properties.goal} />
        </div>
      )}
      {properties.currentPlan !== undefined && (
        <div>
          <span className="text-muted-foreground">Plan:</span>{' '}
          <PropValue value={properties.currentPlan} />
        </div>
      )}
      {properties.currentMission !== undefined && (
        <div>
          <span className="text-muted-foreground">Mission:</span>{' '}
          <PropValue value={properties.currentMission} />
        </div>
      )}
      {properties.health !== undefined && (
        <div>
          <span className="text-muted-foreground">Health:</span>{' '}
          <PropValue value={properties.health} />
        </div>
      )}
      {properties.tokens !== undefined && (
        <div>
          <span className="text-muted-foreground">Tokens:</span>{' '}
          <PropValue value={properties.tokens} />
        </div>
      )}
      {properties.latency !== undefined && (
        <div>
          <span className="text-muted-foreground">Latency:</span>{' '}
          <PropValue value={properties.latency} />
          ms
        </div>
      )}
      {properties.cost !== undefined && (
        <div>
          <span className="text-muted-foreground">Cost:</span> $
          <PropValue value={properties.cost} />
        </div>
      )}
    </div>
  );
}

function NodeInspectorMemory({ properties }: { readonly properties: Record<string, unknown> }) {
  return (
    <div className="space-y-1 text-xs">
      {properties.content !== undefined && (
        <div className="p-2 bg-muted rounded text-xs max-h-24 overflow-y-auto">
          <PropValue value={properties.content} />
        </div>
      )}
      {properties.scope !== undefined && (
        <div>
          <span className="text-muted-foreground">Scope:</span>{' '}
          <PropValue value={properties.scope} />
        </div>
      )}
      {properties.importance !== undefined && (
        <div>
          <span className="text-muted-foreground">Importance:</span>{' '}
          <PropValue value={properties.importance} />
        </div>
      )}
      {properties.source !== undefined && (
        <div>
          <span className="text-muted-foreground">Source:</span>{' '}
          <PropValue value={properties.source} />
        </div>
      )}
      {properties.retrievalCount !== undefined && (
        <div>
          <span className="text-muted-foreground">Retrievals:</span>{' '}
          <PropValue value={properties.retrievalCount} />
        </div>
      )}
    </div>
  );
}

function NodeInspectorPlugin({ properties }: { readonly properties: Record<string, unknown> }) {
  return (
    <div className="space-y-1 text-xs">
      {properties.version !== undefined && (
        <div>
          <span className="text-muted-foreground">Version:</span>{' '}
          <PropValue value={properties.version} />
        </div>
      )}
      {properties.health !== undefined && (
        <div>
          <span className="text-muted-foreground">Health:</span>{' '}
          <PropValue value={properties.health} />
        </div>
      )}
      {properties.capabilities !== undefined && (
        <div>
          <span className="text-muted-foreground">Capabilities:</span>{' '}
          <PropValue value={properties.capabilities} />
        </div>
      )}
      {properties.registeredTools !== undefined && (
        <div>
          <span className="text-muted-foreground">Tools:</span>{' '}
          <PropValue value={properties.registeredTools} />
        </div>
      )}
      {properties.events !== undefined && (
        <div>
          <span className="text-muted-foreground">Events:</span>{' '}
          <PropValue value={properties.events} />
        </div>
      )}
    </div>
  );
}

export function NodeInspector({ node, edges, allNodes, onClose }: NodeInspectorProps) {
  const connectedEdges = edges.filter((e) => e.sourceId === node.id || e.targetId === node.id);

  const outgoingEdges = connectedEdges.filter((e) => e.sourceId === node.id);
  const incomingEdges = connectedEdges.filter((e) => e.targetId === node.id);

  const getNodeLabel = (id: string): string => {
    const found = allNodes.find((n) => n.id === id);
    return found ? found.label : id;
  };

  return (
    <div className="w-80 border-l bg-background overflow-y-auto">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getNodeColor(node.type) }}
          />
          <span className="font-medium text-sm">{node.label}</span>
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
            <code className="text-xs">{node.id}</code>
          </div>
          <div>
            <span className="text-muted-foreground">Type:</span> {node.type}
          </div>
          <div>
            <span className="text-muted-foreground">Created:</span> {formatDate(node.createdAt)}
          </div>
          <div>
            <span className="text-muted-foreground">Updated:</span> {formatDate(node.updatedAt)}
          </div>
          <div>
            <span className="text-muted-foreground">Relationships:</span> {connectedEdges.length}
          </div>
        </div>

        {node.type === 'mission' && <NodeInspectorMission properties={node.properties} />}
        {node.type === 'agent' && <NodeInspectorAgent properties={node.properties} />}
        {node.type === 'memory' && <NodeInspectorMemory properties={node.properties} />}
        {node.type === 'plugin' && <NodeInspectorPlugin properties={node.properties} />}

        {Object.keys(node.properties).length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Properties</div>
            <div className="space-y-0.5 text-xs">
              {Object.entries(node.properties).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="text-right max-w-[180px] truncate">
                    <PropValue value={value} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {outgoingEdges.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Outgoing ({outgoingEdges.length})
            </div>
            <div className="space-y-0.5 text-xs">
              {outgoingEdges.map((e) => (
                <div key={e.id} className="flex items-center gap-1">
                  <span className="text-muted-foreground">→</span>
                  <span>{getNodeLabel(e.targetId)}</span>
                  <span className="text-muted-foreground">({e.type})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {incomingEdges.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Incoming ({incomingEdges.length})
            </div>
            <div className="space-y-0.5 text-xs">
              {incomingEdges.map((e) => (
                <div key={e.id} className="flex items-center gap-1">
                  <span className="text-muted-foreground">←</span>
                  <span>{getNodeLabel(e.sourceId)}</span>
                  <span className="text-muted-foreground">({e.type})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
