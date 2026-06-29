/**
 * Default body parsers.
 *
 * `defaultJsonParser` handles application/json and the +json suffix.
 * Anything else returns a ParseError. Consumers can replace this in
 * WebhookAdapterConfig to support XML, form-urlencoded, CBOR, or
 * vendor-specific codecs.
 */
import { err, ok } from '@agent-os/core';
import type { BodyParser, ParseError, ParsedRequest } from './types.js';

const JSON_PATTERN = /^(application\/(?:.+\+)?json)(?:;.*)?$/i;

const tooLargeError: ParseError = {
  code: 'PARSE',
  message: 'request body exceeds the configured maximum',
};

const unsupportedError = (contentType: string): ParseError => ({
  code: 'PARSE',
  message: `unsupported content-type: ${contentType || '(empty)'}`,
});

const malformedError = (e: unknown): ParseError => ({
  code: 'PARSE',
  message: 'malformed JSON body',
  detail: e instanceof Error ? e.message : undefined,
});

/**
 * Build a JSON body parser capped at `maxBodyBytes`. The parser
 * returns only `json`; the caller assembles ParsedRequest alongside
 * the raw bytes and headers.
 */
export const jsonParser =
  (maxBodyBytes: number): BodyParser =>
  (rawBody, contentType) => {
    if (rawBody.byteLength > maxBodyBytes) return err(tooLargeError);
    // Empty bodies (e.g. GET requests) are valid JSON with `null` value.
    // Skip the content-type gate so 0-byte payloads don't surface as
    // "unsupported content-type" errors.
    if (rawBody.byteLength === 0) return ok({ json: null });
    if (!JSON_PATTERN.test(contentType)) return err(unsupportedError(contentType));
    try {
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(rawBody);
      const json = JSON.parse(decoded) as unknown;
      return ok({ json });
    } catch (e) {
      return err(malformedError(e));
    }
  };

/**
 * Stitch the parser's output together with the raw body, content
 * type, and a normalised header map into the ParsedRequest the route
 * handlers receive.
 */
export const assembleParsedRequest = (
  rawBody: Uint8Array,
  contentType: string,
  headers: Headers,
  json: unknown,
): ParsedRequest => {
  const map = new Map<string, string>();
  headers.forEach((value, key) => {
    map.set(key.toLowerCase(), value);
  });
  return { raw: rawBody, contentType, json, headers: map };
};
