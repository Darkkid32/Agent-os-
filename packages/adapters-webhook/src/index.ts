/**
 * Public exports for @agent-os/adapters-webhook (Phase 3.6).
 *
 * The webhook adapter is a stateless, vendor-neutral HTTP-in / HTTP-out
 * surface. Consumers (apps/api, apps/cli) own transport wiring,
 * signature secrets, and route tables.
 */
export { WebhookAdapter, ADAPTER_NAME, ADAPTER_VERSION } from './WebhookAdapter.js';
export type {
  BodyParser,
  HandlerError,
  ParseError,
  ParsedRequest,
  ResponseBody,
  RoutingError,
  SignatureConfig,
  SignatureVerifier,
  VerificationError,
  WebhookAdapterConfig,
  WebhookAdapterHealth,
  WebhookMetadata,
  WebhookMethod,
  WebhookRoute,
  WebhookRouteHandler,
} from './types.js';
export { jsonParser, assembleParsedRequest } from './parser.js';
export { signatureConfig, verifyHmacSha256 } from './signature.js';
export { defaultRouteTable } from './routes.js';
export {
  okResponse,
  errorResponse,
  notFoundResponse,
  methodNotAllowedResponse,
  unauthorizedResponse,
  badRequestResponse,
  internalErrorResponse,
  fromResponseBody,
} from './formats.js';
