/**
 * Centralised defaults and helpers for token-usage arithmetic.
 */
import type { TokenUsage } from './types.js';

export const ZERO_USAGE: TokenUsage = Object.freeze({
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
});

const sum = (a: number, b: number): number => a + b;

export const addTokenUsage = (left: TokenUsage, right: TokenUsage): TokenUsage => ({
  promptTokens: sum(left.promptTokens, right.promptTokens),
  completionTokens: sum(left.completionTokens, right.completionTokens),
  totalTokens: sum(left.totalTokens, right.totalTokens),
});

export const makeTokenUsage = (prompt: number, completion: number): TokenUsage => ({
  promptTokens: prompt,
  completionTokens: completion,
  totalTokens: prompt + completion,
});
