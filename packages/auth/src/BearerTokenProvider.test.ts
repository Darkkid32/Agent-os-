import { describe, it, expect } from 'vitest';
import { createBearerTokenProvider } from './BearerTokenProvider.js';

describe('createBearerTokenProvider', () => {
  const provider = createBearerTokenProvider({
    tokens: [
      { token: 'admin-bearer', role: 'admin', id: 'svc-1' },
      { token: 'viewer-bearer', role: 'viewer', id: 'svc-2' },
    ],
  });

  it('has name "bearer-token"', () => {
    expect(provider.name).toBe('bearer-token');
  });

  it('authenticates admin token', async () => {
    const result = await provider.authenticate('admin-bearer');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.subject.id).toBe('svc-1');
      expect(result.subject.role).toBe('admin');
      expect(result.subject.method).toBe('bearer-token');
    }
  });

  it('authenticates viewer token', async () => {
    const result = await provider.authenticate('viewer-bearer');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.subject.id).toBe('svc-2');
      expect(result.subject.role).toBe('viewer');
    }
  });

  it('rejects invalid token', async () => {
    const result = await provider.authenticate('invalid');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('Invalid bearer token');
    }
  });
});
