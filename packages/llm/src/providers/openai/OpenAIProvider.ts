/**
 * `OpenAIProvider` — concrete LLM provider backed by the OpenAI Node SDK.
 *
 * Supports:
 *   - Chat completions (full + streaming)
 *   - Embeddings
 *   - Tool calling
 *   - JSON mode
 *
 * All configuration comes from a `ConfigProvider` (never `process.env`).
 * Every request is instrumented with structured logging and tracing.
 */
import OpenAI from 'openai';
import { v4 as createUuid } from '../../uuid.js';
import { instrument, recordUsage } from '../../observability.js';
import { AuthenticationFailed } from '../../errors.js';
import { mapSDKError } from '../../mapping.js';
import { makeTokenUsage, ZERO_USAGE } from '../../tokens.js';
import type { LLMProvider, LLMHealthReport } from '../../provider.js';
import type {
  ChatRequest,
  ChatResponse,
  ChatResponseMessage,
  ChatChunk,
  LLMToolCall,
  LLMToolCallDelta,
} from '../../chat.js';
import type { ChatMessage, ModelInfo, TokenUsage, ProviderCapabilities } from '../../types.js';
import type { EmbeddingRequest, EmbeddingResponse, EmbeddingItem } from '../../embeddings.js';
import type { Span } from '@agent-os/observability';

export interface OpenAIProviderConfig {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly organization?: string;
  readonly defaultModel?: string;
  readonly timeoutMs?: number;
}

const OPENAI_CATALOGUE: readonly ModelInfo[] = [
  {
    id: 'gpt-4o',
    providerId: 'openai',
    displayName: 'GPT-4o',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: 'gpt-4o-mini',
    providerId: 'openai',
    displayName: 'GPT-4o Mini',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: 'gpt-4-turbo',
    providerId: 'openai',
    displayName: 'GPT-4 Turbo',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: 'text-embedding-3-small',
    providerId: 'openai',
    displayName: 'Text Embedding 3 Small',
    contextWindow: 8191,
    maxOutputTokens: 0,
    supportsTools: false,
    supportsVision: false,
    supportsStreaming: false,
  },
  {
    id: 'text-embedding-3-large',
    providerId: 'openai',
    displayName: 'Text Embedding 3 Large',
    contextWindow: 8191,
    maxOutputTokens: 0,
    supportsTools: false,
    supportsVision: false,
    supportsStreaming: false,
  },
];

const toSDKMessage = (messages: readonly ChatMessage[]): OpenAI.ChatCompletionMessageParam[] =>
  messages.map((m: ChatMessage): OpenAI.ChatCompletionMessageParam => {
    switch (m.role) {
      case 'system':
        return { role: 'system', content: m.content };
      case 'user':
        return { role: 'user', content: m.content };
      case 'assistant': {
        if (!m.toolCalls) {
          return { role: 'assistant', content: m.content };
        }
        const sdkToolCalls: OpenAI.ChatCompletionMessageToolCall[] = [];
        for (const tc of m.toolCalls) {
          sdkToolCalls.push({
            id: tc.id,
            type: 'function',
            function: { name: tc.function.name, arguments: tc.function.arguments },
          });
        }
        return {
          role: 'assistant',
          content: m.content,
          tool_calls: sdkToolCalls,
        };
      }
      case 'tool':
        return {
          role: 'tool',
          content: m.content,
          tool_call_id: m.toolCallId ?? '',
        };
      default:
        return { role: 'user', content: m.content };
    }
  });

const toSDKTools = (tools: ChatRequest['tools']): OpenAI.ChatCompletionTool[] => {
  if (!tools) return [];
  return tools.map((t): OpenAI.ChatCompletionTool => ({
    type: 'function',
    function: {
      name: t.function.name,
      ...(t.function.description ? { description: t.function.description } : {}),
      ...(t.function.parameters
        ? { parameters: t.function.parameters as Record<string, unknown> }
        : {}),
    },
  }));
};

