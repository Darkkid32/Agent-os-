# Memory Profiling

This document describes the memory profiling tests for Agent OS.

## Overview

Memory profiling verifies that Agent OS maintains stable memory usage during operation and does not leak memory during lifecycle transitions.

## Running Memory Tests

```bash
pnpm --filter @agent-os/benchmarks test
```

## Test Categories

### Baseline Memory
Measures memory footprint of core components:
- `createHermes()`: Core message bus
- `createPluginPlatform()`: Plugin system
- `createConfigProvider()`: Configuration

### Startup Memory
Verifies memory increase during initialization:
- `startPlatform()`: Full Hermes startup
- `startPluginPlatform()`: Plugin system startup

### Leak Detection
Runs repeated startup/shutdown cycles and verifies memory doesn't grow:
- 10 cycles of `startPlatform()` → `stopPlatform()`
- Asserts final memory is within 2MB of initial
- Detects gradual memory growth patterns

### Plugin Memory
Tests memory behavior with multiple plugin platforms:
- Creates 10 plugin platform instances
- Verifies memory increase is within 1MB per platform

### Memory Stabilization
Verifies memory returns to baseline after warmup:
- Runs 5 startup/shutdown cycles
- Allows 100ms stabilization period
- Asserts memory returns to within 1.5x baseline

## Interpreting Results

### Heap Used (MB)
The actual memory consumed by the process. V8 manages garbage collection automatically.

### Memory Growth
Expected growth:
- **Normal**: < 1MB increase per platform instance
- **Leak warning**: > 2MB increase after 10 cycles
- **Leak detected**: Memory continuously grows without stabilizing

### Thresholds
- **Baseline**: < 5MB for all core components
- **Startup**: < 10MB for full platform startup
- **Growth limit**: < 2MB per platform instance
- **Cycle limit**: Memory should stabilize after warmup

## Common Issues

### Memory Growing After Warmup
- Check for event listener leaks
- Verify proper cleanup in `dispose()`
- Ensure timers are cleared

### High Baseline Memory
- Review module registration counts
- Check for unnecessary object retention
- Profile with Chrome DevTools

### Flaky Tests
- Memory tests depend on V8 garbage collection timing
- Run multiple times to verify
- Check for environment variables affecting GC
