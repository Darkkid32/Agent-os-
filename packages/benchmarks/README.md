# @agent-os/benchmarks

Performance benchmarks for Agent OS.

## Overview

The benchmarks package provides a comprehensive benchmark suite for measuring performance, detecting memory leaks, and stress testing concurrent operations.

## Features

- **Micro-benchmarks**: Measure operations per second for critical paths
- **Memory Profiling**: Detect memory leaks during lifecycle transitions
- **Stress Testing**: Verify concurrent operation safety
- **Regression Detection**: Baseline performance for comparison

## Benchmark Categories

### Hermes
- `createHermes`: Message bus initialization
- `status`: Status retrieval (idle vs running)
- `registerModule`: Module registration
- `start + stop`: Lifecycle cycle performance

### Authentication
- `API key validation`: Valid, invalid, random keys
- `Bearer token validation`: Valid, invalid tokens
- `canHttp`: Permission checks

### Configuration
- `ConfigProvider`: Simple and complex schemas
- `Validator`: Valid and invalid data validation
- `Registry`: Provider registration and lookup

### Plugin Platform
- `Platform creation`: 10, 100, 500 plugins
- `Registry operations`: Register + lookup at scale
- `Lifecycle transitions`: Initialization at scale

## Running Benchmarks

```bash
# Run all benchmarks
pnpm --filter @agent-os/benchmarks bench

# Run stress/memory tests
pnpm --filter @agent-os/benchmarks test
```

## Interpreting Results

### Hz (Operations per Second)
Higher is better. Shows how many operations complete per second.

### Percentiles (p75, p99, p995, p999)
Shows latency distribution. Lower is better.

### rme (Relative Margin of Error)
Shows measurement stability. Lower is better (< 2% is excellent).

## Memory Profiling

Memory tests verify:
- **Baseline memory**: Platform memory footprint
- **Startup memory**: Initialization memory usage
- **Leak detection**: Repeated startup/shutdown cycles
- **Stabilization**: Memory returns to baseline after warmup

## Stress Testing

Stress tests verify:
- **Concurrent operations**: 100+ parallel calls
- **Data integrity**: No corruption under load
- **Idempotency**: Repeated operations produce same results

## Adding Benchmarks

1. Create `src/<category>.bench.ts`
2. Import `bench`, `describe` from vitest
3. Use `bench('name', () => { ... })` for sync operations
4. Export from `src/index.ts`
