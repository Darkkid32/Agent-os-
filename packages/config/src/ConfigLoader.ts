/**
 * ConfigLoader — merges configuration from multiple sources with defined priority.
 *
 * Priority (low → high):
 *   defaults → config file → environment variables → runtime overrides
 *
 * Environment variables use a prefix (default: "AGENT_OS_") and map
 * UPPER_SNAKE_CASE keys to dot-separated config paths.
 */

import type { ConfigLoader as IConfigLoader, ConfigSource } from './types.js';

const DEFAULT_ENV_PREFIX = 'AGENT_OS_';

function deepMerge(
  target: Readonly<Record<string, unknown>>,
  source: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      result[key] !== null &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Readonly<Record<string, unknown>>,
        value as Readonly<Record<string, unknown>>,
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

function envToConfig(
  env: Readonly<Record<string, string>>,
  prefix: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith(prefix)) continue;
    const path = key.slice(prefix.length).toLowerCase().split('_').filter(Boolean);
    if (path.length === 0) continue;

    let current: Record<string, unknown> = result;
    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i];
      if (segment === undefined) continue;
      if (current[segment] === undefined || typeof current[segment] !== 'object') {
        current[segment] = {};
      }
      current = current[segment] as Record<string, unknown>;
    }

    const leafKey = path[path.length - 1];
    if (leafKey === undefined) continue;
    current[leafKey] = coerceEnvValue(value);
  }
  return result;
}

function coerceEnvValue(value: string): string | number | boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null as unknown as string;
  if (value === 'undefined') return undefined as unknown as string;
  const num = Number(value);
  if (!Number.isNaN(num) && value.trim() !== '') return num;
  return value;
}

function applyDefaults(
  data: Readonly<Record<string, unknown>>,
  defaults: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(defaults)) {
    if (data[key] !== undefined) {
      result[key] = data[key];
    } else {
      result[key] = value;
    }
  }
  return result;
}

const loader: IConfigLoader = {
  load(sources: readonly ConfigSource[]): Record<string, unknown> {
    let merged: Record<string, unknown> = {};

    for (const source of sources) {
      switch (source.kind) {
        case 'defaults':
          merged = applyDefaults(merged, source.values);
          break;
        case 'file':
          merged = deepMerge(merged, source.values);
          break;
        case 'env': {
          const prefix = source.prefix ?? DEFAULT_ENV_PREFIX;
          const envConfig = source.values
            ? envToConfig(source.values, prefix)
            : envToConfig(process.env as Readonly<Record<string, string>>, prefix);
          merged = deepMerge(merged, envConfig);
          break;
        }
        case 'runtime':
          merged = deepMerge(merged, source.values);
          break;
      }
    }

    return merged;
  },
};

export { loader };
