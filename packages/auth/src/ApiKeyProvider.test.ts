import { describe, it, expect } from 'vitest';
import { createApiKeyProvider } from './ApiKeyProvider.js';

describe('createApiKeyProvider', () => {
  const provider = createApiKeyProvider({
    keys: [
      { key: 'admin-key-123', role: 'admin', id: 'admin-1' },
      { key: 'viewer-key-456', role: 'viewer', id: 'viewer-1', metadata: { team: 'platform' } },
    ],
  });

  it('has name "api-key"', () => {
    expect(provider.name).toBe('api-key');
  });

  it('authenticates admin key', async () => {
    const result = await provider.authenticate('admin-key-123');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.subject.id).toBe('admin-1');
      expect(result.subject.role).toBe('admin');
      expect(result.subject.method).toBe('api-key');
    }
  });

  it('authenticates viewer key with metadata', async () => {
    const result = await provider.authenticate('viewer-key-456');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.subject.id).toBe('viewer-1');
      expect(result.subject.role).toBe('viewer');
      expect(result.subject.metadata).toEqual({ team: 'platform' });
    }
  });

  it('rejects invalid key', async () => {
    const result = await provider.authenticate('invalid-key');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('Invalid API key');
    }
  });

  it('rejects empty credential', async () => {
    const result = await provider.authenticate('');
    expect(result.ok).toBe(false);
  });
});
