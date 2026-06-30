/**
 * Authentication and authorization types for Agent OS HTTP surfaces.
 *
 * Provides a pluggable authentication provider interface, credential
 * validation result types, and the authenticated subject attached to
 * each request after successful authentication.
 */

import type { KernelRole } from '@agent-os/core/kernel-permissions';

/**
 * Result of authenticating a request credential.
 *
 * Discriminated union: `ok: true` carries the authenticated subject,
 * `ok: false` carries the rejection reason.
 */
export type AuthenticationResult =
  | { readonly ok: true; readonly subject: AuthenticatedSubject }
  | { readonly ok: false; readonly reason: string };

/**
 * Authenticated subject attached to each request after successful
 * authentication. Carries identity and role for downstream authorization.
 */
export interface AuthenticatedSubject {
  readonly id: string;
  readonly role: KernelRole;
  readonly method: AuthenticationMethod;
  readonly metadata?: Record<string, unknown> | undefined;
}

/**
 * Authentication methods supported by the built-in providers.
 */
export type AuthenticationMethod = 'api-key' | 'bearer-token' | 'custom';

/**
 * Pluggable authentication provider interface.
 *
 * Implement this to add custom authentication mechanisms (OAuth, SAML,
 * etc.). The provider receives raw credentials and returns a structured
 * result.
 */
export interface AuthenticationProvider {
  readonly name: string;
  authenticate(credentials: string): Promise<AuthenticationResult>;
}

/**
 * Configuration for the authentication Fastify plugin.
 */
export interface AuthConfig {
  /** The authentication provider to use. */
  readonly provider: AuthenticationProvider;

  /**
   * Paths that bypass authentication (e.g., health checks).
   * Exact string match or prefix match with trailing slash.
   * Defaults to ['/health', '/version'].
   */
  readonly publicPaths?: readonly string[];
}
