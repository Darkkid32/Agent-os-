/**
 * @agent-os/adapters
 *
 * First-party adapter implementations. Phase 1.1 ships nothing concrete; this
 * entry-point re-exports the SDK contract so downstream packages have a
 * stable import.
 */

import type { AdapterLifecycle } from '@agent-os/adapters-sdk';

export const PACKAGE_NAME = '@agent-os/adapters' as const;
export const PACKAGE_VERSION = '0.1.0' as const;

export type { AdapterLifecycle } from '@agent-os/adapters-sdk';

export const BUILT_IN_ADAPTERS: readonly string[] = [] as const;

export type BuiltInAdapterRegistry = Readonly<Record<string, AdapterLifecycle>>;

export const BUILT_IN_ADAPTER_REGISTRY: BuiltInAdapterRegistry = {};
