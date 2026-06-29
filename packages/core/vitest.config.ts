import { defineConfig, mergeConfig } from 'vitest/config';
import { sharedTestDefaults } from '../../vitest.shared.js';

export default mergeConfig(
  defineConfig({
    test: {
      include: ['src/**/*.{test,spec}.ts'],
    },
  }),
  defineConfig({
    test: { ...sharedTestDefaults },
  }),
);