const fromSDKToolCalls = (
  sdk: readonly OpenAI.ChatCompletionMessageToolCall[] | undefined,
): LLMToolCall[] | undefined => {
  if (!sdk || sdk.length === 0) return undefined;
  const result: LLMToolCall[] = [];
  for (const tc of sdk) {
    result.push({
      id: tc.id,
      type: 'function',
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    });
  }
  return result;
};

const fromSDKFinishReason = (
  reason: OpenAI.ChatCompletion.Choice['finish_reason'] | null | undefined,
): ChatResponse['finishReason'] => {
  if (reason === 'stop') return 'stop';
  if (reason === 'length') return 'length';
  if (reason === 'tool_calls' || reason === 'function_call') return 'tool_calls';
  if (reason === 'content_filter') return 'content_filter';
  return 'stop';
};

const fromSDKUsage = (usage: OpenAI.CompletionUsage | null | undefined): TokenUsage => {
  if (!usage) return { ...ZERO_USAGE };
  return makeTokenUsage(usage.prompt_tokens, usage.completion_tokens);
};

const buildChatParams = (
  request: ChatRequest,
  model: string,
  stream: boolean,
): Record<string, unknown> => {
  const params: Record<string, unknown> = {
    model,
    messages: toSDKMessage(request.messages),
    stream,
  };
  if (request.temperature !== undefined) params['temperature'] = request.temperature;
  if (request.maxTokens !== undefined) params['max_tokens'] = request.maxTokens;
  if (request.topP !== undefined) params['top_p'] = request.topP;
  if (request.tools) params['tools'] = toSDKTools(request.tools);
  if (request.toolChoice !== undefined) {
    params['tool_choice'] =
      typeof request.toolChoice === 'string'
        ? request.toolChoice
        : { type: 'function', function: { name: request.toolChoice.name } };
  }
  if (request.responseFormat === 'json') params['response_format'] = { type: 'json_object' };
  if (request.stop !== undefined) params['stop'] = request.stop;
  if (request.user !== undefined) params['user'] = request.user;
  return params;
};

export class OpenAIProvider implements LLMProvider {
  public readonly id = 'openai';
  public readonly name = 'OpenAI';
  public readonly capabilities: ProviderCapabilities;
  private readonly client: OpenAI;
  private readonly defaultModel: string;
  private readonly timeoutMs: number;

