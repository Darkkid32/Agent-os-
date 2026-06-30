/**
 * API key authentication provider.
 *
 * Validates incoming credentials against a pre-configured set of API keys.
 * Each key maps to a `KernelRole` (admin or viewer). Credentials are
 * compared in constant time to prevent timing attacks.
 *
 * Supports key rotation: provide multiple keys; all valid keys are accepted.
 */
import type { KernelRole } from '@agent-os/core/kernel-permissions';
import { safeCompare } from './credentials.js';
import type { AuthenticationProvider, AuthenticationResult } from './types.js';

export interface ApiKeyEntry {
  readonly key: string;
  readonly role: KernelRole;
  readonly id: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ApiKeyProviderConfig {
  readonly keys: readonly ApiKeyEntry[];
}

/**
 * Create an API key authentication provider.
 *
 * @example
 * ```ts
 * const provider = createApiKeyProvider({
 *   keys: [
 *     { key: 'admin-secret-key', role: 'admin', id: 'admin-1' },
 *     { key: 'viewer-secret-key', role: 'viewer', id: 'viewer-1' },
 *   ],
 * });
 * ```
 */
export const createApiKeyProvider = (config: ApiKeyProviderConfig): AuthenticationProvider => {
  const keys = config.keys;

  return {
    name: 'api-key',

    async authenticate(credentials: string): Promise<AuthenticationResult> {
      for (const entry of keys) {
        if (safeCompare(credentials, entry.key)) {
          return {
            ok: true,
            subject: {
              id: entry.id,
              role: entry.role,
              method: 'api-key',
              metadata: entry.metadata,
            },
          };
        }
      }

      return { ok: false, reason: 'Invalid API key' };
    },
  };
};
