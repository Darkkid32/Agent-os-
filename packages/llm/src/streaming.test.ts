/**
 * Tests for streaming helpers.
 */
import { describe, it, expect } from 'vitest';
import { accumulateChatChunks, withAbortSignal } from './streaming.js';
import { ProviderUnavailable } from './errors.js';
import type { ChatChunk, ChatRequest } from './chat.js';

const chunk = (
  partial: Partial<ChatChunk> & {
    delta: Partial<ChatChunk['delta']>;
  },
): ChatChunk => ({
  id: partial.id ?? 'id',
  providerId: partial.providerId ?? 'mock',
  model: partial.model ?? 'm',
  delta: {
    ...(partial.delta.role !== undefined ? { role: partial.delta.role } : {}),
    ...(partial.delta.content !== undefined ? { content: partial.delta.content } : {}),
    ...(partial.delta.toolCalls !== undefined ? { toolCalls: partial.delta.toolCalls } : {}),
  } as ChatChunk['delta'],
  ...(partial.finishReason !== undefined ? { finishReason: partial.finishReason } : {}),
  ...(partial.usage !== undefined ? { usage: partial.usage } : {}),
});

async function* from<T>(values: readonly T[]): AsyncIterable<T> {
  for (const v of values) yield v;
}

const baseRequest: ChatRequest = {
  messages: [{ role: 'user', content: 'hi' }],
  model: 'mock-model',
};

describe('accumulateChatChunks', () => {
  it('returns InvalidRequest error for an empty stream', async () => {
    await expect(accumulateChatChunks(baseRequest, from([]))).rejects.toThrow(/zero chunks/i);
  });

  it('concatenates content deltas into a single assistant message', async () => {
    const { response } = await accumulateChatChunks(
      baseRequest,
      from([
        chunk({ delta: { role: 'assistant', content: 'hel' } }),
        chunk({ delta: { content: 'lo world' }, finishReason: 'stop' }),
      ]),
    );
    expect(response.message.role).toBe('assistant');
    expect(response.message.content).toBe('hello world');
    expect(response.finishReason).toBe('stop');
    expect(response.providerId).toBe('mock');
    expect(response.model).toBe('m');
  });

  it('merges tool-call deltas by index', async () => {
    const { response } = await accumulateChatChunks(
      baseRequest,
      from([
        chunk({ delta: { role: 'assistant' } }),
        chunk({
          delta: {
            toolCalls: [
              { index: 0, id: 'call-1', type: 'function', function: { name: 'getW' } },
              { index: 0, type: 'function', function: { arguments: 'eather' } },
            ],
          },
        }),
        chunk({
          delta: {
            toolCalls: [{ index: 0, type: 'function', function: { arguments: 'Data' } }],
          },
        }),
      ]),
    );
    const toolCallsFinal = response.message.toolCalls;
    expect(toolCallsFinal).toBeDefined();
    if (!toolCallsFinal) throw new Error('expected toolCalls');
    expect(toolCallsFinal).toHaveLength(1);
    expect(toolCallsFinal[0]?.id).toBe('call-1');
    expect(toolCallsFinal[0]?.function.name).toBe('getW'); // first delta with name wins
    expect(toolCallsFinal[0]?.function.arguments).toBe('eatherData');
  });

  it('aggregates usage across chunks preferring the last non-zero', async () => {
    const { response } = await accumulateChatChunks(
      baseRequest,
      from([
        chunk({ delta: { role: 'assistant', content: 'a' } }),
        chunk({
          delta: { content: 'b' },
          finishReason: 'stop',
          usage: { promptTokens: 5, completionTokens: 7, totalTokens: 12 },
        }),
      ]),
    );
    expect(response.usage).toEqual({ promptTokens: 5, completionTokens: 7, totalTokens: 12 });
  });

  it('uses the first chunk id and model', async () => {
    const { response } = await accumulateChatChunks(
      baseRequest,
      from([
        chunk({ id: 'first-id', model: 'first-model', delta: { role: 'assistant' } }),
        chunk({ id: 'second-id', model: 'second-model', delta: { content: 'x' } }),
      ]),
    );
    expect(response.id).toBe('first-id');
    expect(response.model).toBe('first-model');
  });
});

describe('withAbortSignal', () => {
  it('throws InvalidRequest when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(withAbortSignal(from([1, 2]), controller.signal)).rejects.toThrow(/cancelled/i);
  });

  it('returns silently when no signal is supplied', async () => {
    await expect(withAbortSignal(from([1, 2]), undefined)).resolves.toBeUndefined();
  });

  it('proxies values when not aborted', async () => {
    const controller = new AbortController();
    await expect(withAbortSignal(from([1, 2, 3]), controller.signal)).resolves.toBeUndefined();
  });

  it('bubbles underlying errors', async () => {
    const controller = new AbortController();
    const source = (async function* () {
      yield 1;
      throw new ProviderUnavailable('p', 'down');
    })();
    await expect(withAbortSignal(source, controller.signal)).rejects.toThrow(/down/i);
  });

  it('throws InvalidRequest when aborted mid-stream', async () => {
    const controller = new AbortController();
    const source = (async function* () {
      yield 1;
      controller.abort();
      yield 2;
    })();
    await expect(withAbortSignal(source, controller.signal)).rejects.toThrow(/cancelled mid/i);
  });
});

describe('accumulateChatChunks — invalid tool-call deltas', () => {
  it('throws InvalidRequest when a tool delta has no id and no name', async () => {
    await expect(
      accumulateChatChunks(
        { messages: [{ role: 'user', content: 'x' }], model: 'mock-model' },
        from([
          chunk({
            delta: {
              role: 'assistant',
              toolCalls: [{ index: 0, type: 'function', function: { arguments: 'oops' } }],
            },
          }),
        ]),
      ),
    ).rejects.toThrow(/missing id or name/i);
  });
});
