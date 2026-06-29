/**
 * Structured Logger.
 *
 * Per docs/architecture/platform.md §13.1, every log entry is a JSON
 * object with stable fields (timestamp, level, message, adapter,
 * requestId, correlationId, traceId, spanId, durationMs, phase, plus
 * additional context).
 *
 * The Logger is a thin formatter + dispatcher. It:
 *   1. Merges the current AsyncLocalStorage context (request/correlation IDs).
 *   2. Merges any additional context fields.
 *   3. Formats the entry as a LogEntry.
 *   4. Dispatches to all configured sinks.
 *
 * No business logic. No I/O beyond sink.write(). Sinks own their I/O.
 */
import {
  isLevelEnabled,
  type LogEntry,
  type LogLevel,
  type LoggerConfig,
  type ObservabilityContext,
} from './types.js';
import { currentContext } from './context.js';
import { createConsoleSink } from './sinks.js';

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: 'info',
  sinks: [createConsoleSink()],
};

export class Logger {
  private readonly config: LoggerConfig;
  private readonly adapterName: string | undefined;

  public constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      sinks: config?.sinks ?? DEFAULT_CONFIG.sinks,
    };
    this.adapterName = config?.defaultAdapter;
  }

  /**
   * Create a child logger with a fixed adapter name. All log entries
   * produced by the child will include `adapter: <name>`.
   */
  public child(adapterName: string): Logger {
    return new Logger({
      ...this.config,
      defaultAdapter: adapterName,
    });
  }

  /**
   * Log at the given level. The entry is formatted and dispatched to
   * all sinks only if the level meets the minimum threshold.
   */
  public log(level: LogLevel, message: string, context?: Partial<LogEntry>): void {
    if (!isLevelEnabled(this.config.minLevel, level)) return;

    const ctx = currentContext();
    const entry = this.formatEntry(level, message, ctx, context);

    for (const sink of this.config.sinks) {
      sink.write(entry);
    }
  }

  public trace(message: string, context?: Partial<LogEntry>): void {
    this.log('trace', message, context);
  }

  public debug(message: string, context?: Partial<LogEntry>): void {
    this.log('debug', message, context);
  }

  public info(message: string, context?: Partial<LogEntry>): void {
    this.log('info', message, context);
  }

  public warn(message: string, context?: Partial<LogEntry>): void {
    this.log('warn', message, context);
  }

  public error(message: string, context?: Partial<LogEntry>): void {
    this.log('error', message, context);
  }

  public fatal(message: string, context?: Partial<LogEntry>): void {
    this.log('fatal', message, context);
  }

  /**
   * Flush all sinks that support flushing.
   */
  public flush(): void {
    for (const sink of this.config.sinks) {
      sink.flush?.();
    }
  }

  /**
   * Close all sinks that support closing.
   */
  public close(): void {
    for (const sink of this.config.sinks) {
      sink.close?.();
    }
  }

  private formatEntry(
    level: LogLevel,
    message: string,
    ctx: ObservabilityContext | undefined,
    extra: Partial<LogEntry> | undefined,
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(this.adapterName != null ? { adapter: this.adapterName } : {}),
      ...(ctx?.requestId != null ? { requestId: ctx.requestId } : {}),
      ...(ctx?.correlationId != null ? { correlationId: ctx.correlationId } : {}),
      ...(ctx?.traceId != null ? { traceId: ctx.traceId } : {}),
      ...(ctx?.spanId != null ? { spanId: ctx.spanId } : {}),
    };

    if (extra) {
      const { timestamp: _t, level: _l, message: _m, ...rest } = extra;
      Object.assign(entry, rest);
    }

    return entry;
  }
}

/**
 * Create a root logger with the given configuration.
 */
export const createLogger = (config?: Partial<LoggerConfig>): Logger => new Logger(config);
