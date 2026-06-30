import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['import', 'node', 'node-addons'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**', 'node_modules/**', '**/*.bench.ts'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    reporters: ['default'],
    benchmark: {
      include: ['src/**/*.bench.ts'],
      exclude: ['dist/**', 'node_modules/**'],
      reporters: ['default'],
    },
  },
});
