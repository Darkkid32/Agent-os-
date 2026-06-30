/**
 * Adapter benchmarks.
 *
 * Measures: adapter initialization, request parsing, response generation.
 * Uses lightweight operations without network I/O.
 */

import { bench, describe } from 'vitest';
import { createBenchLogger } from './utils.js';

const logger = createBenchLogger();

// ---------------------------------------------------------------------------
// Webhook adapter (simplest to benchmark without network)
// ---------------------------------------------------------------------------

describe('Adapter: Webhook', () => {
  bench('WebhookAdapter instantiation', async () => {
    const mod = (await import('@agent-os/adapters-webhook')) as unknown as {
      WebhookAdapter: new (config: Record<string, unknown>) => unknown;
    };
    new mod.WebhookAdapter({
      port: 0,
      path: '/webhook',
      logger,
    });
  });

  bench('WebhookAdapter parse POST payload', async () => {
    const payload = JSON.stringify({
      event: 'message',
      data: { content: 'Hello, world!', sender: 'user-123', channel: 'general' },
      timestamp: Date.now(),
    });
    JSON.parse(payload);
  });
});

// ---------------------------------------------------------------------------
// CLI adapter
// ---------------------------------------------------------------------------

describe('Adapter: CLI', () => {
  bench('CLI adapter creation', async () => {
    const mod = (await import('@agent-os/adapters-cli')) as unknown as {
      createCliAdapter: (config: Record<string, unknown>) => unknown;
    };
    mod.createCliAdapter({ logger });
  });
});

// ---------------------------------------------------------------------------
// Request/Response pattern benchmarks
// ---------------------------------------------------------------------------

describe('Adapter: Request Patterns', () => {
  const mockRequest = {
    method: 'POST',
    url: '/api/v1/commands',
    headers: {
      'content-type': 'application/json',
      'x-request-id': 'req-123',
      'x-correlation-id': 'corr-456',
      authorization: 'Bearer test-token',
    },
    body: JSON.stringify({
      command: 'execute',
      args: { agentId: 'agent-1', input: 'test input' },
    }),
  };

  bench('JSON.parse (small payload)', () => {
    JSON.parse(mockRequest.body);
  });

  bench('JSON.parse (large payload)', () => {
    const largePayload = JSON.stringify({
      data: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `item-${i}`,
        value: Math.random(),
        tags: ['a', 'b', 'c'],
      })),
    });
    JSON.parse(largePayload);
  });

  bench('JSON.stringify (small object)', () => {
    JSON.stringify({ status: 'ok', data: { count: 42 } });
  });

  bench('JSON.stringify (large object)', () => {
    const obj = {
      data: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `item-${i}`,
        value: Math.random(),
        tags: ['a', 'b', 'c'],
      })),
    };
    JSON.stringify(obj);
  });

  bench('Header parsing', () => {
    const headers = mockRequest.headers;
    const contentType = headers['content-type'];
    const requestId = headers['x-request-id'];
    const correlationId = headers['x-correlation-id'];
    const authHeader = headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    void contentType;
    void requestId;
    void correlationId;
    void token;
  });
});
