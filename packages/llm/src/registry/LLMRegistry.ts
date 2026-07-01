/**
 * `LLMRegistry` — singleton-friendly provider registry.
 *
 * Allows dynamic registration of providers with `register()`,
 * de-registration via `unregister()`, lookup via `get()`,
 * enumeration via `list()`, and a default-provider shortcut.
 *
 * Thread-safe: all mutations are synchronous. Async operations
 * are the caller's responsibility.
 */
import { UnknownProvider } from '../errors.js';
import type { LLMProvider } from '../provider.js';

export interface LLMRegistry {
  register(provider: LLMProvider): void;
  unregister(providerId: string): void;
  get(providerId: string): LLMProvider;
  list(): readonly LLMProvider[];
  setDefault(providerId: string): void;
  defaultProvider(): LLMProvider;
}

export class DefaultLLMRegistry implements LLMRegistry {
  private readonly store: Map<string, LLMProvider> = new Map();
  private defaultId: string | undefined;

  public register(provider: LLMProvider): void {
    this.store.set(provider.id, provider);
    if (this.defaultId === undefined) {
      this.defaultId = provider.id;
    }
  }

  public unregister(providerId: string): void {
    this.store.delete(providerId);
    if (this.defaultId === providerId) {
      const keys = Array.from(this.store.keys());
      this.defaultId = keys[0];
    }
  }

  public get(providerId: string): LLMProvider {
    const provider = this.store.get(providerId);
    if (!provider) {
      throw new UnknownProvider(providerId, `Provider "${providerId}" is not registered.`);
    }
    return provider;
  }

  public list(): readonly LLMProvider[] {
    return Array.from(this.store.values());
  }

  public setDefault(providerId: string): void {
    if (!this.store.has(providerId)) {
      throw new UnknownProvider(
        providerId,
        `Cannot set default: provider "${providerId}" is not registered.`,
      );
    }
    this.defaultId = providerId;
  }

  public defaultProvider(): LLMProvider {
    if (this.defaultId === undefined) {
      throw new UnknownProvider('__none__', 'No providers registered; cannot resolve default.');
    }
    return this.get(this.defaultId);
  }
}

let globalInstance: DefaultLLMRegistry | undefined;

export const getGlobalRegistry = (): DefaultLLMRegistry => {
  if (!globalInstance) {
    globalInstance = new DefaultLLMRegistry();
  }
  return globalInstance;
};

export const resetGlobalRegistry = (): void => {
  globalInstance = undefined;
};
