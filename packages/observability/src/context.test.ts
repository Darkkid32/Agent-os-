import { describe, it, expect } from 'vitest';
import {
  runWithContext,
  currentContext,
  generateRequestId,
  generateCorrelationId,
  createContext,
} from './context.js';

describe('observability context', () => {
  describe('generateRequestId', () => {
    it('returns a UUID v4 string', () => {
      const id = generateRequestId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('generates unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('generateCorrelationId', () => {
    it('returns a UUID v4 string', () => {
      const id = generateCorrelationId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('createContext', () => {
    it('generates both request and correlation IDs', () => {
      const ctx = createContext();
      expect(ctx.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(ctx.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('uses supplied correlation ID when provided', () => {
      const supplied = 'custom-corr-id';
      const ctx = createContext(supplied);
      expect(ctx.correlationId).toBe(supplied);
    });
  });

  describe('runWithContext / currentContext', () => {
    it('returns undefined when no context is active', () => {
      expect(currentContext()).toBeUndefined();
    });

    it('sets and retrieves context', () => {
      const ctx = { requestId: 'req-1', correlationId: 'corr-1' };
      const result = runWithContext(ctx, () => currentContext());
      expect(result).toEqual(ctx);
    });

    it('nests contexts correctly', () => {
      const outer = { requestId: 'req-outer', correlationId: 'corr-outer' };
      const inner = { requestId: 'req-inner', correlationId: 'corr-inner' };

      const result = runWithContext(outer, () => {
        expect(currentContext()).toEqual(outer);
        return runWithContext(inner, () => currentContext());
      });

      expect(result).toEqual(inner);
    });

    it('propagates context to async calls', async () => {
      const ctx = { requestId: 'req-async', correlationId: 'corr-async' };
      const result = runWithContext(ctx, () => Promise.resolve().then(() => currentContext()));
      expect(await result).toEqual(ctx);
    });

    it('returns the function result', () => {
      const ctx = { requestId: 'r', correlationId: 'c' };
      const result = runWithContext(ctx, () => 42);
      expect(result).toBe(42);
    });
  });
});
