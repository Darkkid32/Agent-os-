/**
 * @agent-os/auth — Authentication and authorization for Agent OS HTTP surfaces.
 *
 * @packageDocumentation
 */

export type {
  AuthenticationResult,
  AuthenticatedSubject,
  AuthenticationMethod,
  AuthenticationProvider,
  AuthConfig,
} from './types.js';

export { safeCompare } from './credentials.js';

export {
  createApiKeyProvider,
  type ApiKeyEntry,
  type ApiKeyProviderConfig,
} from './ApiKeyProvider.js';
export {
  createBearerTokenProvider,
  type BearerTokenEntry,
  type BearerTokenProviderConfig,
} from './BearerTokenProvider.js';

export {
  canHttp,
  requireHttpRole,
  toKernelAction,
  PermissionError,
  type HttpAction,
} from './permissions.js';

export { addAuth, requireAction } from './authPlugin.js';
