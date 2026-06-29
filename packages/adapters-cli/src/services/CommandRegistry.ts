/**
 * CommandRegistry — registration-based command store.
 *
 * Per docs/architecture/platform.md §5 + Phase 3.1 architectural
 * adjustments: commands are registered dynamically; future plugin commands
 * may register additional commands without modifying this file.
 */
import type { Command } from '../interfaces/Command.js';

export interface CommandRegistry {
  readonly register: <TValue>(command: Command<TValue>) => void;
  readonly get: (name: string) => Command | undefined;
  readonly has: (name: string) => boolean;
  readonly names: () => readonly string[];
}

export const createCommandRegistry = (): CommandRegistry => {
  const byName = new Map<string, Command>();

  return {
    register: <TValue>(command: Command<TValue>): void => {
      if (byName.has(command.name)) {
        throw new Error(`CommandRegistry: command "${command.name}" is already registered.`);
      }
      byName.set(command.name, command as unknown as Command);
    },
    get: (name) => byName.get(name),
    has: (name) => byName.has(name),
    names: () => Array.from(byName.keys()),
  };
};
