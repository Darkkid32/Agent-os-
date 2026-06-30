/**
 * Plugin Configuration.
 *
 * Provides typed configuration access for plugins with support for
 * multiple config sources (defaults, global, env overrides) and
 * schema validation.
 *
 * Layer: 2 (Platform)
 * Dependencies: @agent-os/core (Result), types
 */

import type {
  PluginConfig,
  PluginConfigSchema,
  PluginConfiguration,
  PluginConfigSource,
  PluginConfigOptions,
  PluginConfigValidationResult,
} from './types.js';
import { validatePluginConfig, applyDefaults } from './PluginConfigValidator.js';

const createConfigSources = (
  pluginId: string,
  schema: PluginConfigSchema | undefined,
  sources: readonly PluginConfigSource[],
): PluginConfiguration => {
  // Sort sources by priority (lower = higher priority, applied first)
  const sorted = [...sources].sort((a, b) => a.priority - b.priority);

  let merged: PluginConfiguration = {};

  for (const source of sorted) {
    const sourceConfig = source.get(pluginId);
    if (sourceConfig != null) {
      merged = { ...merged, ...sourceConfig };
    }
  }

  // Apply defaults from schema last (lowest priority)
  if (schema != null) {
    merged = applyDefaults(merged as Record<string, unknown>, schema);
  }

  return merged;
};

export const createPluginConfig = (options: PluginConfigOptions): PluginConfig => {
  const { schema, sources, pluginId } = options;
  const config = createConfigSources(pluginId, schema, sources);

  return {
    get: <T = unknown>(key: string): T | undefined => {
      const value = config[key];
      return value as T | undefined;
    },

    require: <T = unknown>(key: string): T => {
      const value = config[key];
      if (value === undefined) {
        throw new Error(`Required configuration key "${key}" is not set for plugin "${pluginId}"`);
      }
      return value as T;
    },

    has: (key: string): boolean => {
      return key in config;
    },

    all: (): PluginConfiguration => {
      return { ...config };
    },

    schema: (): PluginConfigSchema | undefined => {
      return schema;
    },
  };
};

export const validateConfig = (
  config: PluginConfiguration,
  schema: PluginConfigSchema,
): PluginConfigValidationResult => {
  return validatePluginConfig(config as Record<string, unknown>, schema);
};

export const createDefaultSources = (
  globalConfig: PluginConfiguration | undefined,
  envOverrides: Readonly<Record<string, PluginConfiguration>> | undefined,
): readonly PluginConfigSource[] => {
  const sources: PluginConfigSource[] = [];

  // Environment overrides (highest priority)
  if (envOverrides != null) {
    sources.push({
      priority: 0,
      get: (pluginId: string) => envOverrides[pluginId],
    });
  }

  // Global config (medium priority)
  if (globalConfig != null) {
    sources.push({
      priority: 10,
      get: () => globalConfig,
    });
  }

  return sources;
};
