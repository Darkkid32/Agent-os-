import { describe, it, expect } from 'vitest';
import { safeCompare } from './credentials.js';

describe('safeCompare', () => {
  it('returns true for equal strings', () => {
    expect(safeCompare('hello', 'hello')).toBe(true);
  });

  it('returns false for different strings', () => {
    expect(safeCompare('hello', 'world')).toBe(false);
  });

  it('returns false for different length strings', () => {
    expect(safeCompare('hello', 'hello world')).toBe(false);
  });

  it('returns true for empty strings', () => {
    expect(safeCompare('', '')).toBe(true);
  });

  it('returns false for empty vs non-empty', () => {
    expect(safeCompare('', 'a')).toBe(false);
  });

  it('handles unicode correctly', () => {
    expect(safeCompare('hello', 'hello')).toBe(true);
    expect(safeCompare('hello', 'héllo')).toBe(false);
  });

  it('handles long strings', () => {
    const long = 'a'.repeat(10000);
    expect(safeCompare(long, long)).toBe(true);
    expect(safeCompare(long, long + 'b')).toBe(false);
  });
});
