/**
 * Built-in log sinks.
 *
 * Per docs/architecture/platform.md §13.1, log entries are JSON objects.
 * The console sink writes JSON to stdout/stderr. The null sink discards
 * entries (useful for tests).
 */
import type { LogEntry, LogSink } from './types.js';

/**
 * Console sink — writes structured JSON to stdout (info and below) or
 * stderr (warn and above). Suitable for development and production
 * when a log collector reads stdout.
 */
export const createConsoleSink = (name = 'console'): LogSink => ({
  name,
  write: (entry: LogEntry): void => {
    const line = JSON.stringify(entry);
    if (entry.level === 'warn' || entry.level === 'error' || entry.level === 'fatal') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  },
});

/**
 * Null sink — discards all entries. Useful for tests and silent mode.
 */
export const createNullSink = (name = 'null'): LogSink => ({
  name,
  write: (): void => {
    /* discard */
  },
});

/**
 * Array sink — collects entries in an array for test assertions.
 */
export interface ArraySink extends LogSink {
  readonly entries: readonly LogEntry[];
  readonly clear: () => void;
}

export const createArraySink = (name = 'array'): ArraySink => {
  const collected: LogEntry[] = [];
  return {
    name,
    entries: collected,
    write: (entry: LogEntry): void => {
      collected.push(entry);
    },
    clear: (): void => {
      collected.length = 0;
    },
  };
};
