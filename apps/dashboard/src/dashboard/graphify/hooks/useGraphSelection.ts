'use client';

import { useState, useCallback } from 'react';
import type { GraphifyNode, GraphifySelection, GraphifySearchResult } from '../types';

interface UseGraphSelectionResult {
  readonly selection: GraphifySelection;
  readonly selectNode: (nodeId: string | null) => void;
  readonly selectEdge: (edgeId: string | null) => void;
  readonly highlightNodes: (nodeIds: ReadonlySet<string>) => void;
  readonly highlightEdges: (edgeIds: ReadonlySet<string>) => void;
  readonly clearHighlights: () => void;
  readonly search: (query: string, nodes: readonly GraphifyNode[]) => GraphifySearchResult[];
  readonly selectionHistory: readonly string[];
  readonly historyIndex: number;
  readonly goBack: () => void;
  readonly goForward: () => void;
}

const EMPTY_SELECTION: GraphifySelection = {
  selectedNodeId: null,
  selectedEdgeId: null,
  highlightedNodeIds: new Set(),
  highlightedEdgeIds: new Set(),
};

export function useGraphSelection(): UseGraphSelectionResult {
  const [selection, setSelection] = useState<GraphifySelection>(EMPTY_SELECTION);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const selectNode = useCallback(
    (nodeId: string | null) => {
      setSelection((prev) => ({
        ...prev,
        selectedNodeId: nodeId,
        selectedEdgeId: null,
      }));

      if (nodeId) {
        setHistory((prev) => {
          const trimmed = prev.slice(0, historyIndex + 1);
          return [...trimmed, nodeId];
        });
        setHistoryIndex((prev) => prev + 1);
      }
    },
    [historyIndex],
  );

  const selectEdge = useCallback((edgeId: string | null) => {
    setSelection((prev) => ({
      ...prev,
      selectedEdgeId: edgeId,
      selectedNodeId: null,
    }));
  }, []);

  const highlightNodes = useCallback((nodeIds: ReadonlySet<string>) => {
    setSelection((prev) => ({
      ...prev,
      highlightedNodeIds: nodeIds,
    }));
  }, []);

  const highlightEdges = useCallback((edgeIds: ReadonlySet<string>) => {
    setSelection((prev) => ({
      ...prev,
      highlightedEdgeIds: edgeIds,
    }));
  }, []);

  const clearHighlights = useCallback(() => {
    setSelection((prev) => ({
      ...prev,
      highlightedNodeIds: new Set(),
      highlightedEdgeIds: new Set(),
    }));
  }, []);

  const search = useCallback(
    (query: string, nodes: readonly GraphifyNode[]): GraphifySearchResult[] => {
      if (!query.trim()) return [];

      const lowerQuery = query.toLowerCase();
      return nodes
        .map((node) => {
          const labelMatch = node.label.toLowerCase().includes(lowerQuery) ? 2 : 0;
          const typeMatch = node.type.toLowerCase().includes(lowerQuery) ? 1 : 0;
          const propMatch = Object.values(node.properties).some((v) =>
            String(v).toLowerCase().includes(lowerQuery),
          )
            ? 1
            : 0;
          const score = labelMatch + typeMatch + propMatch;

          return {
            nodeId: node.id,
            label: node.label,
            type: node.type,
            matchScore: score,
          };
        })
        .filter((r) => r.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore);
    },
    [],
  );

  const goBack = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const nodeId: string | undefined = history[newIndex];
    setHistoryIndex(newIndex);
    setSelection((prev) => ({
      ...prev,
      selectedNodeId: nodeId ?? null,
      selectedEdgeId: null,
    }));
  }, [history, historyIndex]);

  const goForward = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const nodeId: string | undefined = history[newIndex];
    setHistoryIndex(newIndex);
    setSelection((prev) => ({
      ...prev,
      selectedNodeId: nodeId ?? null,
      selectedEdgeId: null,
    }));
  }, [history, historyIndex]);

  return {
    selection,
    selectNode,
    selectEdge,
    highlightNodes,
    highlightEdges,
    clearHighlights,
    search,
    selectionHistory: history,
    historyIndex,
    goBack,
    goForward,
  };
}
