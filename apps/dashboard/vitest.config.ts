/**
 * Vitest config for apps/dashboard.
 *
 * Uses Node's built-in test environment (jsdom-like behavior not
 * needed for the integration suite covering the dashboard's API
 * provider). The shared vitest config import fails for apps the
 * same way it does for apps/api — see apps/api/vitest.config.ts.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['import', 'node', 'node-addons'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'src/**/*.test.tsx', 'src/**/*.spec.tsx'],
    exclude: ['dist/**', 'node_modules/**', '.next/**'],
    testTimeout: 5000,
    hookTimeout: 5000,
    reporters: ['default'],
  },
});
