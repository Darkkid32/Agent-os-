/**
 * Argument parser — tiny argv tokenizer.
 *
 * The CLI does not depend on a third-party argv parser; the command set
 * is small and the syntax is fixed. Each token is either:
 *   - a flag of the form `--name` or `--name=value`
 *   - a positional argument
 *
 * `--json` is the global flag used by the renderer. `--help` is handled
 * by the dispatcher before any command runs.
 */
export interface ParsedArgs {
  readonly positional: readonly string[];
  readonly flags: Readonly<Record<string, string | boolean>>;
  readonly json: boolean;
  readonly help: boolean;
}

export const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  let json = false;
  let help = false;

  for (const token of argv) {
    if (token === '--json') {
      json = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      help = true;
      continue;
    }
    if (token.startsWith('--')) {
      const eq = token.indexOf('=');
      if (eq === -1) {
        flags[token.slice(2)] = true;
      } else {
        flags[token.slice(2, eq)] = token.slice(eq + 1);
      }
      continue;
    }
    positional.push(token);
  }

  return { positional, flags, json, help };
};
