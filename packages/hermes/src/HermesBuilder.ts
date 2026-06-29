import { err, ok, type Result } from '@agent-os/core';
import { validateConfig, type HermesConfigInput } from './HermesConfig.js';
import { createHermes, type Hermes } from './Hermes.js';

export class HermesBuilder {
  private configInput: HermesConfigInput | undefined;

  withConfig(input: HermesConfigInput): this {
    this.configInput = input;
    return this;
  }

  withEnvironment(env: Record<string, string | undefined>): this {
    const apiKey = env.OPENROUTER_API_KEY ?? '';
    const dbUrl = env.DATABASE_URL ?? '';
    const redisUrl = env.REDIS_URL ?? '';
    this.configInput = {
      NODE_ENV: env.NODE_ENV,
      LOG_LEVEL: env.LOG_LEVEL,
      OPENROUTER_API_KEY: apiKey,
      DATABASE_URL: dbUrl,
      REDIS_URL: redisUrl,
      OTEL_ENABLED: env.OTEL_ENABLED,
      OTEL_EXPORTER_ENDPOINT: env.OTEL_EXPORTER_ENDPOINT,
      HERMES_MODULES_DIR: env.HERMES_MODULES_DIR,
      HERMES_SHUTDOWN_TIMEOUT_MS: env.HERMES_SHUTDOWN_TIMEOUT_MS,
    };
    return this;
  }

  build(): Result<Hermes, Error> {
    if (!this.configInput) {
      return err(
        new Error(
          'HermesBuilder: config not provided. Call withConfig() or withEnvironment() first.',
        ),
      );
    }

    const configResult = validateConfig(this.configInput);
    if (!configResult.ok) {
      return err(
        new Error(`HermesBuilder: config validation failed: ${configResult.error.message}`),
      );
    }

    const hermes = createHermes(configResult.value);
    return ok(hermes);
  }
}

export const createHermesBuilder = (): HermesBuilder => new HermesBuilder();
