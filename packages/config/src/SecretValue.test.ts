import { describe, it, expect } from 'vitest';
import { SecretValue } from './types.js';

describe('SecretValue', () => {
  it('stores the raw value', () => {
    const secret = SecretValue.of('my-api-key-12345');
    expect(secret.unwrap()).toBe('my-api-key-12345');
  });

  it('masks the value in masked()', () => {
    const secret = SecretValue.of('my-api-key-12345');
    expect(secret.masked()).toBe('my********');
  });

  it('uses custom hint when provided', () => {
    const secret = SecretValue.of('my-api-key-12345', 'API_KEY');
    expect(secret.masked()).toBe('API_KEY');
  });

  it('masks short values completely', () => {
    const secret = SecretValue.of('abc');
    expect(secret.masked()).toBe('********');
  });

  it('toString returns masked form', () => {
    const secret = SecretValue.of('supersecret');
    expect(secret.toString()).toBe('su********');
  });

  it('toJSON returns masked form', () => {
    const secret = SecretValue.of('supersecret');
    expect(JSON.stringify({ password: secret })).toBe('{"password":"su********"}');
  });

  it('does not expose secret in JSON serialization', () => {
    const secret = SecretValue.of('my-api-key-12345');
    const json = JSON.stringify(secret);
    expect(json).not.toContain('my-api-key-12345');
  });

  it('does not expose secret in template literals', () => {
    const secret = SecretValue.of('my-api-key-12345');
    const str = `Secret: ${secret}`;
    expect(str).not.toContain('my-api-key-12345');
  });

  it('handles empty string', () => {
    const secret = SecretValue.of('');
    expect(secret.unwrap()).toBe('');
    expect(secret.masked()).toBe('********');
  });

  it('handles 4-char string', () => {
    const secret = SecretValue.of('abcd');
    expect(secret.masked()).toBe('********');
  });
});
