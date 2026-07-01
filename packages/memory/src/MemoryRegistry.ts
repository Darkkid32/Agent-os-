/**
 * Provider registry for memory backends.
 *
 * Layer: 2 (Platform)
 */

import type { MemoryProvider } from './MemoryTypes.js';

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

/**
 * Registry for memory providers.
 * Allows dynamic registration and lookup of storage backends.
 */
export class MemoryProviderRegistry {
  private readonly providers = new Map<string, MemoryProvider>();
  private defaultProviderId: string | undefined;

  /**
   * Register a provider.
   */
  public register(provider: MemoryProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider "${provider.id}" is already registered.`);
    }
    this.providers.set(provider.id, provider);
    if (this.providers.size === 1) {
      this.defaultProviderId = provider.id;
    }
  }

  /**
   * Unregister a provider.
   */
  public unregister(id: string): boolean {
    const removed = this.providers.delete(id);
    if (removed && this.defaultProviderId === id) {
      const first = this.providers.keys().next();
      this.defaultProviderId = first.done ? undefined : first.value;
    }
    return removed;
  }

  /**
   * Get a provider by ID.
   */
  public get(id: string): MemoryProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get the default provider.
   */
  public getDefault(): MemoryProvider | undefined {
    if (this.defaultProviderId === undefined) {
      return undefined;
    }
    return this.providers.get(this.defaultProviderId);
  }

  /**
   * Set the default provider.
   */
  public setDefault(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Provider "${id}" is not registered.`);
    }
    this.defaultProviderId = id;
  }

  /**
   * List all registered providers.
   */
  public list(): readonly MemoryProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Check if a provider is registered.
   */
  public has(id: string): boolean {
    return this.providers.has(id);
  }

  /**
   * Clear all providers.
   */
  public clear(): void {
    this.providers.clear();
    this.defaultProviderId = undefined;
  }
}
