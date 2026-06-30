/**
 * Vitest config for apps/api.
 *
 * The shared-config import from the workspace root fails under
 * Windows when the workspace path contains a space ("agent os") —
 * the .pnpm resolution chain does not reach the shared file. The
 * packages below the root work because their relative path from
 * `packages/<name>/` to the workspace root is two levels with no
 * intervening space; the apps follow a different layout.
 *
 * Inline the minimal defaults here. When Phase 4.x introduces a
 * proper shared-config resolution, this can re-export the shared
 * defaults again.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['import', 'node', 'node-addons'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    testTimeout: 5000,
    hookTimeout: 5000,
    reporters: ['default'],
  },
});
