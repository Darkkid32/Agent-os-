export { createHermes } from './Hermes.js';
export type {
  Hermes,
  HermesStatus,
  HermesHealthReport,
  ModuleHealthStatus,
  ModuleHealthDetail,
  ModuleSpec,
} from './Hermes.js';

export type { HermesPort } from './HermesPort.js';

export { createHermesBuilder, HermesBuilder } from './HermesBuilder.js';

export { validateConfig } from './HermesConfig.js';
export type { HermesConfig, HermesConfigInput, HermesEnvironment } from './HermesConfig.js';

export { redactHermesConfig } from './redact.js';

export { createHermesContainer } from './HermesContainer.js';
export type { HermesContainer } from './HermesContainer.js';

export { createHermesLifecycle, isHermesLifecyclePhase } from './HermesLifecycle.js';
export type {
  HermesLifecycle,
  HermesLifecyclePhase,
  HermesLifecycleOptions,
  TransitionHandler,
} from './HermesLifecycle.js';

export {
  createHermesEventDispatcher,
  HERMES_TOPIC_FAILED,
  HERMES_TOPIC_INITIALIZING,
  HERMES_TOPIC_STARTED,
  HERMES_TOPIC_STOPPED,
  HERMES_TOPIC_STOPPING,
} from './HermesEventDispatcher.js';
export type {
  HermesEventDispatcher,
  HermesEventDispatcherOptions,
  HermesLifecycleEventPayload,
  HermesLifecycleTopic,
} from './HermesEventDispatcher.js';

export { createHermesModuleRegistry } from './HermesModuleRegistry.js';
export type {
  HermesModuleRegistry,
  HermesModuleSpec,
  HermesModuleRecord,
  HermesModuleHealth,
  ModuleRegisteredHandler,
  ModuleUnregisteredHandler,
} from './HermesModuleRegistry.js';

export { createHermesHealthMonitor } from './HermesHealthMonitor.js';
export type {
  HermesHealthMonitor,
  HermesHealthMonitorOptions,
  HermesHealthDetail,
  HermesHealthMonitorReport,
} from './HermesHealthMonitor.js';

export { createHermesPluginLoader, validatePlugin } from './HermesPluginLoader.js';
export type {
  HermesPluginLoader,
  HermesPluginLoaderOptions,
  HermesFileSystem,
  PluginDynamicImport,
  PluginLoadOutcome,
  PluginLoadSummary,
  PluginLogger,
  PluginEntrySource,
  PluginEntryModule,
  PluginEntryExtension,
  PluginModuleFacade,
  PluginFacadeOptions,
  PluginContainerPort,
  PluginDispatcherPort,
} from './HermesPluginLoader.js';

export const PACKAGE_NAME = '@agent-os/hermes' as const;
export const PACKAGE_VERSION = '0.1.0' as const;
