import { describe, it, expect } from 'vitest';
import { createPluginManifest } from './createPluginManifest.js';

describe('createPluginManifest', () => {
  it('creates a valid manifest with required fields', () => {
    const manifest = createPluginManifest({
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      author: 'Test Author',
      description: 'A test plugin',
    });

    expect(manifest.id).toBe('test-plugin');
    expect(manifest.name).toBe('Test Plugin');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.author).toBe('Test Author');
    expect(manifest.description).toBe('A test plugin');
    expect(manifest.capabilities).toEqual([]);
    expect(manifest.dependencies).toEqual([]);
    expect(manifest.minimumAgentOSVersion).toBe('1.0.0');
  });

  it('creates a manifest with optional fields', () => {
    const manifest = createPluginManifest({
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      author: 'Test Author',
      description: 'A test plugin',
      capabilities: ['greeting', 'logging'],
      dependencies: [{ id: 'core', version: '1.0.0' }],
      minimumAgentOSVersion: '0.2.0',
    });

    expect(manifest.capabilities).toEqual(['greeting', 'logging']);
    expect(manifest.dependencies).toEqual([{ id: 'core', version: '1.0.0' }]);
    expect(manifest.minimumAgentOSVersion).toBe('0.2.0');
  });

  it('throws on invalid manifest id', () => {
    expect(() =>
      createPluginManifest({
        id: 'INVALID ID!',
        name: 'Test Plugin',
        version: '1.0.0',
        author: 'Test Author',
        description: 'A test plugin',
      }),
    ).toThrow('Invalid plugin manifest');
  });

  it('throws on invalid version', () => {
    expect(() =>
      createPluginManifest({
        id: 'test-plugin',
        name: 'Test Plugin',
        version: 'not-a-version',
        author: 'Test Author',
        description: 'A test plugin',
      }),
    ).toThrow('Invalid plugin manifest');
  });

  it('throws on empty id', () => {
    expect(() =>
      createPluginManifest({
        id: '',
        name: 'Test Plugin',
        version: '1.0.0',
        author: 'Test Author',
        description: 'A test plugin',
      }),
    ).toThrow('Invalid plugin manifest');
  });

  it('throws on empty name', () => {
    expect(() =>
      createPluginManifest({
        id: 'test-plugin',
        name: '',
        version: '1.0.0',
        author: 'Test Author',
        description: 'A test plugin',
      }),
    ).toThrow('Invalid plugin manifest');
  });

  it('creates a manifest with config schema', () => {
    const manifest = createPluginManifest({
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      author: 'Test Author',
      description: 'A test plugin',
      configSchema: {
        host: { type: 'string', default: 'localhost' },
      },
    });

    expect(manifest.configSchema).toEqual({
      host: { type: 'string', default: 'localhost' },
    });
  });
});
