/**
 * Hermes config redactor.
 *
 * The kernel owns the definition of which fields are secret. Adapters
 * previously duplicated this table; this module is the single
 * canonical implementation. The returned object is a frozen redacted
 * view that callers may serialize or shape further; the input
 * `HermesConfig` is treated as already-frozen and is not mutated.
 *
 * Sensitive keys (`****`-redacted in any output):
 *   - OPENROUTER_API_KEY
 *   - DATABASE_URL
 *   - REDIS_URL
 *
 * Everything else is forwarded verbatim so consumers can still see
 * log level, OTel endpoint, module directory, shutdown timeout, etc.
 */
import type { HermesConfig } from './HermesConfig.js';

const REDACTED = '****';

const SECRET_KEYS: ReadonlySet<keyof HermesConfig> = new Set<keyof HermesConfig>([
  'openrouterApiKey',
  'databaseUrl',
  'redisUrl',
]);

/**
 * Returns a new frozen object containing every key from `cfg`, with
 * secret values replaced by `****`. Suitable for direct JSON
 * serialization in adapter formatters.
 */
export const redactHermesConfig = (cfg: HermesConfig): HermesConfig => {
  const redacted = {} as Record<keyof HermesConfig, unknown>;
  for (const key of Object.keys(cfg) as ReadonlyArray<keyof HermesConfig>) {
    redacted[key] = SECRET_KEYS.has(key) ? REDACTED : cfg[key];
  }
  return Object.freeze(redacted) as HermesConfig;
};
