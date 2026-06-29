import { describe, expect, it } from 'vitest';
import { jsonParser } from './parser.js';

const MAX = 1_048_576;

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

describe('jsonParser', () => {
  it('parses application/json into the json field', () => {
    const r = jsonParser(MAX)(enc('{"event":"status"}'), 'application/json');
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.value.json as { event: string }).event).toBe('status');
  });

  it('rejects non-empty payloads with unsupported content-type', () => {
    const r = jsonParser(MAX)(enc('hello'), 'text/plain');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('PARSE');
  });

  it('rejects oversized payloads', () => {
    const r = jsonParser(8)(enc('{"big":1}'), 'application/json');
    expect(r.ok).toBe(false);
  });

  it('rejects malformed JSON', () => {
    const r = jsonParser(MAX)(enc('{not-json'), 'application/json');
    expect(r.ok).toBe(false);
  });

  it('parses empty body to null regardless of content-type', () => {
    // Empty bodies short-circuit the content-type check because GET /
    // HEAD requests often have no body and no Content-Type header.
    const r1 = jsonParser(MAX)(new Uint8Array(0), 'application/json');
    expect(r1.ok).toBe(true);
    if (r1.ok) expect(r1.value.json).toBeNull();
    const r2 = jsonParser(MAX)(new Uint8Array(0), '');
    expect(r2.ok).toBe(true);
  });
});
