import { describe, it, expect } from 'vitest';
import { validatePluginManifest, validateAgentOSCompatibility } from './PluginMetadataValidator.js';
import type { PluginManifest } from './types.js';

const createValidManifest = (overrides: Partial<PluginManifest> = {}): PluginManifest => ({
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  author: 'Test Author',
  description: 'A test plugin',
  capabilities: ['test'],
  dependencies: [],
  minimumAgentOSVersion: '1.0.0',
  ...overrides,
});

describe('validatePluginManifest', () => {
  it('passes for a valid manifest', () => {
    const manifest = createValidManifest();
    const result = validatePluginManifest(manifest);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('requires id', () => {
    const manifest = createValidManifest({ id: '' });
    const result = validatePluginManifest(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Plugin id is required');
  });

  it('validates id format', () => {
    const manifest = createValidManifest({ id: 'INVALID ID!' });
    const result = validatePluginManifest(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('id'))).toBe(true);
  });

  it('requires name', () => {
    const manifest = createValidManifest({ name: '' });
    const result = validatePluginManifest(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Plugin name is required');
  });

  it('requires version', () => {
    const manifest = createValidManifest({ version: '' });
    const result = validatePluginManifest(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Plugin version is required');
  });

  it('validates semver format', () => {
    const manifest = createValidManifest({ version: 'not-a-version' });
    const result = validatePluginManifest(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('semver'))).toBe(true);
  });

  it('requires author', () => {
    const manifest = createValidManifest({ author: '' });
    const result = validatePluginManifest(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Plugin author is required');
  });

  it('requires description', () => {
    const manifest = createValidManifest({ description: '' });
    const result = validatePluginManifest(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Plugin description is required');
  });

  it('requires minimumAgentOSVersion', () => {
    const manifest = createValidManifest({ minimumAgentOSVersion: '' });
    const result = validatePluginManifest(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Plugin minimumAgentOSVersion is required');
  });

  it('validates minimumAgentOSVersion format', () => {
    const manifest = createValidManifest({ minimumAgentOSVersion: 'bad' });
    const result = validatePluginManifest(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('minimumAgentOSVersion'))).toBe(true);
  });

  it('validates dependency versions', () => {
    const manifest = createValidManifest({
      dependencies: [{ id: 'dep', version: 'bad' }],
    });
    const result = validatePluginManifest(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Dependency version'))).toBe(true);
  });

  it('collects multiple errors', () => {
    const manifest = createValidManifest({ id: '', name: '', version: '' });
    const result = validatePluginManifest(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('validateAgentOSCompatibility', () => {
  it('passes when current version meets requirement', () => {
    const manifest = createValidManifest({ minimumAgentOSVersion: '0.5.0' });
    const result = validateAgentOSCompatibility(manifest, '1.0.0');

    expect(result.valid).toBe(true);
  });

  it('passes when current version exceeds requirement', () => {
    const manifest = createValidManifest({ minimumAgentOSVersion: '0.5.0' });
    const result = validateAgentOSCompatibility(manifest, '1.0.0');

    expect(result.valid).toBe(true);
  });

  it('fails when current version is below requirement', () => {
    const manifest = createValidManifest({ minimumAgentOSVersion: '1.0.0' });
    const result = validateAgentOSCompatibility(manifest, '0.1.0');

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('requires'))).toBe(true);
  });

  it('handles invalid version strings', () => {
    const manifest = createValidManifest({ minimumAgentOSVersion: '1.0.0' });
    const result = validateAgentOSCompatibility(manifest, 'invalid');

    expect(result.valid).toBe(false);
  });
});
