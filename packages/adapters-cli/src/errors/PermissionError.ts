import type { CommandError } from './CommandError.js';
import type { CommandAction } from '../interfaces/Command.js';

/**
 * PermissionError — thrown by `PermissionService.require()` when the
 * caller does not have permission to perform an action. The dispatcher
 * catches it and maps it to a `CommandError` with code `PERMISSION`.
 */
export class PermissionError extends Error {
  public readonly action: CommandAction;
  public readonly commandError: CommandError;

  public constructor(action: CommandAction) {
    super(`Permission denied: action "${action}" requires elevated role.`);
    this.name = 'PermissionError';
    this.action = action;
    this.commandError = Object.freeze({
      code: 'PERMISSION',
      message: `Permission denied for action "${action}".`,
    });
  }
}
