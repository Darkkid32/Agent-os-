import { defineConfig } from 'vitest/config';
import { sharedTestDefaults } from '../../vitest.shared.js';

export default defineConfig({
  ...sharedTestDefaults,
  resolve: {
    conditions: ['import', 'node', 'node-addons'],
  },
  test: {
    ...sharedTestDefaults,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    coverage: {
      include: ['src/**/*.ts'],
      // type-only modules have no executable statements in v8 coverage;
      // excluding them keeps the metric focused on runnable logic.
      exclude: [
        'src/index.ts',
        'src/types.ts',
        'src/chat.ts',
        'src/embeddings.ts',
        'src/**/index.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
      ],
    },
  },
});
