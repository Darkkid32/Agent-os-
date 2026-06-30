/**
 * ConfigRegistry — central registry of named ConfigProviders.
 *
 * Applications register providers per namespace (e.g., "api", "hermes").
 * The registry is the single lookup point for all configuration consumers.
 */

import type { ConfigProvider, ConfigRegistry as IConfigRegistry } from './types.js';

function createConfigRegistry(): IConfigRegistry {
  const providers = new Map<string, ConfigProvider>();

  return {
    register(provider: ConfigProvider): void {
      if (providers.has(provider.name)) {
        throw new Error(`ConfigProvider "${provider.name}" already registered`);
      }
      providers.set(provider.name, provider);
    },

    getProvider(name: string): ConfigProvider | undefined {
      return providers.get(name);
    },

    providers(): readonly ConfigProvider[] {
      return Array.from(providers.values());
    },
  };
}

export { createConfigRegistry };
