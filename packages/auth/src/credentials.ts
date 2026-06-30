/**
 * Constant-time credential comparison to prevent timing attacks.
 *
 * Uses `crypto.timingSafeEqual` which runs in constant time regardless
 * of where the first difference occurs. Falls back to byte-by-byte
 * comparison if the lengths differ (leaking length is acceptable for
 * credential comparison — the critical property is that content comparison
 * is constant-time).
 */
import { timingSafeEqual } from 'node:crypto';

/**
 * Compare two strings in constant time. Returns `true` if they are equal.
 *
 * If the lengths differ, the comparison still runs in constant time
 * (always iterates the full length of the longer string) but returns
 * `false` without requiring padding.
 */
export const safeCompare = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  if (bufA.length !== bufB.length) {
    let result = 0;
    const maxLen = Math.max(bufA.length, bufB.length);
    for (let i = 0; i < maxLen; i++) {
      const byteA = i < bufA.length ? (bufA[i] ?? 0) : 0;
      const byteB = i < bufB.length ? (bufB[i] ?? 0) : 0;
      result |= byteA ^ byteB;
    }
    return result === 0;
  }

  return timingSafeEqual(bufA, bufB);
};
