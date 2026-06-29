/**
 * Shared Vitest configuration.
 *
 * Every package's `vitest.config.ts` imports this and re-uses it. The
 * defaults are kept narrow so adapter packages don't inherit coverage
 * thresholds or extra reporters they don't want.
 *
 * We deliberately do NOT enable `globals: true` — test files must
 * import `describe`, `it`, `expect`, `vi` explicitly. That keeps the
 * ESLint preset happy without `vitest/globals` rule knowledge.
 */
import { defineConfig } from 'vitest/config';

export const sharedTestDefaults = {
  environment: 'node' as const,
  include: ['src/**/*.{test,spec}.ts'],
  exclude: ['dist/**', 'node_modules/**'],
  testTimeout: 5000,
  hookTimeout: 5000,
  reporters: ['default'] as const,
  coverage: {
    provider: 'v8' as const,
    reporter: ['text', 'json-summary'] as const,
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/test-utils/**', 'dist/**'],
  },
};

/**
 * Convenience helper to layer shared defaults under package-specific
 * overrides. Re-exported as the canonical typed `defineConfig` from
 * vitest/config.
 */
export { defineConfig };
