'use client';

import { useState, useEffect, useCallback } from 'react';

interface TimelineEntry {
  readonly timestamp: string;
  readonly nodeCount: number;
  readonly edgeCount: number;
}

interface TimelineControlProps {
  readonly apiUrl: string;
  readonly onTimeSelect: (timestamp: string | null) => void;
  readonly isPlaying: boolean;
  readonly onPlayToggle: () => void;
  readonly playbackSpeed: number;
  readonly onSpeedChange: (speed: number) => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString();
  } catch {
    return iso;
  }
}

export function TimelineControl({
  apiUrl,
  onTimeSelect,
  isPlaying,
  onPlayToggle,
  playbackSpeed,
  onSpeedChange,
}: TimelineControlProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/history?limit=50`);
        if (!res.ok) return;
        const json: unknown = await res.json();
        const obj =
          typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : {};
        const value = obj.ok === true ? obj.value : json;
        if (!mounted) return;
        const changes = Array.isArray(value) ? value : [];
        const mapped: TimelineEntry[] = changes.map((c: Record<string, unknown>) => ({
          timestamp: String(c.timestamp ?? ''),
          nodeCount: Number(c.nodeCount ?? 0),
          edgeCount: Number(c.edgeCount ?? 0),
        }));
        setEntries(mapped);
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void fetchHistory();
    return () => {
      mounted = false;
    };
  }, [apiUrl]);

  const handleSliderChange = useCallback(
    (value: number) => {
      setSelectedIndex(value);
      const entry: TimelineEntry | undefined = entries[value];
      if (value < 0 || !entry) {
        onTimeSelect(null);
      } else {
        onTimeSelect(entry.timestamp);
      }
    },
    [entries, onTimeSelect],
  );

  useEffect(() => {
    if (!isPlaying || entries.length === 0) return;
    if (selectedIndex >= entries.length - 1) {
      onPlayToggle();
      return;
    }

    const timer = setTimeout(() => {
      setSelectedIndex((prev) => {
        const next = prev + 1;
        if (next >= entries.length) {
          onPlayToggle();
          return prev;
        }
        const entry: TimelineEntry | undefined = entries[next];
        if (entry) {
          onTimeSelect(entry.timestamp);
        }
        return next;
      });
    }, 1000 / playbackSpeed);

    return () => clearTimeout(timer);
  }, [isPlaying, selectedIndex, entries, playbackSpeed, onPlayToggle, onTimeSelect]);

  if (loading && entries.length === 0) {
    return null;
  }

  const currentEntry: TimelineEntry | undefined =
    selectedIndex >= 0 ? entries[selectedIndex] : undefined;

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-t bg-background/95 backdrop-blur">
      <button
        type="button"
        onClick={onPlayToggle}
        className="p-1 rounded hover:bg-muted"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      <input
        type="range"
        min={-1}
        max={entries.length - 1}
        value={selectedIndex}
        onChange={(e) => handleSliderChange(Number(e.target.value))}
        className="flex-1 h-1"
      />

      <select
        value={playbackSpeed}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
        className="px-1 py-0.5 text-xs border rounded bg-background"
      >
        <option value={0.5}>0.5×</option>
        <option value={1}>1×</option>
        <option value={2}>2×</option>
        <option value={4}>4×</option>
      </select>

      <div className="text-xs text-muted-foreground min-w-[80px] text-right">
        {currentEntry ? formatDate(currentEntry.timestamp) : 'Live'}
      </div>
    </div>
  );
}
