/**
 * Plugin Loader.
 *
 * Dynamically imports plugin modules and validates their exports.
 * Ensures loaded modules conform to the AgentPlugin interface.
 *
 * Layer: 2 (Platform)
 * Dependencies: @agent-os/core (Result), types
 */

import { ok, err, type Result } from '@agent-os/core';
import type { AgentPlugin, PluginLoader, PluginManifest } from './types.js';

const isAgentPlugin = (value: unknown): value is AgentPlugin => {
  if (value == null || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (obj.manifest == null || typeof obj.manifest !== 'object') {
    return false;
  }

  const manifest = obj.manifest as Record<string, unknown>;
  if (
    typeof manifest.id !== 'string' ||
    typeof manifest.name !== 'string' ||
    typeof manifest.version !== 'string'
  ) {
    return false;
  }

  if (typeof obj.initialize !== 'function') {
    return false;
  }
  if (typeof obj.start !== 'function') {
    return false;
  }
  if (typeof obj.stop !== 'function') {
    return false;
  }
  if (typeof obj.dispose !== 'function') {
    return false;
  }

  return true;
};

export const createPluginLoader = (): PluginLoader => ({
  load: async (
    manifest: PluginManifest,
    modulePath: string,
  ): Promise<Result<AgentPlugin, string>> => {
    let imported: unknown;
    try {
      imported = await import(modulePath);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      return err(`Failed to import plugin module "${modulePath}": ${message}`);
    }

    const candidate = (imported as Record<string, unknown>).default ?? imported;

    if (!isAgentPlugin(candidate)) {
      return err(
        `Plugin module "${modulePath}" does not export a valid AgentPlugin. ` +
          'Expected an object with manifest, initialize(), start(), stop(), dispose().',
      );
    }

    const loaded = candidate as AgentPlugin;

    if (loaded.manifest.id !== manifest.id) {
      return err(
        `Plugin manifest mismatch: expected id "${manifest.id}" but module exported "${loaded.manifest.id}".`,
      );
    }

    return ok(loaded);
  },
});
