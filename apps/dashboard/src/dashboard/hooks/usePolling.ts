'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardEnvelope } from '../api/types';

export interface UsePollingOptions<T> {
  readonly fetcher: () => Promise<DashboardEnvelope<T>>;
  readonly intervalMs?: number;
  readonly enabled?: boolean;
}

export interface UsePollingResult<T> {
  readonly data: T | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly lastUpdated: string | null;
  readonly refresh: () => Promise<void>;
}

export function usePolling<T>({
  fetcher,
  intervalMs = 3000,
  enabled = true,
}: UsePollingOptions<T>): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const result = await fetcher();
      if (!mountedRef.current) return;
      if (result.ok) {
        setData(result.data);
        setError(null);
        setLastUpdated(new Date().toISOString());
      } else {
        setError(result.error.message);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void fetchData();
    const id = setInterval(() => {
      void fetchData();
    }, intervalMs);
    return () => clearInterval(id);
  }, [enabled, fetchData, intervalMs]);

  return { data, loading, error, lastUpdated, refresh: fetchData };
}
