import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { signatureConfig, verifyHmacSha256 } from './signature.js';

const secret = 'super-secret-shared-key';
const body = Buffer.from('{"event":"status"}', 'utf-8');

const headerMap = (
  entries: ReadonlyArray<readonly [string, string]>,
): ReadonlyMap<string, string> => {
  const m = new Map<string, string>();
  for (const [k, v] of entries) m.set(k.toLowerCase(), v);
  return m;
};

const sigHex = (data: Buffer, s: string): string =>
  createHmac('sha256', s).update(data).digest('hex');

describe('verifyHmacSha256', () => {
  it('accepts a valid signature (no prefix)', () => {
    const sig = sigHex(body, secret);
    const result = verifyHmacSha256({ secret })(
      new Uint8Array(body),
      headerMap([['x-webhook-signature', sig]]),
    );
    expect(result.ok).toBe(true);
  });

  it('accepts a valid signature with sha256= prefix', () => {
    const sig = sigHex(body, secret);
    const result = verifyHmacSha256({ secret, prefix: 'sha256=' })(
      new Uint8Array(body),
      headerMap([['x-webhook-signature', `sha256=${sig}`]]),
    );
    expect(result.ok).toBe(true);
  });

  it('rejects when prefix is wrong', () => {
    const sig = sigHex(body, secret);
    const result = verifyHmacSha256({ secret, prefix: 'sha256=' })(
      new Uint8Array(body),
      headerMap([['x-webhook-signature', `sha512=${sig}`]]),
    );
    expect(result.ok).toBe(false);
  });

  it('rejects a wrong signature', () => {
    const result = verifyHmacSha256({ secret })(
      new Uint8Array(body),
      headerMap([['x-webhook-signature', 'deadbeef']]),
    );
    expect(result.ok).toBe(false);
  });

  it('rejects when the header is missing', () => {
    const result = verifyHmacSha256({ secret })(new Uint8Array(body), headerMap([]));
    expect(result.ok).toBe(false);
  });

  it('rejects when signature length differs (constant-time guard)', () => {
    const result = verifyHmacSha256({ secret })(
      new Uint8Array(body),
      headerMap([['x-webhook-signature', 'ab']]),
    );
    expect(result.ok).toBe(false);
  });
});

describe('signatureConfig helper', () => {
  it('returns a SignatureConfig binding header to verifier', () => {
    const cfg = signatureConfig('X-Sig', verifyHmacSha256({ secret }));
    expect(cfg.header).toBe('X-Sig');
    expect(typeof cfg.verifier).toBe('function');
  });
});
