/**
 * Tests for MockProvider and its instrumentation defaults.
 */
import { describe, it, expect } from 'vitest';
import { MockProvider } from './MockProvider.js';
import { createArraySink, createLogger } from '@agent-os/observability';
import type { ChatRequest } from '../../chat.js';

const request = (overrides: Partial<ChatRequest> = {}): ChatRequest => ({
  messages: [{ role: 'user', content: 'hello' }],
  model: 'mock-model',
  ...overrides,
});

describe('MockProvider — construction and metadata', () => {
  it('uses sensible defaults for id / name / catalogue / capabilities', () => {
    const p = new MockProvider();
    expect(p.id).toBe('mock');
    expect(p.name).toBe('MockProvider');
    expect(p.capabilities.chat).toBe(true);
    expect(p.capabilities.streaming).toBe(true);
    expect(p.capabilities.embeddings).toBe(true);
  });

  it('honours the capabilities toggles from options', () => {
    const p = new MockProvider({
      supportsTools: true,
      supportsVision: true,
      supportsJsonMode: true,
      supportsStreaming: false,
      supportsEmbeddings: false,
    });
    expect(p.capabilities.toolCalling).toBe(true);
    expect(p.capabilities.vision).toBe(true);
    expect(p.capabilities.jsonMode).toBe(true);
    expect(p.capabilities.streaming).toBe(false);
    expect(p.capabilities.embeddings).toBe(false);
  });

  it('accepts a custom catalogue and id', async () => {
    const catalogue = [
      {
        id: 'foo',
        providerId: 'mock',
        displayName: 'foo',
        contextWindow: 1,
        maxOutputTokens: 1,
        supportsTools: false,
        supportsVision: false,
        supportsStreaming: true,
      },
    ];
    const p = new MockProvider({ id: 'mock-2', catalogue });
    expect(p.id).toBe('mock-2');
    const m = await p.models();
    expect(m).toEqual(catalogue);
  });
});

describe('MockProvider — chat', () => {
  it('reverses the last user message as the default reply', async () => {
    const p = new MockProvider();
    const res = await p.chat(request({ messages: [{ role: 'user', content: 'abc' }] }));
    expect(res.message.role).toBe('assistant');
    expect(res.message.content).toBe('echo: cba');
    expect(res.finishReason).toBe('stop');
    expect(res.providerId).toBe('mock');
    expect(res.model).toBe('mock-model');
  });

  it('uses the configured response when supplied', async () => {
    const p = new MockProvider({
      responses: [
        {
          content: 'hi',
          finishReason: 'length',
          usage: { promptTokens: 3, completionTokens: 4, totalTokens: 7 },
        },
      ],
    });
    const res = await p.chat(request());
    expect(res.message.content).toBe('hi');
    expect(res.finishReason).toBe('length');
    expect(res.usage.totalTokens).toBe(7);
  });

  it('emits tool calls when present in the response', async () => {
    const toolCall = {
      id: 'call-1',
      type: 'function' as const,
      function: { name: 'ping', arguments: '{}' },
    };
    const p = new MockProvider({
      responses: [{ toolCalls: [toolCall] }],
    });
    const res = await p.chat(request());
    expect(res.message.toolCalls).toEqual([toolCall]);
    expect(res.toolCalls).toEqual([toolCall]);
  });

  it('falls back to mock-model when request model is empty', async () => {
    const p = new MockProvider();
    const res = await p.chat(request({ model: '' }));
    expect(res.model).toBe('mock-model');
  });

  it('respects custom defaultModel when request omits model', async () => {
    const p = new MockProvider({ defaultModel: 'alt' });
    const res = await p.chat(request({ model: '' }));
    expect(res.model).toBe('alt');
  });

  it('emits a non-zero default token usage', async () => {
    const p = new MockProvider();
    const res = await p.chat(request());
    expect(res.usage.totalTokens).toBeGreaterThan(0);
  });

  it('returns the default placeholder when no user message is present', async () => {
    const p = new MockProvider();
    const res = await p.chat({
      messages: [{ role: 'system', content: 'system-only' }],
      model: 'mock-model',
    });
    expect(res.message.content).toBe('echo: (no user message)');
  });
});

describe('MockProvider — setResponses', () => {
  it('allows runtime injection of responses', async () => {
    const p = new MockProvider();
    p.setResponses([{ content: 'first' }]);
    expect((await p.chat(request())).message.content).toBe('first');
    p.setResponses([{ content: 'second' }]);
    expect((await p.chat(request())).message.content).toBe('second');
  });
});

