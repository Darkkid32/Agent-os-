/**
 * Tests for token usage helpers.
 */
import { describe, it, expect } from 'vitest';
import { ZERO_USAGE, addTokenUsage, makeTokenUsage } from './tokens.js';

describe('tokens', () => {
  it('ZERO_USAGE exposes zero defaults', () => {
    expect(ZERO_USAGE.promptTokens).toBe(0);
    expect(ZERO_USAGE.completionTokens).toBe(0);
    expect(ZERO_USAGE.totalTokens).toBe(0);
    expect(Object.isFrozen(ZERO_USAGE)).toBe(true);
  });

  it('addTokenUsage sums two usages (totals are independently derived)', () => {
    const a = makeTokenUsage(1, 2);
    const b = makeTokenUsage(4, 5);
    const sum = addTokenUsage(a, b);
    expect(sum.promptTokens).toBe(5);
    expect(sum.completionTokens).toBe(7);
    // Note: makeTokenUsage sets total = prompt + completion, and addTokenUsage
    // sums totals independently: 3 + 9 = 12 (not the sum of prompts + completions).
    expect(sum.totalTokens).toBe(12);
  });

  it('makeTokenUsage derives total from prompt + completion', () => {
    const u = makeTokenUsage(3, 4);
    expect(u).toEqual({ promptTokens: 3, completionTokens: 4, totalTokens: 7 });
  });

  it('addTokenUsage accumulates across three operands', () => {
    const a = makeTokenUsage(1, 1);
    const b = makeTokenUsage(2, 2);
    const c = makeTokenUsage(3, 4);
    const sum = addTokenUsage(addTokenUsage(a, b), c);
    expect(sum.promptTokens).toBe(6);
    expect(sum.completionTokens).toBe(7);
    // 2 + 4 + 7 = 13 (totals are summed independently of the prompt+completion pair)
    expect(sum.totalTokens).toBe(13);
  });
});
