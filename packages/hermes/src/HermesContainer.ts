type Factory<T> = () => T;

interface InternalBinding {
  readonly scope: 'singleton' | 'transient';
  readonly factory: Factory<unknown>;
  cached: unknown;
  cachedIsSet: boolean;
}

export interface HermesContainer {
  readonly register: <T>(name: string, factory: Factory<T>) => void;
  readonly resolve: <T = unknown>(name: string) => T;
  readonly has: (name: string) => boolean;
  readonly singleton: <T>(name: string, factory: Factory<T>) => void;
  readonly transient: <T>(name: string, factory: Factory<T>) => void;
}

const assertName = (name: string): void => {
  if (name.length === 0) {
    throw new Error('HermesContainer: service name must be a non-empty string.');
  }
};

export const createHermesContainer = (): HermesContainer => {
  const bindings = new Map<string, InternalBinding>();

  const setBinding = (
    name: string,
    scope: 'singleton' | 'transient',
    factory: Factory<unknown>,
  ): void => {
    bindings.set(name, { scope, factory, cached: undefined, cachedIsSet: false });
  };

  const resolve = <T = unknown>(name: string): T => {
    assertName(name);
    const binding = bindings.get(name);
    if (!binding) {
      throw new Error(`HermesContainer: service "${name}" is not registered.`);
    }
    if (binding.scope === 'singleton') {
      if (binding.cachedIsSet) return binding.cached as T;
      const instance = binding.factory();
      binding.cached = instance;
      binding.cachedIsSet = true;
      return instance as T;
    }
    return binding.factory() as T;
  };

  const register = <T>(
    name: string,
    factory: Factory<T>,
    scope: 'singleton' | 'transient',
  ): void => {
    assertName(name);
    if (typeof factory !== 'function') {
      throw new Error(`HermesContainer: factory for "${name}" must be a function.`);
    }
    setBinding(name, scope, factory as Factory<unknown>);
  };

  const container: HermesContainer = {
    register: <T>(name: string, factory: Factory<T>): void => register(name, factory, 'singleton'),

    resolve,

    has: (name: string): boolean => {
      assertName(name);
      return bindings.has(name);
    },

    singleton: <T>(name: string, factory: Factory<T>): void => register(name, factory, 'singleton'),

    transient: <T>(name: string, factory: Factory<T>): void => register(name, factory, 'transient'),
  };

  return container;
};
