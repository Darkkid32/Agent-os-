'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GraphifyNode, GraphifyEdge, GraphifySnapshot } from '../types';

interface UseGraphDataOptions {
  readonly apiUrl: string;
  readonly pollIntervalMs?: number;
  readonly enabled?: boolean;
}

interface UseGraphDataResult {
  readonly snapshot: GraphifySnapshot;
  readonly loading: boolean;
  readonly error: string | null;
  readonly lastUpdated: string | null;
  readonly refresh: () => Promise<void>;
}

const EMPTY_STATS = {
  nodeCount: 0,
  edgeCount: 0,
  nodesByType: {} as Record<string, number>,
  edgesByType: {} as Record<string, number>,
};

const EMPTY_SNAPSHOT: GraphifySnapshot = {
  nodes: [],
  edges: [],
  stats: EMPTY_STATS,
};

function parseNode(raw: Record<string, unknown>): GraphifyNode {
  return {
    id: String(raw.id ?? ''),
    type: String(raw.type ?? 'entity') as GraphifyNode['type'],
    label: String(raw.label ?? ''),
    properties: (raw.properties as Record<string, unknown>) ?? {},
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

function parseEdge(raw: Record<string, unknown>): GraphifyEdge {
  return {
    id: String(raw.id ?? ''),
    type: String(raw.type ?? 'related_to') as GraphifyEdge['type'],
    sourceId: String(raw.sourceId ?? raw.source ?? ''),
    targetId: String(raw.targetId ?? raw.target ?? ''),
    weight: Number(raw.weight ?? 1),
    properties: (raw.properties as Record<string, unknown>) ?? {},
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

function parseSnapshot(data: unknown): GraphifySnapshot {
  if (!data || typeof data !== 'object') return EMPTY_SNAPSHOT;
  const obj = data as Record<string, unknown>;

  const rawNodes = Array.isArray(obj.nodes) ? obj.nodes : [];
  const rawEdges = Array.isArray(obj.edges) ? obj.edges : [];
  const rawStats = (obj.stats as Record<string, unknown>) ?? EMPTY_STATS;

  return {
    nodes: rawNodes.map((n) => parseNode(n as Record<string, unknown>)),
    edges: rawEdges.map((e) => parseEdge(e as Record<string, unknown>)),
    stats: {
      nodeCount: Number(rawStats.nodeCount ?? 0),
      edgeCount: Number(rawStats.edgeCount ?? 0),
      nodesByType: (rawStats.nodesByType as Record<string, number>) ?? {},
      edgesByType: (rawStats.edgesByType as Record<string, number>) ?? {},
    },
  };
}

export function useGraphData(options: UseGraphDataOptions): UseGraphDataResult {
  const { apiUrl, pollIntervalMs = 3000, enabled = true } = options;
  const [snapshot, setSnapshot] = useState<GraphifySnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchGraph = useCallback(async () => {
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: unknown = await res.json();
      const obj =
        typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : {};
      const value = obj.ok === true ? obj.value : json;
      const newSnapshot = parseSnapshot(value);

      if (!mountedRef.current) return;

      setSnapshot((prev) => {
        const nodeMap = new Map(prev.nodes.map((n) => [n.id, n]));
        for (const node of newSnapshot.nodes) {
          nodeMap.set(node.id, node);
        }
        const edgeMap = new Map(prev.edges.map((e) => [e.id, e]));
        for (const edge of newSnapshot.edges) {
          edgeMap.set(edge.id, edge);
        }

        const prevIds = new Set(prev.nodes.map((n) => n.id));
        const newIds = new Set(newSnapshot.nodes.map((n) => n.id));

        for (const id of prevIds) {
          if (!newIds.has(id)) {
            nodeMap.delete(id);
          }
        }

        const prevEdgeIds = new Set(prev.edges.map((e) => e.id));
        const newEdgeIds = new Set(newSnapshot.edges.map((e) => e.id));

        for (const id of prevEdgeIds) {
          if (!newEdgeIds.has(id)) {
            edgeMap.delete(id);
          }
        }

        return {
          nodes: Array.from(nodeMap.values()),
          edges: Array.from(edgeMap.values()),
          stats: newSnapshot.stats,
        };
      });

      setError(null);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch graph');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;

    void fetchGraph();
    const intervalId = setInterval(() => {
      void fetchGraph();
    }, pollIntervalMs);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [enabled, pollIntervalMs, fetchGraph]);

  return { snapshot, loading, error, lastUpdated, refresh: fetchGraph };
}
