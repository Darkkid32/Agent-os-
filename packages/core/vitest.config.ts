import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    testTimeout: 5000,
    hookTimeout: 5000,
    reporters: ['default'],
  },
});
