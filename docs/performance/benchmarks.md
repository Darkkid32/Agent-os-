# Performance Benchmarks

This document describes the benchmark suite for Agent OS.

## Overview

The benchmark suite (`packages/benchmarks/`) provides:
- **Micro-benchmarks** via Vitest bench mode for critical operations
- **Memory profiling** tests for leak detection
- **Stress tests** for concurrent operation safety

## Running Benchmarks

```bash
# Run all benchmarks
pnpm --filter @agent-os/benchmarks bench

# Run stress/memory tests
pnpm --filter @agent-os/benchmarks test

# Run all benchmarks + tests
pnpm --filter @agent-os/benchmarks run-all
```

## Benchmark Categories

### Hermes (Core Engine)
- **createHermes**: Message bus initialization
- **status**: Status retrieval (idle vs running)
- **registerModule**: Module registration (1 and 10 modules)
- **start + stop**: Lifecycle cycle performance
- **health**: Health check performance

### Authentication
- **API key validation**: Valid, invalid, random keys
- **Bearer token validation**: Valid, invalid tokens
- **canHttp**: Permission checks (admin vs viewer)
- **100 keys lookup**: Performance with many credentials

### Configuration
- **ConfigProvider**: Simple and complex schemas
- **Validator**: Valid and invalid data validation
- **Config access**: get, getTyped, has, all operations
- **Registry**: Provider registration and lookup

### Plugin Platform
- **Platform creation**: 10, 100, 500 plugins
- **Registry operations**: Register + lookup at scale
- **Lifecycle transitions**: Initialization at scale

### Adapters
- **WebhookAdapter**: Instantiation and payload parsing
- **CLI adapter**: Creation performance
- **JSON operations**: Parse/stringify for payloads
- **Header parsing**: Request pattern matching

## Memory Profiling

Memory tests (`memory.test.ts`) verify:
- **Baseline memory**: Platform memory footprint
- **Startup memory**: Hermes initialization memory
- **Leak detection**: Repeated startup/shutdown cycles
- **Plugin memory**: Multiple platform instances
- **Stabilization**: Memory returns to baseline after warmup

## Stress Testing

Stress tests (`stress.test.ts`) verify:
- **Concurrent status()**: 100 parallel status calls
- **Concurrent registerModule()**: 50 parallel module registrations
- **Concurrent health()**: 100 parallel health checks
- **Rapid lifecycle**: 20 start/stop cycles
- **Mixed operations**: 200 interleaved status/registerModule
- **Config operations**: 100 parallel reads
- **Auth validation**: 100 parallel validations
- **Plugin operations**: 100 parallel registrations, 200 parallel reads

## Interpreting Results

### Hz (Operations per Second)
Higher is better. Shows how many operations complete per second.

### Percentiles (p75, p99, p995, p999)
Shows latency distribution:
- **p75**: 75% of operations complete within this time
- **p99**: 99% of operations complete within this time
- **p999**: 99.9% of operations complete within this time

### rme (Relative Margin of Error)
Shows measurement stability. Lower is better (< 2% is excellent).

## Baseline Performance

Typical results on a modern machine:

| Operation | Hz | p99 |
|-----------|-----|-----|
| createHermes | ~740k | < 4ms |
| status (idle) | ~780k | < 4ms |
| registerModule (1) | ~37k | < 100ms |
| createPluginPlatform | ~1.6M | < 7ms |
| API key validation (valid) | ~116k | < 10ms |
| Bearer token validation | ~228k | < 5ms |

## Adding New Benchmarks

1. Create `src/<category>.bench.ts`
2. Import `bench`, `describe` from vitest
3. Use `bench('name', () => { ... })` for sync operations
4. Use `bench('name', async () => { ... })` for async operations
5. Export from `src/index.ts`
