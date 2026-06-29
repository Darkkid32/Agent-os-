/**
 * CliAdapter — the sole component that owns dispatch, REPL state, NDJSON
 * state, lifecycle (`initialize/start/stop/health/metadata`), and exit code
 * mapping. Commands are stateless; the adapter composes the registry,
 * permission service, HermesPort, parser, and renderer.
 *
 * Phase 3.1 — CLI Adapter.
 * Per docs/architecture/platform.md §4.1 the adapter implements the
 * shared adapter lifecycle. Per Phase 3.1 architectural adjustments:
 *   - HermesPort (not Hermes) is the kernel dependency.
 *   - initialize() is readiness-only (registry + parser + renderer + port).
 *   - Permission checks live inside commands (via ctx.permissions).
 *   - No CLI-specific error envelope; the renderer formats results.
 *   - Adapter health is the CLI's own, NOT hermes.health().
 */
import { createInterface, type Interface as Readline } from 'node:readline';
import { err, now, ok, type Result } from '@agent-os/core';
import type {
  AdapterHealth,
  AdapterHealthStatus,
  AdapterMetadata,
} from '@agent-os/core/adapter-metadata';
import type { HermesPort } from '@agent-os/hermes';
import { type Logger, createLogger, withSpan } from '@agent-os/observability';
import type { Command, CommandArgs } from '../interfaces/Command.js';
import { createCommandRegistry, type CommandRegistry } from './CommandRegistry.js';
import { createPermissionService, type CliRole, type PermissionService } from './Permissions.js';
import { parseArgs, type ParsedArgs } from './ArgvParser.js';
import { renderResult, type RenderedResult } from './Renderer.js';
import type { CommandError } from '../errors/CommandError.js';
import type { CliErrorCode } from '../errors/CliErrorCode.js';
import { PermissionError } from '../errors/PermissionError.js';
import type { CliContext, OutputMode } from '../types/CliContext.js';

import { startCommand } from '../commands/StartCommand.js';
import { stopCommand } from '../commands/StopCommand.js';
import { statusCommand } from '../commands/StatusCommand.js';
import { healthCommand } from '../commands/HealthCommand.js';
import { pluginsCommand } from '../commands/PluginsCommand.js';
import { configCommand } from '../commands/ConfigCommand.js';
import { versionCommand } from '../commands/VersionCommand.js';

export const CLI_PACKAGE_NAME = '@agent-os/adapters-cli' as const;
export const CLI_PACKAGE_VERSION = '0.1.0' as const;

/**
 * Per-platform.md §4.3, every adapter declares its identity as
 * `AdapterMetadata`. The CLI's `interfaceType` is fixed to `'cli'`.
 */
export type CliMetadata = AdapterMetadata;

export type CliAdapterHealthStatus = AdapterHealthStatus;
export type CliAdapterHealth = AdapterHealth;

export interface CliInitConfig {
  readonly hermes: HermesPort;
  readonly role: CliRole;
  readonly logger?: Logger;
}

export interface CliDispatchResult {
  readonly exitCode: number;
  readonly rendered: RenderedResult;
}

/**
 * Build the canonical registry with the seven required commands. External
 * callers may register additional commands by calling `registry.register(...)`
 * after construction — the registry is the same instance returned by
 * `getRegistry()` on the adapter.
 */
const buildDefaultRegistry = (): CommandRegistry => {
  const r = createCommandRegistry();
  r.register(startCommand);
  r.register(stopCommand);
  r.register(statusCommand);
  r.register(healthCommand);
  r.register(pluginsCommand);
  r.register(configCommand);
  r.register(versionCommand);
  return r;
};

export interface CliAdapter {
  readonly initialize: (config: CliInitConfig) => Promise<Result<void>>;
  readonly start: () => Promise<Result<void>>;
  readonly stop: () => Promise<Result<void>>;
  readonly health: () => Promise<CliAdapterHealth>;
  readonly metadata: () => CliMetadata;
  readonly getRegistry: () => CommandRegistry;
  readonly dispatch: (argv: readonly string[]) => Promise<CliDispatchResult>;
  readonly runInteractive: (input?: NodeJS.ReadableStream) => Promise<number>;
  readonly runStdin: (input: NodeJS.ReadableStream) => Promise<number>;
}

