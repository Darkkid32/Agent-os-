import { z, type ZodError } from 'zod';
import type { Result } from '@agent-os/core';

export type HermesEnvironment = 'development' | 'production' | 'test';

export interface HermesConfig {
  readonly nodeEnv: HermesEnvironment;
  readonly logLevel: string;
  readonly openrouterApiKey: string;
  readonly databaseUrl: string;
  readonly redisUrl: string;
  readonly otelEnabled: boolean;
  readonly otelExporterEndpoint: string | undefined;
  readonly hermesModulesDir: string;
  readonly hermesShutdownTimeoutMs: number;
}

const HermesConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  OPENROUTER_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  OTEL_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  OTEL_EXPORTER_ENDPOINT: z.string().optional(),
  HERMES_MODULES_DIR: z.string().default('./modules'),
  HERMES_SHUTDOWN_TIMEOUT_MS: z
    .string()
    .transform((v) => Number(v))
    .pipe(z.number().int().positive())
    .default('30000'),
});

export interface HermesConfigInput {
  readonly NODE_ENV?: string | undefined;
  readonly LOG_LEVEL?: string | undefined;
  readonly OPENROUTER_API_KEY: string;
  readonly DATABASE_URL: string;
  readonly REDIS_URL: string;
  readonly OTEL_ENABLED?: string | undefined;
  readonly OTEL_EXPORTER_ENDPOINT?: string | undefined;
  readonly HERMES_MODULES_DIR?: string | undefined;
  readonly HERMES_SHUTDOWN_TIMEOUT_MS?: string | undefined;
}

const toConfig = (parsed: z.infer<typeof HermesConfigSchema>): HermesConfig =>
  Object.freeze<HermesConfig>({
    nodeEnv: parsed.NODE_ENV,
    logLevel: parsed.LOG_LEVEL,
    openrouterApiKey: parsed.OPENROUTER_API_KEY,
    databaseUrl: parsed.DATABASE_URL,
    redisUrl: parsed.REDIS_URL,
    otelEnabled: parsed.OTEL_ENABLED,
    otelExporterEndpoint: parsed.OTEL_EXPORTER_ENDPOINT,
    hermesModulesDir: parsed.HERMES_MODULES_DIR,
    hermesShutdownTimeoutMs: parsed.HERMES_SHUTDOWN_TIMEOUT_MS,
  });

export const validateConfig = (input: HermesConfigInput): Result<HermesConfig, ZodError> => {
  const result = HermesConfigSchema.safeParse(input);
  if (result.success) {
    return { ok: true, value: toConfig(result.data) };
  }
  return { ok: false, error: result.error };
};
