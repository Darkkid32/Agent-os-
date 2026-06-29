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
// `defineConfig` lives in vitest/config. We import it via a loose `any`
// because Vitest's InlineConfig type uses readonly tuples / arrays
// internally and the strict-mode spread of our defaults fails type
// checks. The runtime contract is what matters here; each package's
// vitest.config.ts is the actual executable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import * as vitestConfig from 'vitest/config';
const defineConfig = (vitestConfig as { defineConfig: typeof vitestConfig.defineConfig })
  .defineConfig;

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
    exclude: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'src/test-utils/**',
      'dist/**',
    ],
  },
};

/**
 * Convenience helper to layer shared defaults under package-specific
 * overrides.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const defineSharedTestConfig = (overrides: { test?: Record<string, any> } = {}) =>
  defineConfig({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    test: ({ ...sharedTestDefaults, ...(overrides.test ?? {}) }) as any,
  });
