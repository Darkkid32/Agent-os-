'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  GraphLayoutType,
  GraphNodeType,
  GraphEdgeType,
  GraphifySearchResult,
} from '../../dashboard/graphify/types';
import { useGraphData, useGraphSelection, computeLayout } from '../../dashboard/graphify';
import { GraphifyCanvas } from '../../dashboard/graphify/GraphifyCanvas';
import { GraphifyToolbar } from '../../dashboard/graphify/GraphifyToolbar';
import { NodeInspector } from '../../dashboard/graphify/NodeInspector';
import { EdgeInspector } from '../../dashboard/graphify/EdgeInspector';
import { SearchResults } from '../../dashboard/graphify/SearchResults';
import { TimelineControl } from '../../dashboard/graphify/TimelineControl';
import { MiniMap } from '../../dashboard/graphify/MiniMap';
import { Legend } from '../../dashboard/graphify/Legend';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/v1';

const LAYOUT_STORAGE_KEY = 'graphify-layout';

function getStoredLayout(): GraphLayoutType {
  if (typeof window === 'undefined') return 'force';
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (
      stored === 'force' ||
      stored === 'hierarchical' ||
      stored === 'radial' ||
      stored === 'tree' ||
      stored === 'dag'
    ) {
      return stored;
    }
  } catch {
    // ignore
  }
  return 'force';
}

function storeLayout(layout: GraphLayoutType): void {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
  } catch {
    // ignore
  }
}

export default function KnowledgePage() {
  const [layout, setLayout] = useState<GraphLayoutType>(getStoredLayout);
  const [filterNodeTypes, setFilterNodeTypes] = useState<ReadonlySet<GraphNodeType>>(new Set());
  const [filterEdgeTypes, setFilterEdgeTypes] = useState<ReadonlySet<GraphEdgeType>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<readonly GraphifySearchResult[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const { snapshot, loading, error, lastUpdated } = useGraphData({
    apiUrl: `${API_BASE}/graph`,
    pollIntervalMs: 3000,
    enabled: selectedTime === null,
  });

  const selectionHook = useGraphSelection();

  const handleLayoutChange = useCallback((newLayout: GraphLayoutType) => {
    setLayout(newLayout);
    storeLayout(newLayout);
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      const results = selectionHook.search(query, snapshot.nodes);
      setSearchResults(results);

      if (results.length > 0) {
        const nodeIds = new Set(results.map((r) => r.nodeId));
        selectionHook.highlightNodes(nodeIds);
      } else {
        selectionHook.clearHighlights();
      }
    },
    [selectionHook, snapshot.nodes],
  );

  const handleSearchSelect = useCallback(
    (nodeId: string) => {
      selectionHook.selectNode(nodeId);
      setSearchResults([]);
      setSearchQuery('');
    },
    [selectionHook],
  );

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      selectionHook.selectNode(nodeId);
      selectionHook.clearHighlights();
    },
    [selectionHook],
  );

  const handleEdgeClick = useCallback(
    (edgeId: string) => {
      selectionHook.selectEdge(edgeId);
    },
    [selectionHook],
  );

  const handleBackgroundClick = useCallback(() => {
    selectionHook.selectNode(null);
    selectionHook.selectEdge(null);
    selectionHook.clearHighlights();
  }, [selectionHook]);

  const handleNodeHover = useCallback((_nodeId: string | null) => {
    // Could add hover highlighting here
  }, []);

  const layoutNodes = useMemo(
    () => computeLayout(snapshot.nodes, snapshot.edges, layout).nodes,
    [snapshot.nodes, snapshot.edges, layout],
  );

  const selectedNode = useMemo(
    () => snapshot.nodes.find((n) => n.id === selectionHook.selection.selectedNodeId) ?? null,
    [snapshot.nodes, selectionHook.selection.selectedNodeId],
  );

  const selectedEdge = useMemo(
    () => snapshot.edges.find((e) => e.id === selectionHook.selection.selectedEdgeId) ?? null,
    [snapshot.edges, selectionHook.selection.selectedEdgeId],
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <GraphifyToolbar
        layout={layout}
        onLayoutChange={handleLayoutChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        activeNodeTypes={filterNodeTypes}
        onNodeTypesChange={setFilterNodeTypes}
        activeEdgeTypes={filterEdgeTypes}
        onEdgeTypesChange={setFilterEdgeTypes}
        onZoomToFit={() => {}}
        nodeCount={snapshot.nodes.length}
        edgeCount={snapshot.edges.length}
        onHistoryBack={selectionHook.goBack}
        onHistoryForward={selectionHook.goForward}
        canGoBack={selectionHook.historyIndex > 0}
        canGoForward={selectionHook.historyIndex < selectionHook.selectionHistory.length - 1}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          {loading && snapshot.nodes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Loading graph…
            </div>
          ) : (
            <>
              <GraphifyCanvas
                nodes={layoutNodes}
                edges={snapshot.edges}
                layout={layout}
                selection={selectionHook.selection}
                filterNodeTypes={filterNodeTypes}
                filterEdgeTypes={filterEdgeTypes}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                onNodeHover={handleNodeHover}
                onBackgroundClick={handleBackgroundClick}
              />
              <MiniMap nodes={layoutNodes} />
              <Legend />
              {searchResults.length > 0 && (
                <SearchResults
                  results={searchResults}
                  onSelect={handleSearchSelect}
                  onClear={() => {
                    setSearchResults([]);
                    setSearchQuery('');
                    selectionHook.clearHighlights();
                  }}
                />
              )}
            </>
          )}

          {error && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 text-xs text-destructive bg-background/80 backdrop-blur rounded border">
              {error}
            </div>
          )}
        </div>

        {selectedNode && (
          <NodeInspector
            node={selectedNode}
            edges={snapshot.edges}
            allNodes={snapshot.nodes}
            onClose={() => selectionHook.selectNode(null)}
          />
        )}

        {selectedEdge && !selectedNode && (
          <EdgeInspector
            edge={selectedEdge}
            allNodes={snapshot.nodes}
            onClose={() => selectionHook.selectEdge(null)}
          />
        )}
      </div>

      <TimelineControl
        apiUrl={`${API_BASE}/graph`}
        onTimeSelect={setSelectedTime}
        isPlaying={isPlaying}
        onPlayToggle={() => setIsPlaying(!isPlaying)}
        playbackSpeed={playbackSpeed}
        onSpeedChange={setPlaybackSpeed}
      />

      {lastUpdated && (
        <div className="px-3 py-1 text-xs text-muted-foreground border-t">
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
