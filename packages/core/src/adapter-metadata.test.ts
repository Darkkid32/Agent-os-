/**
 * Type-shape tests for the shared adapter metadata and health primitives.
 *
 * These tests are compile-time checks: they assert that the new shapes
 * accept the same construction inputs as the per-adapter shapes they
 * replace, so consumers do not see a type break.
 */
import { describe, expectTypeOf, it } from 'vitest';
import type {
  AdapterHealth,
  AdapterHealthStatus,
  AdapterInterfaceType,
  AdapterMetadata,
} from './adapter-metadata.js';
import type { Timestamp } from './index.js';

describe('adapter-metadata', () => {
  describe('AdapterInterfaceType', () => {
    it('accepts every registered interface literal', () => {
      expectTypeOf<'cli'>().toMatchTypeOf<AdapterInterfaceType>();
      expectTypeOf<'rest'>().toMatchTypeOf<AdapterInterfaceType>();
      expectTypeOf<'discord'>().toMatchTypeOf<AdapterInterfaceType>();
      expectTypeOf<'telegram'>().toMatchTypeOf<AdapterInterfaceType>();
      expectTypeOf<'webhook'>().toMatchTypeOf<AdapterInterfaceType>();
      expectTypeOf<'mcp'>().toMatchTypeOf<AdapterInterfaceType>();
      expectTypeOf<'whatsapp'>().toMatchTypeOf<AdapterInterfaceType>();
      expectTypeOf<'email'>().toMatchTypeOf<AdapterInterfaceType>();
    });
  });

  describe('AdapterMetadata', () => {
    it('accepts the canonical four-field shape', () => {
      const cli: AdapterMetadata = {
        name: '@agent-os/adapters-cli',
        version: '0.1.0',
        interfaceType: 'cli',
        supportedOperations: ['start', 'stop', 'status', 'health', 'plugins', 'config', 'version'],
      };
      expectTypeOf(cli).toMatchTypeOf<AdapterMetadata>();
    });

    it('does NOT accept missing fields', () => {
      expectTypeOf<{
        name: string;
        version: string;
        interfaceType: AdapterInterfaceType;
      }>().not.toMatchTypeOf<AdapterMetadata>();
    });
  });

  describe('AdapterHealth', () => {
    it('accepts the four-status union', () => {
      const statuses: AdapterHealthStatus[] = ['healthy', 'degraded', 'failed', 'unknown'];
      expectTypeOf(statuses).toMatchTypeOf<AdapterHealthStatus[]>();
    });

    it('accepts status-only construction', () => {
      const h: AdapterHealth = { status: 'healthy', at: 0 as Timestamp };
      expectTypeOf(h).toMatchTypeOf<AdapterHealth>();
    });

    it('accepts status + detail + at', () => {
      const h: AdapterHealth = {
        status: 'degraded',
        detail: 'gateway reconnecting',
        at: 1_700_000_000_000 as Timestamp,
      };
      expectTypeOf(h).toMatchTypeOf<AdapterHealth>();
    });
  });
});
