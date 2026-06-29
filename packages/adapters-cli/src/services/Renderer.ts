/**
 * Renderer — formats `CommandResult` values for either human or JSON output.
 *
 * Per Phase 3.1 architectural adjustments: the CLI does NOT invent an
 * HTTP-style envelope. JSON output is the literal command value (or error
 * object) on its own line — no request IDs, no wrapping, no adapter code.
 * The REST adapter will define the canonical API envelope later.
 */
import type { Result } from '@agent-os/core';
import type { CommandError } from '../errors/CommandError.js';
import type { OutputMode } from '../types/CliContext.js';

const formatHumanValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value, null, 2);
};

const formatHumanError = (error: CommandError): string => {
  const detail =
    error.detail !== undefined && error.detail !== null
      ? `\n${JSON.stringify(error.detail, null, 2)}`
      : '';
  return `error: ${error.code}: ${error.message}${detail}`;
};

export interface RenderedResult {
  readonly stdout: string;
  readonly stderr: string;
}

export const renderResult = <T>(
  result: Result<T, CommandError>,
  mode: OutputMode,
): RenderedResult => {
  if (result.ok) {
    if (mode === 'json') {
      return {
        stdout: result.value === undefined ? '' : `${JSON.stringify(result.value)}\n`,
        stderr: '',
      };
    }
    return { stdout: `${formatHumanValue(result.value)}\n`, stderr: '' };
  }

  if (mode === 'json') {
    return {
      stdout: `${JSON.stringify({ ok: false, error: result.error })}\n`,
      stderr: '',
    };
  }
  return { stdout: '', stderr: `${formatHumanError(result.error)}\n` };
};
