/**
 * Metrics abstractions.
 *
 * Provides in-memory Counter, Histogram, and Gauge implementations.
 * These are lightweight, allocation-free metric collectors that can
 * be read by an exporter (Prometheus, OTLP, etc.) at scrape time.
 *
 * Per the observability skill: track percentiles (histograms), not
 * averages. Labels must come from small, fixed sets — never user IDs
 * or raw URLs.
 *
 * No external metric backend dependency. The exporter is pluggable
 * via the MetricRegistry.
 */
import type { Counter, Histogram, Gauge, MetricOptions } from './types.js';

// ---------------------------------------------------------------------------
// In-memory metric stores
// ---------------------------------------------------------------------------

class InMemoryCounter implements Counter {
  public readonly name: string;
  public readonly help: string;
  private value = 0;
  private readonly baseLabels: Readonly<Record<string, string>>;

  public constructor(options: MetricOptions) {
    this.name = options.name;
    this.help = options.help;
    this.baseLabels = options.labels ?? {};
  }

  public inc(value = 1): void {
    this.value += value;
  }

  public labels(labels: Readonly<Record<string, string>>): Counter {
    const child = new InMemoryCounter({
      name: this.name,
      help: this.help,
      labels: { ...this.baseLabels, ...labels },
    });
    child.value = this.value;
    return child;
  }

  public getValue(): number {
    return this.value;
  }

  public getLabels(): Readonly<Record<string, string>> {
    return this.baseLabels;
  }
}

class InMemoryHistogram implements Histogram {
  public readonly name: string;
  public readonly help: string;
  private readonly observations: number[] = [];
  private readonly baseLabels: Readonly<Record<string, string>>;

  public constructor(options: MetricOptions) {
    this.name = options.name;
    this.help = options.help;
    this.baseLabels = options.labels ?? {};
  }

  public observe(value: number): void {
    this.observations.push(value);
  }

  public labels(labels: Readonly<Record<string, string>>): Histogram {
    const child = new InMemoryHistogram({
      name: this.name,
      help: this.help,
      labels: { ...this.baseLabels, ...labels },
    });
    child.observations.push(...this.observations);
    return child;
  }

  public getObservations(): readonly number[] {
    return this.observations;
  }

  public getLabels(): Readonly<Record<string, string>> {
    return this.baseLabels;
  }

  public count(): number {
    return this.observations.length;
  }

  public sum(): number {
    return this.observations.reduce((a, b) => a + b, 0);
  }

  public percentile(p: number): number {
    if (this.observations.length === 0) return 0;
    const sorted = [...this.observations].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)] as number;
  }
}

class InMemoryGauge implements Gauge {
  public readonly name: string;
  public readonly help: string;
  private value = 0;
  private readonly baseLabels: Readonly<Record<string, string>>;

  public constructor(options: MetricOptions) {
    this.name = options.name;
    this.help = options.help;
    this.baseLabels = options.labels ?? {};
  }

  public set(value: number): void {
    this.value = value;
  }

  public labels(labels: Readonly<Record<string, string>>): Gauge {
    const child = new InMemoryGauge({
      name: this.name,
      help: this.help,
      labels: { ...this.baseLabels, ...labels },
    });
    child.value = this.value;
    return child;
  }

  public getValue(): number {
    return this.value;
  }

  public getLabels(): Readonly<Record<string, string>> {
    return this.baseLabels;
  }
}

// ---------------------------------------------------------------------------
// Metric registry
// ---------------------------------------------------------------------------

export interface MetricRegistry {
  readonly counter: (options: MetricOptions) => Counter;
  readonly histogram: (options: MetricOptions) => Histogram;
  readonly gauge: (options: MetricOptions) => Gauge;
  readonly getMetrics: () => readonly MetricEntry[];
}

export interface MetricEntry {
  readonly name: string;
  readonly help: string;
  readonly type: 'counter' | 'histogram' | 'gauge';
  readonly labels: Readonly<Record<string, string>>;
  readonly value: number;
}

/**
 * In-memory metric registry. Collects metrics in a flat array.
 * An exporter can read `getMetrics()` at scrape time.
 */
export const createMetricRegistry = (): MetricRegistry => {
  const counters: InMemoryCounter[] = [];
  const histograms: InMemoryHistogram[] = [];
  const gauges: InMemoryGauge[] = [];

  return {
    counter: (options: MetricOptions): Counter => {
      const c = new InMemoryCounter(options);
      counters.push(c);
      return c;
    },
    histogram: (options: MetricOptions): Histogram => {
      const h = new InMemoryHistogram(options);
      histograms.push(h);
      return h;
    },
    gauge: (options: MetricOptions): Gauge => {
      const g = new InMemoryGauge(options);
      gauges.push(g);
      return g;
    },
    getMetrics: (): MetricEntry[] => {
      const entries: MetricEntry[] = [];
      for (const c of counters) {
        entries.push({
          name: c.name,
          help: c.help,
          type: 'counter',
          labels: c.getLabels(),
          value: c.getValue(),
        });
      }
      for (const h of histograms) {
        entries.push({
          name: h.name,
          help: h.help,
          type: 'histogram',
          labels: h.getLabels(),
          value: h.sum(),
        });
      }
      for (const g of gauges) {
        entries.push({
          name: g.name,
          help: g.help,
          type: 'gauge',
          labels: g.getLabels(),
          value: g.getValue(),
        });
      }
      return entries;
    },
  };
};
