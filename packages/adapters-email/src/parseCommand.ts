/**
 * Email subject-line command parser.
 *
 * Per docs/architecture/email.md §10.3:
 *   - Commands are extracted from the email subject line.
 *   - The subject is parsed as: [optional prefix] <command> [arguments].
 *   - Commands are case-insensitive.
 *   - If a configurable prefix is set (e.g. "[AgentOS]"), it is stripped
 *     before command parsing.
 *   - Common email prefixes (Re:, Fwd:, etc.) are stripped.
 *   - Unknown commands return null (no reply sent).
 */

const EMAIL_PREFIXES = ['re:', 'fw:', 'fwd:', 'aw:'] as const;

const stripEmailPrefixes = (subject: string): string => {
  let result = subject;
  for (const prefix of EMAIL_PREFIXES) {
    if (result.toLowerCase().startsWith(prefix)) {
      result = result.slice(prefix.length).trim();
    }
  }
  return result;
};

const stripCommandPrefix = (subject: string, prefix: string): string => {
  if (prefix.length === 0) return subject;
  const bracketed = `[${prefix}]`;
  if (subject.toLowerCase().startsWith(bracketed.toLowerCase())) {
    return subject.slice(bracketed.length).trim();
  }
  return subject;
};

export interface ParsedCommand {
  readonly command: string;
  readonly args: Readonly<Record<string, string>>;
}

export const parseEmailSubject = (subject: string, commandPrefix: string): ParsedCommand | null => {
  if (subject.length === 0) return null;

  let cleaned = stripEmailPrefixes(subject);
  cleaned = stripCommandPrefix(cleaned, commandPrefix);

  if (cleaned.length === 0) return null;

  const parts = cleaned.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase() ?? '';
  if (command.length === 0) return null;

  const options: Record<string, string> = {};
  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i];
    const val = parts[i + 1];
    if (key && val) {
      options[key] = val;
    }
  }

  return { command, args: options };
};

export const KNOWN_COMMANDS = [
  'start',
  'stop',
  'status',
  'health',
  'plugins',
  'config',
  'version',
  'help',
] as const;

export const isKnownCommand = (cmd: string): boolean =>
  (KNOWN_COMMANDS as readonly string[]).includes(cmd);
