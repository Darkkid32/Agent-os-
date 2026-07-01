/**
 * `MockProvider` — deterministic, configurable LLM provider used for tests,
 * local development, and offline pipelines.
 *
 * Features:
 *   - Default reply echoes the last user message (reversed).
 *   - The `responses` option lets tests pin every chat to a specific
 *     content + token-usage profile.
 *   - `models` returns whatever catalogue the caller wires in.
 *   - `embeddings` returns a deterministic vector derived from a cheap
 *     linear-congruential hash of the input text.
 *   - `health` always reports healthy unless `unhealthy` is set.
 */
import { v4 as createUuid } from '../../uuid.js';
import { instrument, recordUsage } from '../../observability.js';
import { ProviderUnavailable } from '../../errors.js';
import type { LLMProvider, LLMHealthReport } from '../../provider.js';
import type {
  ChatRequest,
  ChatResponse,
  ChatResponseMessage,
  ChatChunk,
  LLMToolCall,
} from '../../chat.js';
import type { EmbeddingRequest, EmbeddingResponse, EmbeddingItem } from '../../embeddings.js';
import type { ModelInfo, TokenUsage, ProviderCapabilities } from '../../types.js';
import type { Span } from '@agent-os/observability';

export interface MockResponse {
  readonly content?: string;
  readonly finishReason?: ChatResponse['finishReason'];
  readonly usage?: TokenUsage;
  readonly toolCalls?: readonly LLMToolCall[];
  readonly errorAfterChunks?: number;
  readonly delayMs?: number;
  readonly error?: { readonly code: string; readonly message: string };
}

export interface MockProviderOptions {
  readonly id?: string;
  readonly name?: string;
  readonly catalogue?: readonly ModelInfo[];
  readonly responses?: readonly MockResponse[];
  readonly unhealthy?: boolean;
  readonly unhealthyDetail?: string;
  readonly defaultModel?: string;
  readonly supportsEmbeddings?: boolean;
  readonly supportsStreaming?: boolean;
  readonly supportsTools?: boolean;
  readonly supportsVision?: boolean;
  readonly supportsJsonMode?: boolean;
}

const defaultCatalogue: readonly ModelInfo[] = [
  {
    id: 'mock-model',
    providerId: 'mock',
    displayName: 'Mock Deterministic',
    contextWindow: 4096,
    maxOutputTokens: 1024,
    supportsTools: false,
    supportsVision: false,
    supportsStreaming: true,
  },
];

const reverse = (s: string): string => s.split('').reverse().join('');

const deterministicVector = (input: string, dim = 16): readonly number[] => {
  const out: number[] = [];
  let seed = 0;
  for (let i = 0; i < input.length; i++) {
    seed = (seed * 31 + input.charCodeAt(i)) | 0;
  }
  for (let i = 0; i < dim; i++) {
    seed = (seed * 1103515245 + 12345) | 0;
    out.push(((seed >>> 0) / 0xffffffff) * 2 - 1);
  }
  return out;
};

const buildUsage = (usage: TokenUsage | undefined): TokenUsage => {
  if (usage) return usage;
  return { promptTokens: 1, completionTokens: 1, totalTokens: 2 };
};

const defaultContentFor = (req: ChatRequest): string => {
  for (let i = req.messages.length - 1; i >= 0; i--) {
    const message = req.messages[i];
    if (!message) continue;
    if (message.role === 'user') return `echo: ${reverse(message.content)}`;
  }
  return 'echo: (no user message)';
};

const chunkText = (
  text: string,
  requestId: string,
  providerId: string,
  model: string,
): ChatChunk[] => {
  const chars = Array.from(text);
  return chars.map((content, index): ChatChunk => ({
    id: requestId,
    providerId,
    model,
    delta: { role: 'assistant', content },
    ...(index === chars.length - 1 ? { finishReason: 'stop' as const } : {}),
  }));
};

const delay = (ms: number | undefined): Promise<void> =>
  ms === undefined ? Promise.resolve() : new Promise<void>((r) => setTimeout(r, ms));

export class MockProvider implements LLMProvider {
  public readonly id: string;
  public readonly name: string;
  public readonly capabilities: ProviderCapabilities;
  private readonly catalogue: readonly ModelInfo[];
  private responses: readonly MockResponse[];
  private readonly unhealthy: boolean;
  private readonly unhealthyDetail: string | undefined;
  private readonly defaultModel: string;

  public constructor(opts: MockProviderOptions = {}) {
    this.id = opts.id ?? 'mock';
    this.name = opts.name ?? 'MockProvider';
    this.catalogue = opts.catalogue ?? defaultCatalogue;
    this.responses = opts.responses ?? [];
    this.unhealthy = opts.unhealthy ?? false;
    this.unhealthyDetail = opts.unhealthyDetail;
    this.defaultModel = opts.defaultModel ?? 'mock-model';
    this.capabilities = {
      chat: true,
      streaming: opts.supportsStreaming ?? true,
      embeddings: opts.supportsEmbeddings ?? true,
      toolCalling: opts.supportsTools ?? false,
      vision: opts.supportsVision ?? false,
      jsonMode: opts.supportsJsonMode ?? false,
    };
  }

