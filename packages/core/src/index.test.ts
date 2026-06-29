import { describe, expect, it } from 'vitest';
import { err, ok, type Result } from './index.js';
import { errOf, expectErr, expectOk, okOf } from './test-utils.js';

describe('core Result', () => {
  it('ok carries a value and exposes ok=true', () => {
    const r: Result<number> = ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });

  it('err carries an Error and exposes ok=false', () => {
    const r: Result<number> = err(new Error('boom'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toBe('boom');
  });
});

describe('core test-utils', () => {
  it('okOf / errOf build canonical Results', () => {
    expect(okOf('x').ok).toBe(true);
    expect(errOf('boom').ok).toBe(false);
  });

  it('expectOk throws a useful message on err', () => {
    expect(() => expectOk(err(new Error('bad')))).toThrow(/expectOk.*bad/);
  });

  it('expectErr throws a useful message on ok', () => {
    expect(() => expectErr(ok('nope'))).toThrow(/expectErr.*nope/);
  });
});
