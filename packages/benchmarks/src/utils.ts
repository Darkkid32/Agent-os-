/**
 * Shared utilities for benchmark setup and teardown.
 */

import { createLogger, createNullSink, type Logger } from '@agent-os/observability';

export const createBenchLogger = (): Logger =>
  createLogger({
    minLevel: 'fatal',
    sinks: [createNullSink()],
  });

export const generateApiKey = (length = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const measureHeapMb = (): number => {
  global.gc?.();
  return Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
