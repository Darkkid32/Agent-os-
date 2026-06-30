/**
 * Bearer token authentication provider.
 *
 * Validates incoming bearer tokens against a pre-configured set of tokens.
 * Each token maps to a `KernelRole` (admin or viewer). Credentials are
 * compared in constant time to prevent timing attacks.
 *
 * This is a static token provider suitable for service-to-service auth.
 * For JWT validation, implement the `AuthenticationProvider` interface
 * directly with a JWT library.
 */
import type { KernelRole } from '@agent-os/core/kernel-permissions';
import { safeCompare } from './credentials.js';
import type { AuthenticationProvider, AuthenticationResult } from './types.js';

export interface BearerTokenEntry {
  readonly token: string;
  readonly role: KernelRole;
  readonly id: string;
  readonly metadata?: Record<string, unknown>;
}

export interface BearerTokenProviderConfig {
  readonly tokens: readonly BearerTokenEntry[];
}

/**
 * Create a bearer token authentication provider.
 *
 * @example
 * ```ts
 * const provider = createBearerTokenProvider({
 *   tokens: [
 *     { token: 'admin-bearer-token', role: 'admin', id: 'admin-1' },
 *     { token: 'viewer-bearer-token', role: 'viewer', id: 'viewer-1' },
 *   ],
 * });
 * ```
 */
export const createBearerTokenProvider = (
  config: BearerTokenProviderConfig,
): AuthenticationProvider => {
  const tokens = config.tokens;

  return {
    name: 'bearer-token',

    async authenticate(credentials: string): Promise<AuthenticationResult> {
      for (const entry of tokens) {
        if (safeCompare(credentials, entry.token)) {
          return {
            ok: true,
            subject: {
              id: entry.id,
              role: entry.role,
              method: 'bearer-token',
              metadata: entry.metadata,
            },
          };
        }
      }

      return { ok: false, reason: 'Invalid bearer token' };
    },
  };
};
