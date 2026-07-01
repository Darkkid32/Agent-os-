/**
 * Tests for the LLMProvider interface helpers.
 */
import { describe, it, expect } from 'vitest';
import { supportsCapability } from './provider.js';
import { MockProvider } from './providers/mock/MockProvider.js';

describe('supportsCapability', () => {
  it('returns true for an enabled capability', () => {
    const p = new MockProvider({ supportsStreaming: true });
    expect(supportsCapability(p, 'streaming')).toBe(true);
  });

  it('returns false for a disabled capability', () => {
    const p = new MockProvider({ supportsStreaming: false });
    expect(supportsCapability(p, 'streaming')).toBe(false);
  });

  it('supports every capability key', () => {
    const p = new MockProvider({
      supportsEmbedding: true, // invalid prop on purpose
      supportsStreaming: false,
      supportsTools: true,
      supportsVision: true,
      supportsJsonMode: true,
      supportsEmbeddings: true,
    } as never);
    expect(supportsCapability(p, 'chat')).toBe(true);
    expect(supportsCapability(p, 'embeddings')).toBe(true);
    expect(supportsCapability(p, 'toolCalling')).toBe(true);
    expect(supportsCapability(p, 'vision')).toBe(true);
    expect(supportsCapability(p, 'jsonMode')).toBe(true);
    expect(supportsCapability(p, 'streaming')).toBe(false);
  });
});
