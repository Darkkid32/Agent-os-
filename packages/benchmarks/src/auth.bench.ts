/**
 * Authentication benchmarks.
 *
 * Measures: API key validation, bearer token validation, permission checks.
 */

import { bench, describe } from 'vitest';
import { createApiKeyProvider, createBearerTokenProvider, canHttp } from '@agent-os/auth';
import { generateApiKey } from './utils.js';

const API_KEYS = Array.from({ length: 100 }, (_, i) => ({
  key: generateApiKey(64),
  role: (i % 2 === 0 ? 'admin' : 'viewer') as 'admin' | 'viewer',
  id: `key-${i}`,
}));

const BEARER_TOKENS = Array.from({ length: 100 }, (_, i) => ({
  token: generateApiKey(128),
  role: (i % 2 === 0 ? 'admin' : 'viewer') as 'admin' | 'viewer',
  id: `token-${i}`,
}));

const apiKeyProvider = createApiKeyProvider({ keys: API_KEYS });
const bearerProvider = createBearerTokenProvider({ tokens: BEARER_TOKENS });

describe('Authentication', () => {
  bench('API key validation (valid key)', async () => {
    const firstKey = API_KEYS[0];
    if (firstKey) await apiKeyProvider.authenticate(firstKey.key);
  });

  bench('API key validation (invalid key)', async () => {
    await apiKeyProvider.authenticate('nonexistent-key');
  });

  bench('API key validation (100 keys, random lookup)', async () => {
    const idx = Math.floor(Math.random() * API_KEYS.length);
    const key = API_KEYS[idx];
    if (key) await apiKeyProvider.authenticate(key.key);
  });

  bench('Bearer token validation (valid token)', async () => {
    const firstToken = BEARER_TOKENS[0];
    if (firstToken) await bearerProvider.authenticate(firstToken.token);
  });

  bench('Bearer token validation (invalid token)', async () => {
    await bearerProvider.authenticate('nonexistent-token');
  });

  bench('Bearer token validation (100 tokens, random lookup)', async () => {
    const idx = Math.floor(Math.random() * BEARER_TOKENS.length);
    const token = BEARER_TOKENS[idx];
    if (token) await bearerProvider.authenticate(token.token);
  });

  bench('canHttp (admin, all actions)', () => {
    const actions = [
      'start',
      'stop',
      'restart',
      'health',
      'status',
      'config',
      'plugins',
      'admin',
      'modules',
      'version',
    ] as const;
    for (const action of actions) {
      canHttp('admin', action);
    }
  });

  bench('canHttp (viewer, read-only actions)', () => {
    const actions = ['health', 'status', 'version'] as const;
    for (const action of actions) {
      canHttp('viewer', action);
    }
  });
});