export const createCliAdapter = (): CliAdapter => {
  let registry: CommandRegistry | undefined;
  let permissions: PermissionService | undefined;
  let hermes: HermesPort | undefined;
  let logger: Logger | undefined;
  let initialized = false;
  let started = false;

  const buildContext = (output: OutputMode): CliContext => {
    if (!hermes || !permissions) {
      throw new Error('CliAdapter: not initialized.');
    }
    return {
      hermes,
      permissions,
      output,
      now,
    };
  };

  const mapErrorToExitCode = (code: string): number => {
    switch (code) {
      case 'USAGE':
        return 2;
      case 'PERMISSION':
        return 3;
      case 'PHASE':
        return 4;
      case 'TIMEOUT':
        return 5;
      case 'SIGNAL':
        return 6;
      default:
        return 1;
    }
  };

  const handleCommand = async (cmd: Command, parsed: ParsedArgs): Promise<CliDispatchResult> => {
    return withSpan(`cli.${cmd.name}`, async (span) => {
      const output: OutputMode = parsed.json ? 'json' : 'human';
      const ctx = buildContext(output);
      const args: CommandArgs = { positional: parsed.positional, flags: parsed.flags };
      logger?.info('command start', { command: cmd.name });

      const handlerResult: Result<unknown, CommandError> = await (async (): Promise<
        Result<unknown, CommandError>
      > => {
        try {
          if (cmd.requires) {
            try {
              ctx.permissions.require(cmd.requires);
            } catch (e) {
              if (e instanceof PermissionError) {
                return { ok: false, error: e.commandError };
              }
              throw e;
            }
          }
          return await cmd.handler(ctx, args);
        } catch (e) {
          const code: CliErrorCode = 'INTERNAL';
          logger?.error('command failed', {
            command: cmd.name,
            error: e instanceof Error ? e.message : String(e),
          });
          return {
            ok: false,
            error: {
              code,
              message: e instanceof Error ? e.message : String(e),
            },
          };
        }
      })();

      const rendered = renderResult(handlerResult, output);
      const exitCode = handlerResult.ok ? 0 : mapErrorToExitCode(handlerResult.error.code);
      span.setAttribute('command', cmd.name);
      span.setAttribute('exit_code', exitCode);
      logger?.info('command end', { command: cmd.name, exitCode });
      return { exitCode, rendered };
    });
  };

  const dispatchInternal = async (argv: readonly string[]): Promise<CliDispatchResult> => {
    if (!registry) {
      const rendered = renderResult(
        { ok: false, error: { code: 'USAGE', message: 'CliAdapter is not initialized.' } },
        'human',
      );
      return { exitCode: 2, rendered };
    }
    const parsed = parseArgs(argv);
    const name = parsed.positional[0];

    if (parsed.help) {
      if (name === undefined) {
        return { exitCode: 0, rendered: renderHelp(registry).rendered };
      }
      const cmd = registry.get(name);
      if (cmd === undefined) {
        const rendered = renderResult(
          { ok: false, error: { code: 'USAGE', message: `Unknown command: "${name}".` } },
          parsed.json ? 'json' : 'human',
        );
        return { exitCode: 2, rendered };
      }
      return renderCommandHelp(cmd, parsed.json ? 'json' : 'human');
    }

    if (name === undefined) {
      const rendered = renderResult(
        { ok: false, error: { code: 'USAGE', message: 'No command supplied.' } },
        parsed.json ? 'json' : 'human',
      );
      return { exitCode: 2, rendered };
    }

    const cmd = registry.get(name);
    if (cmd === undefined) {
      const rendered = renderResult(
        { ok: false, error: { code: 'USAGE', message: `Unknown command: "${name}".` } },
        parsed.json ? 'json' : 'human',
      );
      return { exitCode: 2, rendered };
    }

    const rest = parsed.positional.slice(1);
    return handleCommand(cmd, { ...parsed, positional: rest });
  };

  return {
    initialize: async (config: CliInitConfig): Promise<Result<void>> => {
      try {
        hermes = config.hermes;
        permissions = createPermissionService(config.role);
        logger = (config.logger ?? createLogger()).child('cli');
        if (!registry) registry = buildDefaultRegistry();
        initialized = true;
        logger.info('initialized');
        return ok(undefined);
      } catch (e) {
        return err(e instanceof Error ? e : new Error(String(e)));
      }
    },

    start: async (): Promise<Result<void>> => {
      if (!initialized) {
        return err(new Error('CliAdapter: cannot start before initialize().'));
      }
      started = true;
      logger?.info('started');
      return ok(undefined);
    },

    stop: async (): Promise<Result<void>> => {
      started = false;
      logger?.info('stopped');
      return ok(undefined);
    },

    health: async (): Promise<CliAdapterHealth> => {
      const status: CliAdapterHealthStatus = !initialized
        ? 'unknown'
        : !started
          ? 'degraded'
          : registry === undefined
            ? 'failed'
            : 'healthy';
      const detail =
        status === 'unknown'
          ? 'adapter not initialized'
          : status === 'degraded'
            ? 'adapter not started'
            : status === 'failed'
              ? 'registry missing'
              : undefined;
      const base = { status, at: now() };
      return detail === undefined ? base : { ...base, detail };
    },

    metadata: (): CliMetadata => ({
      name: CLI_PACKAGE_NAME,
      version: CLI_PACKAGE_VERSION,
      interfaceType: 'cli',
      supportedOperations: registry ? registry.names() : [],
    }),

    getRegistry: (): CommandRegistry => {
      if (!registry) registry = buildDefaultRegistry();
      return registry;
    },

    dispatch: (argv) => dispatchInternal(argv),

    runInteractive: async (input) => {
      const rl = createInterface({
        input: input ?? process.stdin,
        output: process.stdout,
        terminal: true,
      });
      try {
        let exitCode = 0;
        const prompt = 'agent-os> ';
        for await (const line of rl) {
          const trimmed = line.trim();
          if (trimmed.length === 0) {
            rl.write(prompt);
            continue;
          }
          if (trimmed === 'exit' || trimmed === 'quit') {
            exitCode = 0;
            break;
          }
          if (trimmed === 'help') {
            if (registry) {
              process.stdout.write(`${renderHelp(registry).rendered.stdout}\n${prompt}`);
            }
            continue;
          }
          const tokens = trimmed.split(/\s+/);
          const result = await dispatchInternal(tokens);
          process.stdout.write(result.rendered.stdout);
          process.stderr.write(result.rendered.stderr);
          rl.write(prompt);
          exitCode = result.exitCode;
        }
        return exitCode;
      } finally {
        rl.close();
      }
    },

    runStdin: async (stdin) => {
      const rl: Readline = createInterface({ input: stdin, terminal: false, crlfDelay: Infinity });
      let lastExitCode = 0;
      for await (const line of rl) {
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        try {
          const tokens = JSON.parse(trimmed) as unknown;
          if (!Array.isArray(tokens)) {
            process.stdout.write(
              `${JSON.stringify({ ok: false, error: { code: 'USAGE', message: 'Expected JSON array of tokens.' } })}\n`,
            );
            lastExitCode = 2;
            continue;
          }
          const argv = tokens.map((t) => String(t));
          const result = await dispatchInternal(argv);
          process.stdout.write(result.rendered.stdout);
          process.stderr.write(result.rendered.stderr);
          lastExitCode = result.exitCode;
        } catch (e) {
          process.stdout.write(
            `${JSON.stringify({ ok: false, error: { code: 'INTERNAL', message: e instanceof Error ? e.message : String(e) } })}\n`,
          );
          lastExitCode = 1;
        }
      }
      return lastExitCode;
    },
  };
};

const renderHelp = (registry: CommandRegistry): { readonly rendered: RenderedResult } => {
  const lines: string[] = ['Available commands:'];
  for (const name of registry.names()) {
    const cmd = registry.get(name);
    if (cmd) lines.push(`  ${name.padEnd(10)} ${cmd.summary}`);
  }
  lines.push('', 'Global flags: --json, --help', '', 'Interactive commands: help, exit, quit');
  const rendered: RenderedResult = { stdout: `${lines.join('\n')}\n`, stderr: '' };
  return { rendered };
};

const renderCommandHelp = (cmd: Command, mode: OutputMode): CliDispatchResult => {
  const payload = { name: cmd.name, summary: cmd.summary, usage: cmd.usage };
  const rendered = renderResult({ ok: true, value: payload }, mode);
  return { exitCode: 0, rendered };
};
