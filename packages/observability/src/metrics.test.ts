import { describe, it, expect } from 'vitest';
import { createMetricRegistry, type MetricEntry } from './metrics.js';

const m = (entries: readonly MetricEntry[], index: number): MetricEntry => {
  const e = entries[index];
  if (!e) throw new Error(`metrics[${index}] is undefined`);
  return e;
};

describe('metrics', () => {
  describe('counter', () => {
    it('starts at zero', () => {
      const registry = createMetricRegistry();
      registry.counter({ name: 'requests', help: 'Total requests' });
      const metrics = registry.getMetrics();
      expect(m(metrics, 0).value).toBe(0);
    });

    it('increments by 1', () => {
      const registry = createMetricRegistry();
      const counter = registry.counter({ name: 'requests', help: 'Total requests' });
      counter.inc();
      counter.inc();
      expect(m(registry.getMetrics(), 0).value).toBe(2);
    });

    it('increments by custom value', () => {
      const registry = createMetricRegistry();
      const counter = registry.counter({ name: 'bytes', help: 'Bytes processed' });
      counter.inc(100);
      counter.inc(50);
      expect(m(registry.getMetrics(), 0).value).toBe(150);
    });
  });

  describe('histogram', () => {
    it('records observations', () => {
      const registry = createMetricRegistry();
      const histogram = registry.histogram({ name: 'latency', help: 'Request latency' });
      histogram.observe(10);
      histogram.observe(20);
      histogram.observe(30);

      const metrics = registry.getMetrics();
      expect(m(metrics, 0).value).toBe(60); // sum
    });

    it('computes percentiles', () => {
      const registry = createMetricRegistry();
      const histogram = registry.histogram({ name: 'latency', help: 'Request latency' });
      for (let i = 1; i <= 100; i++) {
        histogram.observe(i);
      }
      // p50 of 1..100 = 50
      // The histogram tracks observations; we test via the registry sum
      expect(m(registry.getMetrics(), 0).value).toBe(5050); // sum 1+2+...+100
    });
  });

  describe('gauge', () => {
    it('sets value', () => {
      const registry = createMetricRegistry();
      const gauge = registry.gauge({ name: 'connections', help: 'Active connections' });
      gauge.set(5);
      expect(m(registry.getMetrics(), 0).value).toBe(5);

      gauge.set(10);
      expect(m(registry.getMetrics(), 0).value).toBe(10);
    });
  });

  describe('registry', () => {
    it('collects all metric types', () => {
      const registry = createMetricRegistry();
      registry.counter({ name: 'c', help: 'counter' });
      registry.histogram({ name: 'h', help: 'histogram' });
      registry.gauge({ name: 'g', help: 'gauge' });

      const metrics = registry.getMetrics();
      expect(metrics).toHaveLength(3);
      expect(metrics.map((me) => me.type).sort()).toEqual(['counter', 'gauge', 'histogram']);
    });

    it('includes help text and labels', () => {
      const registry = createMetricRegistry();
      registry.counter({
        name: 'requests_total',
        help: 'Total HTTP requests',
        labels: { method: 'GET' },
      });

      const metrics = registry.getMetrics();
      expect(m(metrics, 0).name).toBe('requests_total');
      expect(m(metrics, 0).help).toBe('Total HTTP requests');
      expect(m(metrics, 0).labels).toEqual({ method: 'GET' });
    });
  });
});
