/**
 * Webhook adapter.
 *
 * Per docs/architecture/platform.md §9, the webhook adapter is a
 * stateless HTTP-in / HTTP-out surface. Composition root for the
 *   - route table (config.routes)
 *   - body parser (default JSON)
 *   - optional signature verifier (vendor-neutral plug)
 *   - HermesPort (kernel contract)
 *
 * No caching. No mutable per-request state. No env reads. No
 * adapter-to-adapter links. Hermes failures propagate as Result<T>;
 * only unexpected exceptions (programming errors, malformed requests,
 * infrastructure failures) are caught and translated to generic 5xx.
 *
 * Pipeline (per request):
 *
 *   Request
 *     -> parse body (default JSON, capped at maxBodyBytes)
 *     -> verify signature (if configured)
 *     -> match route (method + path)
 *     -> call handler(parsed, hermes) -> Result<ResponseBody, HandlerError>
 *     -> translate to Fetch Response
 */
import { now as coreNow } from '@agent-os/core';
import type { HermesPort } from '@agent-os/hermes';

import {
  type BodyParser,
  type HandlerError,
  type ParsedRequest,
  type SignatureVerifier,
  type WebhookAdapterConfig,
  type WebhookAdapterHealth,
  type WebhookMetadata,
  type WebhookRoute,
} from './types.js';
import { jsonParser, assembleParsedRequest } from './parser.js';
import { matchRoute } from './routing.js';
import {
  errorResponse,
  fromResponseBody,
  internalErrorResponse,
  methodNotAllowedResponse,
  notFoundResponse,
  unauthorizedResponse,
} from './formats.js';

export const ADAPTER_NAME = '@agent-os/adapters-webhook';
export const ADAPTER_VERSION = '0.1.0';

const DEFAULT_MAX_BODY_BYTES = 1_048_576;
const DEFAULT_TIMEOUT_MS = 10_000;

const toHandlerError = (e: unknown): HandlerError => {
  if (e instanceof Error) return { code: 'INTERNAL', message: e.message };
  return { code: 'INTERNAL', message: 'unexpected error' };
};

export class WebhookAdapter {
  private readonly hermes: HermesPort;
  private readonly routes: readonly WebhookRoute[];
  private readonly parser: BodyParser;
  private readonly maxBodyBytes: number;
  private readonly timeoutMs: number;
  private readonly signatureHeader: string | undefined;
  private readonly signatureVerifier: SignatureVerifier | undefined;

  private initialized: boolean;
  private lastError: string | undefined;

  public constructor(hermes: HermesPort, config: WebhookAdapterConfig) {
    this.hermes = hermes;
    this.routes = config.routes;
    this.parser = config.parser ?? jsonParser(config.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES);
    this.maxBodyBytes = config.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.signatureHeader = config.signatures?.header.toLowerCase();
    this.signatureVerifier = config.signatures?.verifier;
    this.initialized = false;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    validateRoutes(this.routes);
    this.initialized = true;
  }

  public async start(): Promise<void> {
    if (!this.initialized) {
      throw new Error(`${ADAPTER_NAME}: initialize() must be called before start().`);
    }
    // Webhook adapter is stateless. start() is a guard.
  }

  public async stop(): Promise<void> {
    // No-op. Lifecycle exists only for symmetry with other adapters.
  }

  public health(): WebhookAdapterHealth {
    if (!this.initialized) {
      return { status: 'unknown', detail: 'not initialized', at: coreNow() };
    }
    if (this.lastError) {
      return { status: 'degraded', detail: this.lastError, at: coreNow() };
    }
    return { status: 'healthy', at: coreNow() };
  }

  public metadata(): WebhookMetadata {
    return {
      name: ADAPTER_NAME,
      version: ADAPTER_VERSION,
      interfaceType: 'webhook',
      supportedOperations: ['webhook', 'health'],
      transport: 'http',
      signatureEnabled: this.signatureVerifier !== undefined,
      routeCount: this.routes.length,
    };
  }

  /**
   * Single entry point. The consumer (apps/api's Fastify route) wraps
   * an incoming request into a Fetch `Request` and converts the
   * returned Fetch `Response` into a framework reply.
   */
  public async handle(req: Request): Promise<Response> {
    if (!this.initialized) {
      return internalErrorResponse(`${ADAPTER_NAME}: not initialized`);
    }

    let parsed: ParsedRequest;
    try {
      parsed = await this.parseRequest(req);
    } catch (e) {
      this.lastError = toHandlerError(e).message;
      return internalErrorResponse(toHandlerError(e).message);
    }

    if (this.signatureVerifier && this.signatureHeader) {
      const headerValue = parsed.headers.get(this.signatureHeader);
      if (!headerValue) {
        return unauthorizedResponse('signature header missing');
      }
      const verifyResult = this.signatureVerifier(parsed.raw, parsed.headers);
      if (!verifyResult.ok) {
        return unauthorizedResponse(verifyResult.error.message);
      }
    }

    const url = new URL(req.url);
    const match = matchRoute(this.routes, req.method, url.pathname);
    if (!match.ok) {
      const e = match.error;
      if (e.code === 'METHOD_NOT_ALLOWED' && e.allow) {
        return methodNotAllowedResponse(e.allow as readonly string[], e.message);
      }
      return notFoundResponse(e.message);
    }

    let handlerResult;
    try {
      handlerResult = await withTimeout(
        match.value.route.handler(parsed, this.hermes),
        this.timeoutMs,
      );
    } catch (e) {
      this.lastError = toHandlerError(e).message;
      return internalErrorResponse(toHandlerError(e).message);
    }

    if (handlerResult.ok) return fromResponseBody(handlerResult.value);
    return errorResponse(handlerResult.error, statusFor(handlerResult.error));
  }

  private async parseRequest(req: Request): Promise<ParsedRequest> {
    const raw = new Uint8Array(await req.arrayBuffer());
    const contentType = req.headers.get('content-type') ?? '';

    if (raw.byteLength > this.maxBodyBytes) {
      throw new Error('request body exceeds the configured maximum');
    }

    const parsed = this.parser(raw, contentType);
    if (!parsed.ok) {
      const e = parsed.error;
      throw new Error(`${e.code}: ${e.message}`);
    }

    return assembleParsedRequest(raw, contentType, req.headers, parsed.value.json);
  }
}

const validateRoutes = (routes: readonly WebhookRoute[]): void => {
  const seen = new Set<string>();
  for (const r of routes) {
    if (!r.path.startsWith('/')) {
      throw new Error(`${ADAPTER_NAME}: route path must start with '/': ${r.path}`);
    }
    const key = `${r.method} ${r.path}`;
    if (seen.has(key)) {
      throw new Error(`${ADAPTER_NAME}: duplicate route ${key}`);
    }
    seen.add(key);
  }
};

const statusFor = (e: HandlerError): number => {
  switch (e.code) {
    case 'BAD_REQUEST':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'NOT_FOUND':
      return 404;
    case 'METHOD_NOT_ALLOWED':
      return 405;
    case 'HERMES':
      return 502;
    default:
      return 500;
  }
};

const withTimeout = async <T>(p: Promise<T>, ms: number): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<T>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`handler exceeded ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};
