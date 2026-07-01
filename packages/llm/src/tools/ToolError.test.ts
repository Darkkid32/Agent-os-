/**
 * Tests for tool error classes.
 */
import { describe, it, expect } from 'vitest';
import {
  ToolError,
  ToolNotFoundError,
  ToolValidationError,
  ToolPermissionError,
  ToolTimeoutError,
  ToolPluginUnavailableError,
  ToolExecutionError,
  ToolDisabledError,
  isToolError,
} from './ToolError.js';

describe('ToolError hierarchy', () => {
  it('every subclass carries the correct ToolErrorCode', () => {
    expect(new ToolNotFoundError('t').code).toBe('TOOL_NOT_FOUND');
    expect(new ToolValidationError('t', []).code).toBe('TOOL_VALIDATION_FAILED');
    expect(new ToolPermissionError('t', []).code).toBe('TOOL_PERMISSION_DENIED');
    expect(new ToolTimeoutError('t', 1000).code).toBe('TOOL_TIMEOUT');
    expect(new ToolPluginUnavailableError('t', 'p').code).toBe('TOOL_PLUGIN_UNAVAILABLE');
    expect(new ToolExecutionError('t', 'msg').code).toBe('TOOL_EXECUTION_FAILED');
    expect(new ToolDisabledError('t').code).toBe('TOOL_DISABLED');
  });

  it('preserves toolId, name, message', () => {
    const e = new ToolNotFoundError('my-tool');
    expect(e.toolId).toBe('my-tool');
    expect(e.message).toBe('Tool "my-tool" is not registered.');
    expect(e.name).toBe('ToolNotFoundError');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(ToolError);
  });

  it('ToolValidationError stores validationErrors', () => {
    const e = new ToolValidationError('t', ['err1', 'err2']);
    expect(e.validationErrors).toEqual(['err1', 'err2']);
    expect(e.message).toContain('err1');
    expect(e.message).toContain('err2');
  });

  it('ToolPermissionError stores required permissions', () => {
    const e = new ToolPermissionError('t', ['admin', 'write']);
    expect(e.required).toEqual(['admin', 'write']);
    expect(e.message).toContain('admin');
  });

  it('ToolTimeoutError includes timeout value', () => {
    const e = new ToolTimeoutError('t', 5000);
    expect(e.message).toContain('5000ms');
  });

  it('ToolPluginUnavailableError includes plugin and tool ids', () => {
    const e = new ToolPluginUnavailableError('tool1', 'plugin1');
    expect(e.message).toContain('plugin1');
    expect(e.message).toContain('tool1');
  });

  it('ToolExecutionError preserves cause', () => {
    const cause = new Error('inner');
    const e = new ToolExecutionError('t', 'failed', { cause });
    expect(e.cause).toBe(cause);
  });

  it('cause defaults to undefined', () => {
    const e = new ToolDisabledError('t');
    expect(e.cause).toBeUndefined();
  });
});

describe('isToolError', () => {
  it('returns true for ToolError instances', () => {
    expect(isToolError(new ToolNotFoundError('t'))).toBe(true);
    expect(isToolError(new ToolValidationError('t', []))).toBe(true);
    expect(isToolError(new ToolPermissionError('t', []))).toBe(true);
    expect(isToolError(new ToolTimeoutError('t', 100))).toBe(true);
    expect(isToolError(new ToolPluginUnavailableError('t', 'p'))).toBe(true);
    expect(isToolError(new ToolExecutionError('t', 'msg'))).toBe(true);
    expect(isToolError(new ToolDisabledError('t'))).toBe(true);
  });

  it('returns false for non-ToolError values', () => {
    expect(isToolError(new Error('plain'))).toBe(false);
    expect(isToolError({})).toBe(false);
    expect(isToolError(null)).toBe(false);
    expect(isToolError('string')).toBe(false);
    expect(isToolError(undefined)).toBe(false);
    expect(isToolError(42)).toBe(false);
  });
});
