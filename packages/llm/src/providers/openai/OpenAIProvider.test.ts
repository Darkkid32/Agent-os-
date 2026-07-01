/**
 * Tests for OpenAIProvider — uses vi.mock to stub the openai SDK.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Build a fake OpenAI client. The provider only uses
// `client.chat.completions.create()`, `client.embeddings.create()`,
// and `client.models.list()`.
const fakeChat = {
  create: vi.fn(),
};
const fakeEmbeddings = {
  create: vi.fn(),
};
const fakeModels = {
  list: vi.fn(),
};

const fakeClient = {
  chat: { completions: fakeChat },
  embeddings: fakeEmbeddings,
  models: fakeModels,
};

vi.mock('openai', () => {
  return {
    default: vi.fn(function () {
      return fakeClient;
    }),
  };
});

// Import after vi.mock so the provider picks up the fake constructor.
import OpenAI from 'openai';
import { OpenAIProvider } from './OpenAIProvider.js';
import { AuthenticationFailed } from '../../errors.js';

describe('OpenAIProvider — construction', () => {
  beforeEach(() => {
    fakeChat.create.mockReset();
    fakeEmbeddings.create.mockReset();
    fakeModels.list.mockReset();
  });

  it('throws AuthenticationFailed when no apiKey is provided', () => {
    expect(
      () =>
        new OpenAIProvider({
          apiKey: '',
        }),
    ).toThrow(AuthenticationFailed);
  });

  it('passes apiKey, baseUrl, organization, and timeout to the SDK constructor', () => {
    const Spy = OpenAI as unknown as ReturnType<typeof vi.fn>;
    Spy.mockClear();
    new OpenAIProvider({
      apiKey: 'sk-test',
      baseUrl: 'https://example.com',
      organization: 'org-1',
      timeoutMs: 12345,
    });
    expect(Spy).toHaveBeenCalledTimes(1);
    const args = Spy.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(args?.['apiKey']).toBe('sk-test');
    expect(args?.['baseURL']).toBe('https://example.com');
    expect(args?.['organization']).toBe('org-1');
    expect(args?.['timeout']).toBe(12345);
  });

  it('uses the default model and timeout when not supplied', () => {
    const Spy = OpenAI as unknown as ReturnType<typeof vi.fn>;
    Spy.mockClear();
    new OpenAIProvider({ apiKey: 'sk-test' });
    const args = Spy.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(args?.['timeout']).toBe(30000);
    expect(args?.['baseURL']).toBeUndefined();
    expect(args?.['organization']).toBeUndefined();
  });

  it('exposes capabilities, id, and a non-empty catalogue', async () => {
    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    expect(provider.id).toBe('openai');
    expect(provider.name).toBe('OpenAI');
    expect(provider.capabilities.streaming).toBe(true);
    expect(provider.capabilities.toolCalling).toBe(true);
    const models = await provider.models();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]?.providerId).toBe('openai');
  });
});

describe('OpenAIProvider — chat', () => {
  beforeEach(() => {
    fakeChat.create.mockReset();
    fakeEmbeddings.create.mockReset();
    fakeModels.list.mockReset();
  });

  it('returns a parsed response', async () => {
    fakeChat.create.mockResolvedValueOnce({
      id: 'chat-1',
      model: 'gpt-4o',
      choices: [
        {
          finish_reason: 'stop',
          message: {
            role: 'assistant',
            content: 'hello world',
            tool_calls: undefined,
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });

    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    const res = await provider.chat({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'gpt-4o',
    });
    expect(res.id).toBe('chat-1');
    expect(res.message.content).toBe('hello world');
    expect(res.message.role).toBe('assistant');
    expect(res.usage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });
    expect(res.finishReason).toBe('stop');
  });

  it('returns tool calls when the SDK surfaces them', async () => {
    fakeChat.create.mockResolvedValueOnce({
      id: 'chat-2',
      model: 'gpt-4o',
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'tc-1',
                type: 'function',
                function: { name: 'ping', arguments: '{}' },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });

    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    const res = await provider.chat({
      messages: [{ role: 'user', content: 'go' }],
      model: 'gpt-4o',
    });
    expect(res.message.toolCalls).toEqual([
      {
        id: 'tc-1',
        type: 'function',
        function: { name: 'ping', arguments: '{}' },
      },
    ]);
    expect(res.finishReason).toBe('tool_calls');
  });

  it('forwards tools and tool choice to the SDK', async () => {
    fakeChat.create.mockResolvedValueOnce({
      id: 'chat-3',
      model: 'gpt-4o',
      choices: [
        {
          finish_reason: 'stop',
          message: { role: 'assistant', content: 'ok', tool_calls: undefined },
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });

    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    await provider.chat({
      messages: [{ role: 'user', content: 'help' }],
      model: 'gpt-4o',
      tools: [
        {
          type: 'function',
          function: {
            name: 'lookup',
            description: 'Look things up',
            parameters: { type: 'object' },
          },
        },
      ],
      toolChoice: 'required',
    });
    expect(fakeChat.create).toHaveBeenCalledTimes(1);
    const call = fakeChat.create.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(call?.['tools']).toEqual([
      {
        type: 'function',
        function: {
          name: 'lookup',
          description: 'Look things up',
          parameters: { type: 'object' },
        },
      },
    ]);
    expect(call?.['tool_choice']).toBe('required');
  });

  it('maps a structured tool_choice name into a function tool_choice', async () => {
    fakeChat.create.mockResolvedValueOnce({
      id: 'chat-tool',
      model: 'gpt-4o',
      choices: [
        {
          finish_reason: 'stop',
          message: { role: 'assistant', content: 'ok', tool_calls: undefined },
        },
      ],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    });
    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    await provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      model: 'gpt-4o',
      toolChoice: { name: 'lookup' },
    });
    const call = fakeChat.create.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(call?.['tool_choice']).toEqual({ type: 'function', function: { name: 'lookup' } });
  });

  it('translates tool and assistant tool_calls messages to SDK format', async () => {
    fakeChat.create.mockResolvedValueOnce({
      id: 'chat-tools',
      model: 'gpt-4o',
      choices: [
        {
          finish_reason: 'stop',
          message: { role: 'assistant', content: 'done', tool_calls: undefined },
        },
      ],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    });
    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    await provider.chat({
      messages: [
        {
          role: 'tool',
          content: 'tool-out',
          toolCallId: 'tc-1',
        },
        {
          role: 'assistant',
          content: 'assist',
          toolCalls: [
            {
              id: 'tc-2',
              type: 'function',
              function: { name: 'doIt', arguments: '[]' },
            },
          ],
        },
      ],
      model: 'gpt-4o',
    });
    const call = fakeChat.create.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    const messages = call?.['messages'] as Array<Record<string, unknown>> | undefined;
    expect(messages?.[0]).toMatchObject({
      role: 'tool',
      content: 'tool-out',
      tool_call_id: 'tc-1',
    });
    expect(messages?.[1]).toMatchObject({
      role: 'assistant',
      content: 'assist',
      tool_calls: [
        {
          id: 'tc-2',
          type: 'function',
          function: { name: 'doIt', arguments: '[]' },
        },
      ],
    });
  });

  it('forwards temperature, maxTokens, responseFormat, stop, user, and topP', async () => {
    fakeChat.create.mockResolvedValueOnce({
      id: 'chat-params',
      model: 'gpt-4o',
      choices: [
        {
          finish_reason: 'stop',
          message: { role: 'assistant', content: 'x', tool_calls: undefined },
        },
      ],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    });
    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    await provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      model: 'gpt-4o',
      temperature: 0.5,
      maxTokens: 16,
      topP: 0.9,
      responseFormat: 'json',
      stop: ['STOP'],
      user: 'user-1',
    });
    const call = fakeChat.create.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(call?.['temperature']).toBe(0.5);
    expect(call?.['max_tokens']).toBe(16);
    expect(call?.['top_p']).toBe(0.9);
    expect(call?.['response_format']).toEqual({ type: 'json_object' });
    expect(call?.['stop']).toEqual(['STOP']);
    expect(call?.['user']).toBe('user-1');
  });
});

describe('OpenAIProvider — embeddings', () => {
  beforeEach(() => {
    fakeChat.create.mockReset();
    fakeEmbeddings.create.mockReset();
    fakeModels.list.mockReset();
  });

  it('maps embedding items preserving index and vector', async () => {
    fakeEmbeddings.create.mockResolvedValueOnce({
      model: 'text-embedding-3-small',
      data: [
        { index: 0, embedding: [0.1, 0.2, 0.3] },
        { index: 1, embedding: [0.4, 0.5, 0.6] },
      ],
      usage: { prompt_tokens: 4, total_tokens: 4 },
    });
    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    const res = await provider.embeddings({
      model: 'text-embedding-3-small',
      input: ['a', 'b'],
    });
    expect(res.model).toBe('text-embedding-3-small');
    expect(res.items).toHaveLength(2);
    expect(res.items[0]?.vector).toEqual([0.1, 0.2, 0.3]);
    expect(res.items[1]?.vector).toEqual([0.4, 0.5, 0.6]);
    expect(res.usage.promptTokens).toBe(4);
  });

  it('maps embeddings error paths through mapSDKError', async () => {
    const err = Object.assign(new Error('rate'), { status: 429, headers: { 'retry-after': '1' } });
    fakeEmbeddings.create.mockRejectedValueOnce(err);
    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    await expect(
      provider.embeddings({ model: 'text-embedding-3-small', input: ['a'] }),
    ).rejects.toThrow();
  });

  it('falls back to zero usage when response omits usage', async () => {
    fakeEmbeddings.create.mockResolvedValueOnce({
      model: 'text-embedding-3-small',
      data: [{ index: 0, embedding: [0.1] }],
    });
    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    const res = await provider.embeddings({
      model: 'text-embedding-3-small',
      input: ['a'],
    });
    expect(res.usage.promptTokens).toBe(0);
    expect(res.usage.totalTokens).toBe(0);
  });
});

describe('OpenAIProvider — health', () => {
  beforeEach(() => {
    fakeChat.create.mockReset();
    fakeEmbeddings.create.mockReset();
    fakeModels.list.mockReset();
  });

  it('reports healthy when the models.list call succeeds', async () => {
    fakeModels.list.mockResolvedValueOnce({ data: [] });
    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    const h = await provider.health();
    expect(h.healthy).toBe(true);
    expect(h.providerId).toBe('openai');
  });

  it('reports unhealthy with a detail message when SDK throws', async () => {
    fakeModels.list.mockRejectedValueOnce(new Error('boom'));
    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    const h = await provider.health();
    expect(h.healthy).toBe(false);
    expect(h.detail).toBe('boom');
  });
});

describe('OpenAIProvider — stream', () => {
  beforeEach(() => {
    fakeChat.create.mockReset();
    fakeEmbeddings.create.mockReset();
    fakeModels.list.mockReset();
  });

  it('emits combined ChatChunks from the SDK stream', async () => {
    async function* fakeStream(): AsyncIterable<unknown> {
      yield {
        id: 's1',
        model: 'gpt-4o',
        choices: [
          {
            finish_reason: null,
            delta: { role: 'assistant', content: 'hel' },
          },
        ],
      };
      yield {
        id: 's1',
        model: 'gpt-4o',
        choices: [
          {
            finish_reason: 'stop',
            delta: { content: 'lo' },
          },
        ],
      };
    }
    fakeChat.create.mockResolvedValueOnce(fakeStream());

    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    const stream = await provider.stream({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'gpt-4o',
    });
    const collected: string[] = [];
    let finish: string | undefined;
    for await (const chunk of stream) {
      if (chunk.delta.content !== undefined) collected.push(chunk.delta.content);
      if (chunk.finishReason !== undefined) finish = chunk.finishReason;
    }
    expect(collected.join('')).toBe('hello');
    expect(finish).toBe('stop');
  });

  it('emits tool-call deltas with merged indices', async () => {
    async function* fakeStream(): AsyncIterable<unknown> {
      yield {
        id: 's1',
        model: 'gpt-4o',
        choices: [
          {
            finish_reason: null,
            delta: {
              role: 'assistant',
              tool_calls: [
                {
                  index: 0,
                  id: 'tc-1',
                  type: 'function',
                  function: { name: 'ping', arguments: '{}' },
                },
              ],
            },
          },
        ],
      };
    }
    fakeChat.create.mockResolvedValueOnce(fakeStream());

    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    const stream = await provider.stream({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'gpt-4o',
    });
    for await (const chunk of stream) {
      const deltas = chunk.delta.toolCalls;
      if (deltas) {
        expect(deltas[0]?.id).toBe('tc-1');
        expect(deltas[0]?.type).toBe('function');
      }
    }
  });

  it('returns a final chunk with role and finish_reason but no content', async () => {
    async function* fakeStream(): AsyncIterable<unknown> {
      yield {
        id: 's1',
        model: 'gpt-4o',
        choices: [
          {
            finish_reason: 'length',
            delta: { role: 'assistant', content: null },
          },
        ],
      };
    }
    fakeChat.create.mockResolvedValueOnce(fakeStream());

    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    const stream = await provider.stream({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'gpt-4o',
    });
    let finish: string | undefined;
    let role: string | undefined;
    for await (const chunk of stream) {
      if (chunk.delta.role !== undefined) role = chunk.delta.role;
      if (chunk.finishReason !== undefined) finish = chunk.finishReason;
    }
    expect(role).toBe('assistant');
    expect(finish).toBe('length');
  });

  it('maps stream SDK errors through mapSDKError', async () => {
    const err = Object.assign(new Error('stream-boom'), { status: 503 });
    fakeChat.create.mockRejectedValueOnce(err);
    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    await expect(
      provider.stream({
        messages: [{ role: 'user', content: 'hi' }],
        model: 'gpt-4o',
      }),
    ).rejects.toThrow();
  });
});

describe('OpenAIProvider — error mapping', () => {
  beforeEach(() => {
    fakeChat.create.mockReset();
    fakeEmbeddings.create.mockReset();
    fakeModels.list.mockReset();
  });

  it('maps SDK errors with status codes into typed errors', async () => {
    const err = Object.assign(new Error('boom'), {
      status: 401,
      code: 'invalid_api_key',
    });
    fakeChat.create.mockRejectedValueOnce(err);
    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    await expect(
      provider.chat({ messages: [{ role: 'user', content: 'hi' }], model: 'gpt-4o' }),
    ).rejects.toThrow(AuthenticationFailed);
  });

  it('maps SDK errors with HTTP-style codes attached', async () => {
    const err = Object.assign(new Error('rate-limited'), {
      status: 429,
      headers: { 'retry-after': '1' },
    });
    fakeChat.create.mockRejectedValueOnce(err);
    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    await expect(
      provider.chat({ messages: [{ role: 'user', content: 'hi' }], model: 'gpt-4o' }),
    ).rejects.toThrow();
  });
});
