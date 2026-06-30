import {
  createPluginConfig,
  type PluginContext,
  type HermesPort,
  type PluginConfigSchema,
  type PluginConfiguration,
} from '@agent-os/plugins';

export interface PluginContextOptions {
  readonly hermes: HermesPort;
  readonly logger: PluginContext['logger'];
  readonly metrics: PluginContext['metrics'];
  readonly tracer: PluginContext['tracer'];
  readonly eventBus: PluginContext['eventBus'];
  readonly pluginId: string;
  readonly configSchema?: PluginConfigSchema;
  readonly configValues?: PluginConfiguration;
}

export const createPluginContext = (options: PluginContextOptions): PluginContext => {
  const { hermes, logger, metrics, tracer, eventBus, pluginId, configSchema, configValues } =
    options;

  const sources =
    configValues != null
      ? [
          {
            priority: 0,
            get: (_pluginId: string): PluginConfiguration => configValues,
          },
        ]
      : [];

  const configOpts: {
    pluginId: string;
    sources: readonly {
      priority: number;
      get: (pluginId: string) => PluginConfiguration | undefined;
    }[];
    schema?: PluginConfigSchema;
  } = { pluginId, sources };

  if (configSchema !== undefined) {
    configOpts.schema = configSchema;
  }

  const config = createPluginConfig(configOpts);

  return {
    hermes,
    logger,
    metrics,
    tracer,
    eventBus,
    config,
  };
};
