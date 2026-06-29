import { describe, it, expect } from 'vitest';
import type { LogEntry, LogSink } from './types.js';
import { createLogger } from './logger.js';
import { createArraySink } from './sinks.js';
import { runWithContext, createContext } from './context.js';

const entry = (entries: readonly LogEntry[], index: number): LogEntry => {
  const e = entries[index];
  if (!e) throw new Error(`entries[${index}] is undefined`);
  return e;
};

describe('Logger', () => {
  describe('basic logging', () => {
    it('writes to the array sink', () => {
      const sink = createArraySink();
      const logger = createLogger({ sinks: [sink] });

      logger.info('hello');

      expect(sink.entries).toHaveLength(1);
      expect(entry(sink.entries, 0).message).toBe('hello');
      expect(entry(sink.entries, 0).level).toBe('info');
      expect(entry(sink.entries, 0).timestamp).toBeDefined();
    });

    it('respects minimum log level', () => {
      const sink = createArraySink();
      const logger = createLogger({ minLevel: 'warn', sinks: [sink] });

      logger.debug('suppressed');
      logger.info('suppressed');
      logger.warn('visible');
      logger.error('visible');

      expect(sink.entries).toHaveLength(2);
      expect(entry(sink.entries, 0).level).toBe('warn');
      expect(entry(sink.entries, 1).level).toBe('error');
    });

    it('includes additional context fields', () => {
      const sink = createArraySink();
      const logger = createLogger({ sinks: [sink] });

      logger.info('request processed', { phase: 'phase1', durationMs: 42 });

      expect(entry(sink.entries, 0).phase).toBe('phase1');
      expect(entry(sink.entries, 0).durationMs).toBe(42);
    });
  });

  describe('child logger', () => {
    it('includes adapter name in log entries', () => {
      const sink = createArraySink();
      const parent = createLogger({ sinks: [sink] });
      const child = parent.child('whatsapp');

      child.info('message received');

      expect(entry(sink.entries, 0).adapter).toBe('whatsapp');
    });

    it('does not mutate parent logger', () => {
      const sink = createArraySink();
      const parent = createLogger({ sinks: [sink] });
      parent.child('whatsapp');

      parent.info('parent message');

      expect(entry(sink.entries, 0).adapter).toBeUndefined();
    });
  });

  describe('context propagation', () => {
    it('includes requestId and correlationId from context', () => {
      const sink = createArraySink();
      const logger = createLogger({ sinks: [sink] });
      const ctx = createContext();

      runWithContext(ctx, () => {
        logger.info('in context');
      });

      expect(entry(sink.entries, 0).requestId).toBe(ctx.requestId);
      expect(entry(sink.entries, 0).correlationId).toBe(ctx.correlationId);
    });

    it('omits IDs when no context is active', () => {
      const sink = createArraySink();
      const logger = createLogger({ sinks: [sink] });

      logger.info('no context');

      expect(entry(sink.entries, 0).requestId).toBeUndefined();
      expect(entry(sink.entries, 0).correlationId).toBeUndefined();
    });
  });

  describe('multiple sinks', () => {
    it('dispatches to all sinks', () => {
      const sink1 = createArraySink('s1');
      const sink2 = createArraySink('s2');
      const logger = createLogger({ sinks: [sink1, sink2] });

      logger.info('broadcast');

      expect(sink1.entries).toHaveLength(1);
      expect(sink2.entries).toHaveLength(1);
    });
  });

  describe('all log levels', () => {
    it('dispatches trace through fatal', () => {
      const sink = createArraySink();
      const logger = createLogger({ minLevel: 'trace', sinks: [sink] });

      logger.trace('t');
      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');
      logger.fatal('f');

      expect(sink.entries.map((e) => e.level)).toEqual([
        'trace',
        'debug',
        'info',
        'warn',
        'error',
        'fatal',
      ]);
    });
  });

  describe('close and flush', () => {
    it('calls close on sinks that support it', () => {
      let closed = false;
      const sink: LogSink = {
        name: 'custom',
        write: () => {},
        close: () => {
          closed = true;
        },
      };
      const logger = createLogger({ sinks: [sink] });
      logger.close();
      expect(closed).toBe(true);
    });

    it('calls flush on sinks that support it', () => {
      let flushed = false;
      const sink: LogSink = {
        name: 'custom',
        write: () => {},
        flush: () => {
          flushed = true;
        },
      };
      const logger = createLogger({ sinks: [sink] });
      logger.flush();
      expect(flushed).toBe(true);
    });
  });
});
