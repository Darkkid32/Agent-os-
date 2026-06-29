import { describe, it, expect } from 'vitest';
import type { LogEntry } from './types.js';
import { createConsoleSink, createNullSink, createArraySink } from './sinks.js';

describe('sinks', () => {
  describe('createConsoleSink', () => {
    it('has default name', () => {
      const sink = createConsoleSink();
      expect(sink.name).toBe('console');
    });

    it('has custom name', () => {
      const sink = createConsoleSink('my-console');
      expect(sink.name).toBe('my-console');
    });

    it('has a write function', () => {
      const sink = createConsoleSink();
      expect(typeof sink.write).toBe('function');
    });
  });

  describe('createNullSink', () => {
    it('has default name', () => {
      const sink = createNullSink();
      expect(sink.name).toBe('null');
    });

    it('has a write function that discards entries', () => {
      const sink = createNullSink();
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'test',
      };
      // Should not throw
      expect(() => sink.write(entry)).not.toThrow();
    });
  });

  describe('createArraySink', () => {
    it('has default name', () => {
      const sink = createArraySink();
      expect(sink.name).toBe('array');
    });

    it('collects entries', () => {
      const sink = createArraySink();
      const entry1: LogEntry = {
        timestamp: '2025-01-01T00:00:00.000Z',
        level: 'info',
        message: 'first',
      };
      const entry2: LogEntry = {
        timestamp: '2025-01-01T00:00:01.000Z',
        level: 'warn',
        message: 'second',
      };

      sink.write(entry1);
      sink.write(entry2);

      expect(sink.entries).toHaveLength(2);
      expect(sink.entries[0]).toEqual(entry1);
      expect(sink.entries[1]).toEqual(entry2);
    });

    it('clears collected entries', () => {
      const sink = createArraySink();
      sink.write({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'test',
      });

      expect(sink.entries).toHaveLength(1);
      sink.clear();
      expect(sink.entries).toHaveLength(0);
    });
  });
});
