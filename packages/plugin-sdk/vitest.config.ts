import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@agent-os/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@agent-os/core/*': path.resolve(__dirname, '../core/src/*'),
      '@agent-os/plugins': path.resolve(__dirname, '../plugins/src/index.ts'),
      '@agent-os/plugins/*': path.resolve(__dirname, '../plugins/src/*'),
      '@agent-os/observability': path.resolve(__dirname, '../observability/src/index.ts'),
      '@agent-os/observability/*': path.resolve(__dirname, '../observability/src/*'),
      '@agent-os/event-bus': path.resolve(__dirname, '../event-bus/src/index.ts'),
      '@agent-os/event-bus/*': path.resolve(__dirname, '../event-bus/src/*'),
    },
  },
});
