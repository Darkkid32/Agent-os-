import { describe, it, expect } from 'vitest';
import { compareLogLevels, isLevelEnabled, type LogLevel } from './types.js';

describe('observability types', () => {
  describe('compareLogLevels', () => {
    const order: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

    it('returns 0 for equal levels', () => {
      for (const level of order) {
        expect(compareLogLevels(level, level)).toBe(0);
      }
    });

    it('returns negative when first < second', () => {
      expect(compareLogLevels('trace', 'fatal')).toBeLessThan(0);
      expect(compareLogLevels('info', 'warn')).toBeLessThan(0);
    });

    it('returns positive when first > second', () => {
      expect(compareLogLevels('fatal', 'trace')).toBeGreaterThan(0);
      expect(compareLogLevels('warn', 'info')).toBeGreaterThan(0);
    });
  });

  describe('isLevelEnabled', () => {
    it('enables equal level', () => {
      expect(isLevelEnabled('info', 'info')).toBe(true);
    });

    it('enables higher levels', () => {
      expect(isLevelEnabled('info', 'warn')).toBe(true);
      expect(isLevelEnabled('info', 'error')).toBe(true);
    });

    it('disables lower levels', () => {
      expect(isLevelEnabled('info', 'debug')).toBe(false);
      expect(isLevelEnabled('info', 'trace')).toBe(false);
    });
  });
});
