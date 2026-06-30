# Stress Testing

This document describes the stress testing suite for Agent OS.

## Overview

Stress tests verify that Agent OS components handle concurrent operations correctly and maintain data integrity under high load.

## Running Stress Tests

```bash
pnpm --filter @agent-os/benchmarks test
```

## Test Categories

### Concurrent Hermes Operations
- **Concurrent status()**: 100 parallel status calls
- **Concurrent registerModule()**: 50 parallel module registrations
- **Concurrent health()**: 100 parallel health checks
- **Rapid lifecycle**: 20 start/stop cycles
- **Mixed operations**: 200 interleaved status/registerModule

### Concurrent Config Operations
- **Parallel reads**: 100 parallel `provider.get()` calls
- **Parallel validation**: 100 parallel `validator.validate()` calls
- **Parallel registry operations**: 100 parallel provider lookups

### Concurrent Auth Operations
- **Parallel validation**: 100 parallel API key validations
- **Parallel permission checks**: 100 parallel `canHttp()` calls
- **Parallel token validation**: 100 parallel bearer token validations

### Concurrent Plugin Operations
- **Parallel registration**: 100 parallel `registry.register()` calls
- **Parallel reads**: 200 parallel `registry.get()` calls
- **Parallel lifecycle**: Concurrent initialization attempts

## What Stress Tests Verify

### Thread Safety
- No data races in concurrent operations
- Consistent state under parallel access
- No corrupted internal state

### Idempotency
- Repeated operations produce same results
- No duplicate side effects
- Safe to call multiple times

### Error Handling
- Graceful degradation under load
- No crashes on invalid input
- Proper error propagation

### Resource Management
- No file handle leaks
- No memory leaks under sustained load
- Proper cleanup after errors

## Interpreting Results

### Pass/Fail
All stress tests should pass without errors. A failing stress test indicates:
- **Race condition**: Data corruption under concurrent access
- **Memory leak**: Unbounded growth during sustained operation
- **Error handling bug**: Crash on invalid input

### Performance
While stress tests focus on correctness, watch for:
- **Timeouts**: Tests exceeding time limits indicate bottlenecks
- **Slow operations**: Operations taking > 100ms under load
- **Degradation**: Performance dropping with increasing load

## Common Issues

### Race Conditions
- Check for shared mutable state
- Verify atomic operations
- Review locking strategies

### Memory Leaks
- Check event listener cleanup
- Verify timer cancellation
- Review object retention

### Timeout Errors
- Check for infinite loops
- Review blocking operations
- Increase timeout if needed

## Adding New Stress Tests

1. Create or extend `src/stress.test.ts`
2. Use `describe('Stress: <category>', () => { ... })`
3. Use `it('concurrent <operation>', () => { ... })` for sync tests
4. Use `it('concurrent <operation> does not crash', async () => { ... })` for async
5. Use `Array.from({ length: N }, ...)` for parallel operations
