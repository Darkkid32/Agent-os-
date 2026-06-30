import { describe, it, expect } from 'vitest';
import {
  PACKAGE_NAME,
  PACKAGE_VERSION,
  definePlugin,
  definePluginConfig,
  createPluginManifest,
  createPluginContext,
  createMinimalPlugin,
  createCommandPlugin,
  executeCommand,
  createEventPlugin,
  registerEventHandler,
  createHelloWorldPlugin,
  createMetricsLoggerPlugin,
} from './index.js';

describe('index exports', () => {
  it('exports PACKAGE_NAME and PACKAGE_VERSION', () => {
    expect(PACKAGE_NAME).toBe('@agent-os/plugin-sdk');
    expect(PACKAGE_VERSION).toBe('1.0.0');
  });

  it('exports definePlugin', () => {
    expect(typeof definePlugin).toBe('function');
  });

  it('exports definePluginConfig', () => {
    expect(typeof definePluginConfig).toBe('function');
  });

  it('exports createPluginManifest', () => {
    expect(typeof createPluginManifest).toBe('function');
  });

  it('exports createPluginContext', () => {
    expect(typeof createPluginContext).toBe('function');
  });

  it('exports createMinimalPlugin', () => {
    expect(typeof createMinimalPlugin).toBe('function');
  });

  it('exports createCommandPlugin', () => {
    expect(typeof createCommandPlugin).toBe('function');
  });

  it('exports executeCommand', () => {
    expect(typeof executeCommand).toBe('function');
  });

  it('exports createEventPlugin', () => {
    expect(typeof createEventPlugin).toBe('function');
  });

  it('exports registerEventHandler', () => {
    expect(typeof registerEventHandler).toBe('function');
  });

  it('exports createHelloWorldPlugin', () => {
    expect(typeof createHelloWorldPlugin).toBe('function');
  });

  it('exports createMetricsLoggerPlugin', () => {
    expect(typeof createMetricsLoggerPlugin).toBe('function');
  });
});