  public setResponses(responses: readonly MockResponse[]): void {
    this.responses = responses;
  }

  public async models(): Promise<readonly ModelInfo[]> {
    return this.catalogue;
  }

  public async chat(request: ChatRequest): Promise<ChatResponse> {
    return instrument(
      { providerId: this.id, operation: 'chat', model: request.model },
      (span: Span) => this.runChat(request, span),
    );
  }

  public async stream(request: ChatRequest): Promise<AsyncIterable<ChatChunk>> {
    if (!this.capabilities.streaming) {
      throw new ProviderUnavailable(this.id, 'Streaming is not supported by this MockProvider.');
    }
    return instrument(
      { providerId: this.id, operation: 'stream', model: request.model },
      async () => this.runStream(request),
    );
  }

  public async embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.capabilities.embeddings) {
      throw new ProviderUnavailable(this.id, 'Embeddings are not supported by this MockProvider.');
    }
    return instrument(
      { providerId: this.id, operation: 'embeddings', model: request.model },
      async () => this.runEmbeddings(request),
    );
  }

  public async health(): Promise<LLMHealthReport> {
    if (this.unhealthy) {
      return {
        healthy: false,
        providerId: this.id,
        latencyMs: 0,
        checkedAt: new Date().toISOString(),
        ...(this.unhealthyDetail !== undefined ? { detail: this.unhealthyDetail } : {}),
      };
    }
    return {
      healthy: true,
      providerId: this.id,
      latencyMs: 1,
      checkedAt: new Date().toISOString(),
    };
  }

  private nextResponse(): MockResponse | undefined {
    const response = this.responses[0];
    this.responses = this.responses.slice(1);
    return response;
  }

  private async runChat(request: ChatRequest, span: Span): Promise<ChatResponse> {
    const response = this.nextResponse();
    await delay(response?.delayMs);

    const id = createUuid();
    const content = response?.content ?? defaultContentFor(request);
    const usage = buildUsage(response?.usage);
    recordUsage(span, usage);

    const toolCalls: readonly LLMToolCall[] | undefined =
      response?.toolCalls && response.toolCalls.length > 0 ? response.toolCalls : undefined;

    const message: ChatResponseMessage = {
      role: 'assistant',
      content,
      ...(toolCalls ? { toolCalls } : {}),
    };

    return {
      id,
      providerId: this.id,
      model: request.model || this.defaultModel,
      message,
      finishReason: response?.finishReason ?? 'stop',
      usage,
      ...(toolCalls ? { toolCalls } : {}),
    };
  }

  private async runStream(request: ChatRequest): Promise<AsyncIterable<ChatChunk>> {
    const response = this.nextResponse();

    const id = createUuid();
    const text = response?.content ?? defaultContentFor(request);
    const chunkList = chunkText(text, id, this.id, request.model || this.defaultModel);
    const usage = buildUsage(response?.usage);

    const providerId = this.id;
    const providerDefaultModel = this.defaultModel;
    const errorAfterChunks = response?.errorAfterChunks;
    const errorMessage = response?.error?.message ?? 'Forced stream error.';
    const finishReason = response?.finishReason ?? 'stop';
    const delayMs = response?.delayMs;

    async function* iter(): AsyncGenerator<ChatChunk, void, void> {
      await delay(delayMs);
      let emitted = 0;
      for (const chunk of chunkList) {
        yield chunk;
        emitted++;
        if (errorAfterChunks !== undefined && emitted > errorAfterChunks) {
          throw new ProviderUnavailable(providerId, errorMessage);
        }
      }
      yield {
        id,
        providerId,
        model: request.model || providerDefaultModel,
        delta: {},
        finishReason,
        usage,
      };
    }
    return iter();
  }

  private async runEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const inputArray: readonly string[] = Array.isArray(request.input)
      ? request.input
      : [request.input];
    const items: readonly EmbeddingItem[] = inputArray.map(
      (value: string, index: number): EmbeddingItem => ({
        index,
        vector: deterministicVector(value),
      }),
    );
    return {
      id: createUuid(),
      providerId: this.id,
      model: request.model,
      items,
      usage: {
        promptTokens: inputArray.reduce(
          (sum: number, value: string) => sum + Math.max(1, value.length),
          0,
        ),
        totalTokens: inputArray.reduce(
          (sum: number, value: string) => sum + Math.max(1, value.length),
          0,
        ),
      },
    };
  }
}

// (end of file)