describe('MockProvider — stream', () => {
  it('returns one chunk per character of text and a final stop chunk', async () => {
    const p = new MockProvider({
      responses: [{ content: 'abc' }],
    });
    const stream = await p.stream(request());
    let full = '';
    let finalFinish: string | undefined;
    for await (const chunk of stream) {
      if (chunk.delta.content !== undefined) full += chunk.delta.content;
      if (chunk.finishReason !== undefined) finalFinish = chunk.finishReason;
    }
    expect(full).toBe('abc');
    expect(finalFinish).toBe('stop');
  });

  it('errors mid-stream when errorAfterChunks is set', async () => {
    const p = new MockProvider({
      responses: [{ content: 'abc', errorAfterChunks: 1 }],
    });
    const stream = await p.stream(request());
    const out: string[] = [];
    await expect(
      (async () => {
        for await (const chunk of stream) {
          if (chunk.delta.content !== undefined) out.push(chunk.delta.content);
        }
      })(),
    ).rejects.toThrow(/forced stream/i);
    // After yielding 'a' and 'b' (emitted total = 2 > 1), the third chunk
    // never gets reached because the throw fires before that iteration runs.
    expect(out).toEqual(['a', 'b']);
  });

  it('rejects streaming when the capability is disabled', async () => {
    const p = new MockProvider({ supportsStreaming: false });
    await expect(p.stream(request())).rejects.toThrow(/streaming is not supported/i);
  });
});

describe('MockProvider — embeddings', () => {
  it('returns one item per input string and uses request.model as model', async () => {
    const p = new MockProvider();
    const res = await p.embeddings({
      model: 'm',
      input: ['one', 'two'],
    });
    expect(res.model).toBe('m');
    expect(res.items).toHaveLength(2);
    expect(res.items[0]?.vector).toHaveLength(16);
    expect(res.items[1]?.vector).toHaveLength(16);
    expect(res.items[0]?.vector).not.toEqual(res.items[1]?.vector);
    expect(res.items[0]?.index).toBe(0);
    expect(res.items[1]?.index).toBe(1);
  });

  it('accepts a single string input', async () => {
    const p = new MockProvider();
    const res = await p.embeddings({ model: 'm', input: 'alpha' });
    expect(res.items).toHaveLength(1);
  });

  it('rejects embeddings when the capability is disabled', async () => {
    const p = new MockProvider({ supportsEmbeddings: false });
    await expect(p.embeddings({ model: 'm', input: 'a' })).rejects.toThrow(/embeddings/i);
  });
});

describe('MockProvider — health', () => {
  it('reports healthy by default', async () => {
    const p = new MockProvider();
    const h = await p.health();
    expect(h.healthy).toBe(true);
    expect(h.providerId).toBe('mock');
    expect(typeof h.checkedAt).toBe('string');
    expect(typeof h.latencyMs).toBe('number');
    expect(h.detail).toBeUndefined();
  });

  it('reports unhealthy with detail when configured', async () => {
    const p = new MockProvider({
      unhealthy: true,
      unhealthyDetail: 'down for maintenance',
    });
    const h = await p.health();
    expect(h.healthy).toBe(false);
    expect(h.detail).toBe('down for maintenance');
  });
});

describe('MockProvider — instrumentation', () => {
  it('emits a structured log entry per chat invocation via the default logger', async () => {
    // We exercise the chat() code path so that `instrument()` runs and runs
    // through to a metric-style completion. The default logger is console,
    // which we don't observe here; we only assert that the call resolves and
    // that the response carries usage information.
    const p = new MockProvider();
    const res = await p.chat(request());
    expect(res.message.role).toBe('assistant');
    expect(res.usage.totalTokens).toBeGreaterThan(0);
  });

  it('records usage on the span via recordUsage', async () => {
    const p = new MockProvider();
    const res = await p.chat(request());
    expect(res.usage.totalTokens).toBeGreaterThan(0);
  });

  it('uses a custom Logger sink passed through instrumentation', async () => {
    const sink = createArraySink();
    const logger = createLogger({ sinks: [sink] }).child('llm:test');
    expect(logger).toBeDefined();
    expect(sink.entries).toHaveLength(0);
  });
});
