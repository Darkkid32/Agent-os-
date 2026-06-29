/**
 * Subject-line command parser tests.
 */
import { describe, expect, it } from 'vitest';
import { parseEmailSubject, isKnownCommand } from './parseCommand.js';

describe('parseEmailSubject', () => {
  it('parses simple command', () => {
    const r = parseEmailSubject('status', '');
    expect(r).toEqual({ command: 'status', args: {} });
  });

  it('parses command with arguments', () => {
    const r = parseEmailSubject('config --verbose true', '');
    expect(r).toEqual({ command: 'config', args: { '--verbose': 'true' } });
  });

  it('strips Re: prefix', () => {
    const r = parseEmailSubject('Re: status', '');
    expect(r).toEqual({ command: 'status', args: {} });
  });

  it('strips Fwd: prefix', () => {
    const r = parseEmailSubject('Fwd: start', '');
    expect(r).toEqual({ command: 'start', args: {} });
  });

  it('strips AW: prefix (German reply)', () => {
    const r = parseEmailSubject('AW: health', '');
    expect(r).toEqual({ command: 'health', args: {} });
  });

  it('strips configured prefix in brackets', () => {
    const r = parseEmailSubject('[AgentOS] health', 'AgentOS');
    expect(r).toEqual({ command: 'health', args: {} });
  });

  it('strips Re: and configured prefix', () => {
    const r = parseEmailSubject('Re: [AgentOS] version', 'AgentOS');
    expect(r).toEqual({ command: 'version', args: {} });
  });

  it('case-insensitive command', () => {
    const r = parseEmailSubject('STATUS', '');
    expect(r).toEqual({ command: 'status', args: {} });
  });

  it('returns null for empty subject', () => {
    expect(parseEmailSubject('', '')).toBeNull();
  });

  it('returns null for whitespace-only subject', () => {
    expect(parseEmailSubject('   ', '')).toBeNull();
  });

  it('returns null for prefix-only subject', () => {
    expect(parseEmailSubject('[AgentOS]', 'AgentOS')).toBeNull();
  });

  it('returns null for Re: followed by nothing', () => {
    expect(parseEmailSubject('Re:', '')).toBeNull();
  });

  it('returns null for empty command after prefix strip', () => {
    expect(parseEmailSubject('Re: [AgentOS]', 'AgentOS')).toBeNull();
  });

  it('isKnownCommand identifies known commands', () => {
    expect(isKnownCommand('start')).toBe(true);
    expect(isKnownCommand('stop')).toBe(true);
    expect(isKnownCommand('status')).toBe(true);
    expect(isKnownCommand('health')).toBe(true);
    expect(isKnownCommand('plugins')).toBe(true);
    expect(isKnownCommand('config')).toBe(true);
    expect(isKnownCommand('version')).toBe(true);
    expect(isKnownCommand('help')).toBe(true);
  });

  it('isKnownCommand rejects unknown commands', () => {
    expect(isKnownCommand('bogus')).toBe(false);
    expect(isKnownCommand('')).toBe(false);
    expect(isKnownCommand('registerModule')).toBe(false);
  });
});
