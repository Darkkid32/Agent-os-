/**
 * Webhook adapter types.
 *
 * The adapter is a generic, vendor-neutral HTTP-in / HTTP-out surface.
 * It owns no payload schema, no signature algorithm, and no Hermes
 * command selection. Those decisions live in pluggable functions the
 * consumer supplies through WebhookAdapterConfig. The adapter only
 * knows how to:
 *
 *   - parse a raw HTTP body into a ParsedRequest (via BodyParser),
 *   - optionally verify a signature (via SignatureVerifier),
 *   - dispatch to a WebhookRoute handler,
 *   - translate the handler's Result into an HTTP response,
 *   - report adapter health (NOT hermes.health()).
 *
 * Per docs/architecture/platform.md §9, expected Hermes failures
 * propagate as Result. Only programming errors, malformed requests,
 * and infrastructure failures are caught.
 */
import type {
  AdapterHealth,
  AdapterHealthStatus,
  AdapterMetadata,
} from '@agent-os/core/adapter-metadata';
import type { HermesPort } from '@agent-os/hermes';
import type { Result } from '@agent-os/core';
import type { Logger, MetricRegistry } from '@agent-os/observability';

export type WebhookMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ParsedRequest {
  readonly raw: Uint8Array;
  readonly contentType: string;
  readonly json: unknown;
  readonly headers: ReadonlyMap<string, string>;
}

export interface ResponseBody {
  readonly status: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body: unknown;
}

export interface HandlerError {
  readonly code: string;
  readonly message: string;
  readonly detail?: unknown;
}

export interface ParseError {
  readonly code: 'PARSE';
  readonly message: string;
  readonly detail?: unknown;
}

export interface VerificationError {
  readonly code: 'VERIFICATION';
  readonly message: string;
}

export interface RoutingError {
  readonly code: 'NOT_FOUND' | 'METHOD_NOT_ALLOWED';
  readonly message: string;
  readonly allow?: readonly WebhookMethod[];
}

/**
 * Pluggable signature verifier. The adapter does not assume a vendor.
 * The verifier receives the **raw** request bytes plus a header map and
 * returns ok or err. HMAC-SHA256 is provided as a convenience helper;
 * Stripe-style `t=…,v1=…` schemes, GitHub `X-Hub-Signature-256`, or
 * internal schemes all plug in through this contract.
 */
export type SignatureVerifier = (
  rawBody: Uint8Array,
  headers: ReadonlyMap<string, string>,
) => Result<void, VerificationError>;

export interface SignatureConfig {
  /** Header name carrying the signature. Case-insensitive lookup. */
  readonly header: string;
  /** Algorithm-specific verifier (HMAC, asymmetric, vendor-specific). */
  readonly verifier: SignatureVerifier;
}

/**
 * Pluggable body parser. Default in the adapter handles
 * application/json. Consumers wire in XML, form-urlencoded, or vendor
 * codecs here.
 */
export type BodyParser = (
  rawBody: Uint8Array,
  contentType: string,
) => Result<Pick<ParsedRequest, 'json'>, ParseError>;

export interface WebhookRoute {
  readonly method: WebhookMethod;
  readonly path: string;
  readonly handler: WebhookRouteHandler;
}

export type WebhookRouteHandler = (
  parsed: ParsedRequest,
  hermes: HermesPort,
) => Promise<Result<ResponseBody, HandlerError>>;

export interface WebhookAdapterConfig {
  readonly routes: readonly WebhookRoute[];
  /** Optional body parser. Defaults to JSON. */
  readonly parser?: BodyParser;
  /** Optional signature verification. Omit to disable. */
  readonly signatures?: SignatureConfig;
  /** Max request body bytes. Default 1 MiB. */
  readonly maxBodyBytes?: number;
  /** Per-request timeout in ms. Default 10_000. */
  readonly timeoutMs?: number;
  /** Optional structured logger. */
  readonly logger?: Logger;
  /** Optional metric registry. */
  readonly metricRegistry?: MetricRegistry;
}

export type WebhookAdapterHealthStatus = AdapterHealthStatus;

export type WebhookAdapterHealth = AdapterHealth;

export type WebhookMetadata = AdapterMetadata & {
  readonly transport: 'http';
  readonly signatureEnabled: boolean;
  readonly routeCount: number;
};
