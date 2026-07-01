/**
 * Helpers that consume AsyncIterable ChatChunk streams.
 *
 * Useful for callers that want a full ChatResponse-like accumulator
 * without having to know which provider emitted the chunks.
 */
import { InvalidRequest } from './errors.js';
import type { ChatChunk, ChatResponse, ChatRequest, LLMToolCall } from './chat.js';
import type { FinishReason, TokenUsage } from './types.js';

export interface AccumulatedChat {
  readonly response: ChatResponse;
}

const defaultFinishReason = (last: ChatChunk | undefined): FinishReason =>
  last?.finishReason ?? (last === undefined ? 'error' : 'unknown');

const collectDeltas = (
  chunks: readonly ChatChunk[],
): { content: string; toolCalls: Map<number, { id?: string; name?: string; args: string }> } => {
  let content = '';
  const toolCalls = new Map<number, { id?: string; name?: string; args: string }>();
  for (const chunk of chunks) {
    if (chunk.delta.content) content += chunk.delta.content;
    if (chunk.delta.toolCalls) {
      for (const delta of chunk.delta.toolCalls) {
        const existing = toolCalls.get(delta.index) ?? { args: '' };
        if (delta.id !== undefined) existing.id = delta.id;
        if (delta.function?.name !== undefined) existing.name = delta.function.name;
        if (delta.function?.arguments !== undefined) existing.args += delta.function.arguments;
        toolCalls.set(delta.index, existing);
      }
    }
  }
  return { content, toolCalls };
};

export const accumulateChatChunks = (
  _request: ChatRequest,
  chunks: AsyncIterable<ChatChunk>,
): Promise<AccumulatedChat> => {
  const collected: ChatChunk[] = [];
  let firstChunk: ChatChunk | undefined;
  let lastChunk: ChatChunk | undefined;

  const consume = async (): Promise<void> => {
    for await (const chunk of chunks) {
      collected.push(chunk);
      if (firstChunk === undefined) firstChunk = chunk;
      lastChunk = chunk;
    }
  };

  return consume().then(() => {
    if (firstChunk === undefined) {
      throw new InvalidRequest(
        'unknown',
        'Chat stream produced zero chunks; cannot accumulate response.',
      );
    }
    const { content, toolCalls } = collectDeltas(collected);
    const usage: TokenUsage = lastChunk?.usage ?? {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
    const toolCallsList: LLMToolCall[] = Array.from(toolCalls.entries())
      .sort(([a], [b]) => a - b)
      .map(([, value]) => {
        if (!value.id || !value.name) {
          throw new InvalidRequest(
            firstChunk?.providerId ?? 'unknown',
            'Tool call delta missing id or name; cannot accumulate response.',
          );
        }
        return {
          id: value.id,
          type: 'function' as const,
          function: { name: value.name, arguments: value.args },
        };
      });
    const toolCallsFinal = toolCallsList.length > 0 ? toolCallsList : undefined;

    const role = firstChunk.delta.role ?? 'assistant';

    const response: ChatResponse = {
      id: firstChunk.id,
      providerId: firstChunk.providerId,
      model: firstChunk.model,
      message: { role, content, ...(toolCallsFinal ? { toolCalls: toolCallsFinal } : {}) },
      finishReason: defaultFinishReason(lastChunk),
      usage,
      ...(toolCallsFinal ? { toolCalls: toolCallsFinal } : {}),
    };

    return { response };
  });
};

export const withAbortSignal = async <T>(
  source: AsyncIterable<T>,
  signal: AbortSignal | undefined,
): Promise<void> => {
  if (signal?.aborted) {
    throw new InvalidRequest('unknown', 'Stream cancelled before consumption started.');
  }
  for await (const _ of source) {
    if (signal?.aborted) {
      throw new InvalidRequest('unknown', 'Stream cancelled mid-consumption.');
    }
  }
};
