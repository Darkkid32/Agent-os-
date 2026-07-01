/**
 * Tests for the observability instrumentation helpers.
 */
import { describe, it, expect } from 'vitest';
import { instrument, recordUsage } from './observability.js';
import { ProviderUnavailable } from './errors.js';

describe('instrument', () => {
  it('calls the fn and returns its value', async () => {
    const result = await instrument({ providerId: 'p', operation: 'chat' }, async () => 42);
    expect(result).toBe(42);
  });

  it('passes the span to the fn and logs on failure', async () => {
    await expect(
      instrument({ providerId: 'p', operation: 'chat', model: 'm' }, async () => {
        throw new ProviderUnavailable('p', 'down');
      }),
    ).rejects.toBeInstanceOf(ProviderUnavailable);
  });

  it('attaches the model attribute when provided', async () => {
    const captured: unknown[] = [];
    await instrument({ providerId: 'p', operation: 'chat', model: 'm' }, async (span) => {
      captured.push(span);
      return span;
    });
    expect(captured).toHaveLength(1);
  });

  it('does not pass model when undefined', async () => {
    const captured: unknown[] = [];
    await instrument({ providerId: 'p', operation: 'chat' }, async (span) => {
      captured.push(span);
      return span;
    });
    expect(captured).toHaveLength(1);
  });
});

describe('recordUsage', () => {
  it('does nothing when usage is undefined', () => {
    const fakeSpan = {
      setAttribute: () => fakeSpan,
      spanContext: () => ({
        traceId: '00000000000000000000000000000000',
        spanId: '0000000000000000',
        traceFlags: 1,
      }),
      setAttributes: () => fakeSpan,
      addEvent: () => fakeSpan,
      addLink: () => fakeSpan,
      addLinks: () => fakeSpan,
      setStatus: () => fakeSpan,
      updateName: () => fakeSpan,
      end: () => {},
      isRecording: () => false,
      recordException: () => {},
    };
    expect(() => recordUsage(fakeSpan as never, undefined)).not.toThrow();
  });

  it('writes usage attributes onto the span', () => {
    const calls: Array<[string, string]> = [];
    const fakeSpan = {
      setAttribute: (k: string, v: string) => {
        calls.push([k, v]);
        return fakeSpan;
      },
      spanContext: () => ({
        traceId: '00000000000000000000000000000000',
        spanId: '0000000000000000',
        traceFlags: 1,
      }),
      setAttributes: () => fakeSpan,
      addEvent: () => fakeSpan,
      addLink: () => fakeSpan,
      addLinks: () => fakeSpan,
      setStatus: () => fakeSpan,
      updateName: () => fakeSpan,
      end: () => {},
      isRecording: () => false,
      recordException: () => {},
    };
    recordUsage(fakeSpan, { promptTokens: 1, completionTokens: 2, totalTokens: 3 });
    expect(calls).toEqual([
      ['llm.usage.prompt_tokens', '1'],
      ['llm.usage.completion_tokens', '2'],
      ['llm.usage.total_tokens', '3'],
    ]);
  });
});
