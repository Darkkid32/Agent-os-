'use client';

import type { GraphifySearchResult } from './types';
import { getNodeColor } from './colors';

interface SearchResultsProps {
  readonly results: readonly GraphifySearchResult[];
  readonly onSelect: (nodeId: string) => void;
  readonly onClear: () => void;
}

export function SearchResults({ results, onSelect, onClear }: SearchResultsProps) {
  if (results.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded shadow-lg max-h-64 overflow-y-auto">
      <div className="flex items-center justify-between px-3 py-1 border-b">
        <span className="text-xs text-muted-foreground">
          {results.length} result{results.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      </div>
      <div>
        {results.map((result) => (
          <button
            key={result.nodeId}
            type="button"
            onClick={() => onSelect(result.nodeId)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted text-sm"
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: getNodeColor(result.type) }}
            />
            <span className="truncate">{result.label}</span>
            <span className="ml-auto text-xs text-muted-foreground shrink-0">{result.type}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
