/**
 * Signature verification.
 *
 * Vendor-neutral contract. The default helper, verifyHmacSha256,
 * covers HMAC-style schemes (raw or prefixed like `sha256=…`,
 * `t=…,v1=…`). Consumers bring their own verifier for asymmetric
 * signatures, JWTs, or vendor-specific formats.
 *
 * Comparison is constant-time via Node's crypto.timingSafeEqual so a
 * generic verifier can be safe-by-default.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { err, ok } from '@agent-os/core';
import type { SignatureConfig, SignatureVerifier, VerificationError } from './types.js';

const toUint8Array = (s: string): Uint8Array => new TextEncoder().encode(s);

const constantTimeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};

/**
 * Verifier factory for HMAC-signed bodies. Accepts raw signatures and
 * a configurable prefix (e.g., GitHub's `sha256=`, Stripe-style `v1=`).
 * If `prefix` is set the header value must begin with it or the
 * verifier rejects.
 */
export const verifyHmacSha256 =
  (opts: { readonly secret: string; readonly prefix?: string }): SignatureVerifier =>
  (rawBody, headers) => {
    const headerValue = headers.get('x-webhook-signature');
    if (!headerValue) {
      const errResult: VerificationError = {
        code: 'VERIFICATION',
        message: 'signature header missing',
      };
      return err(errResult);
    }

    let provided = headerValue.trim();
    if (opts.prefix) {
      if (!provided.startsWith(opts.prefix)) {
        const errResult: VerificationError = {
          code: 'VERIFICATION',
          message: 'signature prefix mismatch',
        };
        return err(errResult);
      }
      provided = provided.slice(opts.prefix.length);
    }

    const expected = createHmac('sha256', opts.secret).update(rawBody).digest('hex');
    const providedBytes = toUint8Array(provided.toLowerCase());
    const expectedBytes = toUint8Array(expected.toLowerCase());
    if (!constantTimeEqual(providedBytes, expectedBytes)) {
      const errResult: VerificationError = {
        code: 'VERIFICATION',
        message: 'signature mismatch',
      };
      return err(errResult);
    }
    return ok(undefined);
  };

/**
 * Convenience for callers that want a fully-formed SignatureConfig
 * bound to a specific header name. Useful in factories.
 */
export const signatureConfig = (header: string, verifier: SignatureVerifier): SignatureConfig => ({
  header,
  verifier,
});