  public constructor(config: OpenAIProviderConfig) {
    if (!config.apiKey) {
      throw new AuthenticationFailed('openai', 'API key is required.');
    }
    this.defaultModel = config.defaultModel ?? 'gpt-4o';
    this.timeoutMs = config.timeoutMs ?? 30000;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
      ...(config.organization ? { organization: config.organization } : {}),
      timeout: this.timeoutMs,
    });
    this.capabilities = {
      chat: true,
      streaming: true,
      embeddings: true,
      toolCalling: true,
      vision: true,
      jsonMode: true,
    };
  }

  public async models(): Promise<readonly ModelInfo[]> {
    return OPENAI_CATALOGUE;
  }

  public async chat(request: ChatRequest): Promise<ChatResponse> {
    return instrument(
      { providerId: this.id, operation: 'chat', model: request.model },
      (span: Span) => this.runChat(request, span),
    );
  }

  public async stream(request: ChatRequest): Promise<AsyncIterable<ChatChunk>> {
    return instrument(
      { providerId: this.id, operation: 'stream', model: request.model },
      (span: Span) => this.runStream(request, span),
    );
  }

  public async embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    return instrument(
      { providerId: this.id, operation: 'embeddings', model: request.model },
      (span: Span) => this.runEmbeddings(request, span),
    );
  }

  public async health(): Promise<LLMHealthReport> {
    const started = Date.now();
    try {
      await this.client.models.list();
      return {
        healthy: true,
        providerId: this.id,
        latencyMs: Date.now() - started,
        checkedAt: new Date().toISOString(),
      };
    } catch (e) {
      return {
        healthy: false,
        providerId: this.id,
        latencyMs: Date.now() - started,
        checkedAt: new Date().toISOString(),
        detail: e instanceof Error ? e.message : String(e),
      };
    }
  }

  private async runChat(request: ChatRequest, span: Span): Promise<ChatResponse> {
    try {
      const model = request.model || this.defaultModel;
      const params = buildChatParams(request, model, false);
      const response = await this.client.chat.completions.create(
        params as unknown as OpenAI.ChatCompletionCreateParamsNonStreaming,
      );

      const choice = response.choices[0];
      const usage = fromSDKUsage(response.usage);
      recordUsage(span, usage);

      const message = choice?.message;
      const content = message?.content ?? '';
      const toolCalls = fromSDKToolCalls(message?.tool_calls);

      const responseMessage: ChatResponseMessage = {
        role: 'assistant',
        content,
        ...(toolCalls ? { toolCalls } : {}),
      };

      return {
        id: response.id ?? createUuid(),
        providerId: this.id,
        model: response.model ?? model,
        message: responseMessage,
        finishReason: fromSDKFinishReason(choice?.finish_reason),
        usage,
        ...(toolCalls ? { toolCalls } : {}),
      };
    } catch (e) {
      throw mapSDKError(this.id, e);
    }
  }

  private async runStream(request: ChatRequest, _span: Span): Promise<AsyncIterable<ChatChunk>> {
    try {
      const model = request.model || this.defaultModel;
      const params = buildChatParams(request, model, true);
      const stream = await this.client.chat.completions.create(
        params as unknown as OpenAI.ChatCompletionCreateParamsStreaming,
      );

      const providerId = this.id;
      const iter = async function* (): AsyncGenerator<ChatChunk, void, void> {
        let id = createUuid();
        let resolvedModel = model;
        for await (const chunk of stream) {
          id = chunk.id ?? id;
          resolvedModel = chunk.model ?? resolvedModel;
          const choice = chunk.choices[0];
          if (!choice) continue;
          const delta = choice.delta;
          const finishReason = fromSDKFinishReason(choice.finish_reason);
          const usage = chunk.usage ? fromSDKUsage(chunk.usage) : undefined;
          const chunkPayload: ChatChunk = {
            id,
            providerId,
            model: resolvedModel,
            delta: {
              ...(delta.role ? { role: delta.role as ChatChunk['delta']['role'] } : {}),
              ...(delta.content ? { content: delta.content } : {}),
              ...(delta.tool_calls
                ? {
                    toolCalls: delta.tool_calls.map((tc, index): LLMToolCallDelta => ({
                      index,
                      ...(tc.id ? { id: tc.id } : {}),
                      type: 'function' as const,
                      function: {
                        ...(tc.function?.name ? { name: tc.function.name } : {}),
                        ...(tc.function?.arguments ? { arguments: tc.function.arguments } : {}),
                      },
                    })),
                  }
                : {}),
            },
            ...(choice.finish_reason != null || usage ? { finishReason } : {}),
            ...(usage ? { usage } : {}),
          };
          yield chunkPayload;
        }
      };
      return iter();
    } catch (e) {
      throw mapSDKError(this.id, e);
    }
  }

  private async runEmbeddings(request: EmbeddingRequest, _span: Span): Promise<EmbeddingResponse> {
    try {
      const input: string | readonly string[] = Array.isArray(request.input)
        ? request.input
        : request.input;
      const response = await this.client.embeddings.create({
        model: request.model,
        input: input as OpenAI.EmbeddingCreateParams['input'],
      });

      const items: readonly EmbeddingItem[] = response.data.map((item): EmbeddingItem => ({
        index: item.index,
        vector: item.embedding,
      }));

      return {
        id: createUuid(),
        providerId: this.id,
        model: response.model,
        items,
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
      };
    } catch (e) {
      throw mapSDKError(this.id, e);
    }
  }
}
