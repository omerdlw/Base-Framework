"use client";

import {
  createContext,
  isValidElement,
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRequiredContext } from "@/core/hooks";
import {
  applyOperation,
  createInitialRegistries,
  createRecordKey,
  createRegisterOperation,
  createResolverCache,
  createUnregisterOperation,
  hasOperationEffect,
  isValidRegistryTarget,
  resolveEffectiveOperations,
} from "./operations";
import {
  DEFAULT_SOURCE,
  REGISTRY_SOURCES,
  REGISTRY_VALIDATION_MODES,
  validateRegistryKey,
  validateRegistryMetadata,
  validateRegistryValue,
} from "./schema";
import { createRegistryTransaction } from "./runtime";
import type {
  RegistrationHandle,
  RegistryOperation,
  RegistryQueue,
  RegistryStore,
} from "./types";

const NOOP = () => {};
const IDENTITY_SELECTOR = (value: any) => value;
const EMPTY_ENTRIES: Readonly<Record<string, any>> = Object.freeze({});

function createNoopHandle(
  status = "rejected",
  reason = "unknown",
): RegistrationHandle {
  const handle: any = () => {};
  return Object.assign(handle, {
    active: false,
    dispose: () => false,
    instanceId: null,
    key: "",
    priority: 0,
    reason,
    source: "",
    status,
    type: "",
    update: () => handle,
    updatedAt: 0,
    validation: "warn",
  });
}

const NOOP_HANDLE: RegistrationHandle = createNoopHandle();

function isNoopHandle(handle: any): boolean {
  return (
    handle === NOOP_HANDLE ||
    handle?.status === "rejected" ||
    handle?.status === "ignored"
  );
}

function cloneRegistryValue(value: any, seen = new WeakMap()): any {
  if (value === null || typeof value !== "object" || isValidElement(value)) {
    return value;
  }

  const prototype = Object.getPrototypeOf(value);
  const isPlainObject =
    !Array.isArray(value) &&
    (prototype === Object.prototype || prototype === null);

  if (!Array.isArray(value) && !isPlainObject) return value;
  if (seen.has(value)) return seen.get(value);

  const clone: any = Array.isArray(value) ? [] : {};
  seen.set(value, clone);

  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      clone[key] = cloneRegistryValue(value[key], seen);
    }
  }

  return clone;
}

function useLazyRef<T>(factory: () => T) {
  const ref = useRef<T | null>(null);
  if (ref.current === null) {
    ref.current = factory();
  }
  return ref as React.MutableRefObject<T>;
}

function normalizeInitialEntries(entries: any): any[] {
  return (Array.isArray(entries) ? entries : []).filter(
    (entry) => entry?.type && entry?.items && typeof entry.items === "object",
  );
}

function createInitialState(entries: any): Record<string, Record<string, any>> {
  const normalizedEntries = normalizeInitialEntries(entries);
  if (normalizedEntries.length === 0) return createInitialRegistries();

  const timestamp = Date.now();
  let sequence = 0;
  let state = createInitialRegistries();

  normalizedEntries.forEach((entry) => {
    const source = entry.source || REGISTRY_SOURCES.STATIC;
    const options = {
      ...(entry.options || {}),
      instanceId:
        entry.instanceId || entry.options?.instanceId || "registry-initial",
    };

    Object.entries(entry.items).forEach(([key, value]) => {
      const validation = validateRegistration(
        entry.type,
        key,
        value,
        source,
        options,
      );
      if (!validation.valid) return;

      const operation = createRegisterOperation(
        entry.type,
        key,
        cloneRegistryValue(value),
        source,
        options,
        timestamp,
        ++sequence,
      );
      if (hasOperationEffect(state, operation)) {
        state = applyOperation(state, operation);
      }
    });
  });
  return state;
}

function notifyListeners(listeners: Set<() => void> | undefined): void {
  if (!listeners) return;
  for (const listener of listeners) {
    try {
      listener();
    } catch {}
  }
}

function getOrCreateKeyListeners(
  listenersByType: Map<string, Map<string | null, Set<() => void>>>,
  type: string,
  key: string | null,
): Set<() => void> {
  let listeners = listenersByType.get(type);
  if (!listeners) {
    listeners = new Map();
    listenersByType.set(type, listeners);
  }
  let keyListeners = listeners.get(key);
  if (!keyListeners) {
    keyListeners = new Set();
    listeners.set(key, keyListeners);
  }
  return keyListeners;
}

function resolveRegistrationOptions(
  sourceOrOptions: any,
  optionsArg?: any,
): Record<string, any> {
  if (sourceOrOptions && typeof sourceOrOptions === "object")
    return sourceOrOptions;
  return optionsArg && typeof optionsArg === "object" ? optionsArg : {};
}

function validateRegistration(
  type: string,
  key: string,
  value: any,
  sourceOrOptions: any,
  optionsArg?: any,
): { issues?: string[]; reason?: string; valid: boolean } {
  const options = resolveRegistrationOptions(sourceOrOptions, optionsArg);
  const metadataValidation = validateRegistryMetadata(options);
  const isStrict = options.validation === REGISTRY_VALIDATION_MODES.STRICT;

  if (!metadataValidation.valid && isStrict) {
    return {
      issues: metadataValidation.issues,
      reason: "invalid-metadata",
      valid: false,
    };
  }

  const validation = validateRegistryValue(type, key, value);
  if (validation.valid) return { valid: true };

  return {
    issues: validation.issues,
    reason: "invalid-value",
    valid: !isStrict,
  };
}

function createRegistrationHandle(
  store: any,
  operation: any,
): RegistrationHandle {
  let disposed = false;
  const dispose = (reason = "manual") => {
    if (disposed) return false;
    disposed = true;
    store.dispose(operation, reason);
    return true;
  };

  const handle: any = (reason?: string) => handle.dispose(reason);
  handle.dispose = dispose;

  handle.update = (value: any, options: Record<string, any> = {}) => {
    if (disposed || !store.isCurrent(operation)) return NOOP_HANDLE;
    const nextHandle = store.register(
      operation.type,
      operation.key,
      value,
      operation.source,
      {
        ...(typeof options === "object" ? options : {}),
        instanceId: operation.instanceId,
        priority: operation.record.priority,
        ...(operation.scope ? { scope: operation.scope } : {}),
        ...(operation.validation ? { validation: operation.validation } : {}),
      },
    );
    if (isNoopHandle(nextHandle)) return handle;
    disposed = true;
    return nextHandle;
  };

  Object.defineProperties(handle, {
    active: {
      enumerable: true,
      get: () => !disposed && store.isCurrent(operation),
    },
    instanceId: { enumerable: true, value: operation.instanceId },
    key: { enumerable: true, value: operation.key },
    priority: { enumerable: true, value: operation.record.priority },
    source: { enumerable: true, value: operation.source },
    status: {
      enumerable: true,
      get: () =>
        disposed
          ? "disposed"
          : store.isCurrent(operation)
            ? "active"
            : "superseded",
    },
    type: { enumerable: true, value: operation.type },
    updatedAt: { enumerable: true, value: operation.record.updatedAt },
    validation: { enumerable: true, value: operation.validation || "warn" },
  });

  return handle as RegistrationHandle;
}

export function createRegistryStore(
  initialEntries: any[] | readonly any[] = [],
): RegistryStore {
  let registries = createInitialState(initialEntries);
  let sequence = normalizeInitialEntries(initialEntries).reduce(
    (count, entry) => count + Object.keys(entry.items).length,
    0,
  );

  const listenersByType = new Map<
    string,
    Map<string | null, Set<() => void>>
  >();
  const entrySnapshots = new Map<string, any>();
  const valueSnapshots = new Map<string, any>();
  const resolveCachedValue = createResolverCache();

  const subscribe = (
    type: string,
    key: string | null | undefined,
    listener: () => void,
  ) => {
    const keyListeners = getOrCreateKeyListeners(
      listenersByType,
      type,
      key ?? null,
    );
    keyListeners.add(listener);

    return () => {
      keyListeners.delete(listener);
      if (keyListeners.size > 0) return;

      const listeners = listenersByType.get(type);
      if (listeners) {
        listeners.delete(key ?? null);
        if (listeners.size === 0) listenersByType.delete(type);
      }
    };
  };

  const commit = (nextState: any, operations: RegistryOperation[] = []) => {
    if (registries === nextState) return;
    const previousState = registries;
    registries = nextState;

    const changedKeysByType = new Map<string, Set<string>>();
    for (const operation of operations) {
      if (!isValidRegistryTarget(operation?.type, operation?.key)) continue;
      let keys = changedKeysByType.get(operation.type);
      if (!keys) {
        keys = new Set();
        changedKeysByType.set(operation.type, keys);
      }
      keys.add(operation.key);
    }

    for (const [type, changedKeys] of changedKeysByType) {
      const previousRegistry = previousState[type] || {};
      const nextRegistry = nextState[type] || {};
      const typeListeners = listenersByType.get(type);
      let typeChanged = false;

      if (!typeListeners) continue;

      for (const key of changedKeys) {
        if (previousRegistry[key] === nextRegistry[key]) continue;
        typeChanged = true;
        notifyListeners(typeListeners.get(key));
      }

      if (typeChanged) {
        notifyListeners(typeListeners.get(null));
      }
    }
  };

  const isCurrent = (operation: any) => {
    const entry = registries[operation.type]?.[operation.key];
    const recordKey = createRecordKey(
      operation.source,
      operation.instanceId,
      operation.scope,
    );
    return entry?.[recordKey] === operation.record;
  };

  const dispose = (operation: any, reason = "manual"): boolean => {
    if (!isCurrent(operation)) return false;
    const unregisterOperation = createUnregisterOperation(
      operation.type,
      operation.key,
      {
        source: operation.source,
        instanceId: operation.instanceId,
        scope: operation.scope,
      },
    );

    if (!hasOperationEffect(registries, unregisterOperation)) return false;
    commit(applyOperation(registries, unregisterOperation), [
      unregisterOperation,
    ]);
    return true;
  };

  const register = (
    type: string,
    key: string,
    item: any,
    sourceOrOptions: any = DEFAULT_SOURCE,
    optionsArg: any = {},
  ): RegistrationHandle => {
    if (!isValidRegistryTarget(type, key)) {
      return createNoopHandle("rejected", "invalid-target");
    }

    const validation = validateRegistration(
      type,
      key,
      item,
      sourceOrOptions,
      optionsArg,
    );
    if (!validation.valid)
      return createNoopHandle("rejected", validation.reason);

    const timestamp = Date.now();
    const operation = createRegisterOperation(
      type,
      key,
      cloneRegistryValue(item),
      sourceOrOptions,
      optionsArg,
      timestamp,
      ++sequence,
    );

    if (!hasOperationEffect(registries, operation)) {
      return createNoopHandle("ignored", "unchanged");
    }

    commit(applyOperation(registries, operation), [operation]);
    return createRegistrationHandle(store, operation);
  };

  const unregister = (
    type: string,
    key: string,
    sourceOrOptions: any = DEFAULT_SOURCE,
  ): void => {
    if (!isValidRegistryTarget(type, key)) return;
    const operation = createUnregisterOperation(type, key, sourceOrOptions);
    if (!hasOperationEffect(registries, operation)) return;

    commit(applyOperation(registries, operation), [operation]);
  };

  const batch = (executor: (queue: RegistryQueue) => void): number => {
    if (typeof executor !== "function") return 0;
    const timestamp = Date.now();
    const operations: any[] = [];

    const queue: RegistryQueue = {
      register: (
        type: string,
        key: string,
        item: any,
        sourceOrOptions: any = DEFAULT_SOURCE,
        optionsArg: any = {},
      ): RegistrationHandle => {
        if (!isValidRegistryTarget(type, key)) {
          return createNoopHandle("rejected", "invalid-target");
        }
        const validation = validateRegistration(
          type,
          key,
          item,
          sourceOrOptions,
          optionsArg,
        );
        if (!validation.valid)
          return createNoopHandle("rejected", validation.reason);

        const operation = createRegisterOperation(
          type,
          key,
          cloneRegistryValue(item),
          sourceOrOptions,
          optionsArg,
          timestamp,
          ++sequence,
        );
        operations.push(operation);
        return createRegistrationHandle(store, operation);
      },
      unregister: (
        type: string,
        key: string,
        sourceOrOptions: any = DEFAULT_SOURCE,
      ): void => {
        if (!isValidRegistryTarget(type, key)) return;
        operations.push(createUnregisterOperation(type, key, sourceOrOptions));
      },
    };

    executor(queue);
    if (operations.length === 0) return 0;

    const { effectiveOperations, nextState } = resolveEffectiveOperations(
      registries,
      operations,
    );
    if (effectiveOperations.length === 0) return 0;

    commit(nextState, effectiveOperations);
    return effectiveOperations.length;
  };

  const getSnapshot = (
    type: string,
    key: string,
    scope: string | null = null,
  ): any => {
    const entry = registries[type]?.[key];
    let snapshots = valueSnapshots.get(type);
    if (!snapshots) {
      snapshots = new Map();
      valueSnapshots.set(type, snapshots);
    }

    const cacheKey = `${scope ?? "null"}::${key}`;
    const cached = snapshots.get(cacheKey);

    if (cached && cached.entry === entry) return cached.value;

    const value = resolveCachedValue(type, entry, scope);
    snapshots.set(cacheKey, { entry, value });
    return value;
  };

  const getEntriesSnapshot = (
    type: string,
    scope: string | null = null,
  ): Record<string, any> => {
    const typeRegistry = registries[type] || {};

    const cacheKey = `${type}::${scope ?? "null"}`;
    const cached = entrySnapshots.get(cacheKey);

    if (cached?.typeRegistry === typeRegistry) return cached.value;

    const resolved: Record<string, any> = {};
    for (const key in typeRegistry) {
      if (Object.prototype.hasOwnProperty.call(typeRegistry, key)) {
        const value = resolveCachedValue(type, typeRegistry[key], scope);
        if (value !== undefined) resolved[key] = value;
      }
    }

    const finalValue = Object.freeze(resolved);
    entrySnapshots.set(cacheKey, { typeRegistry, value: finalValue });
    return finalValue;
  };

  const store: RegistryStore = {
    batch,
    dispose,
    getEntriesSnapshot,
    getSnapshot,
    isCurrent,
    register,
    subscribe,
    transaction: (executor: any, metadata = {}) =>
      createRegistryTransaction(store, metadata).run(executor),
    unregister,
  };
  return store;
}

const RegistryContext = createContext<any>(null);

export function RegistryProvider({
  children,
  initialEntries = [],
}: {
  children?: ReactNode;
  initialEntries?: any[] | readonly any[];
}) {
  const storeRef = useLazyRef(() => createRegistryStore(initialEntries));

  const contextValue = useMemo(
    () => ({
      actions: {
        batch: storeRef.current.batch,
        register: storeRef.current.register,
        transaction: storeRef.current.transaction,
        unregister: storeRef.current.unregister,
      },
      subscription: {
        getEntriesSnapshot: storeRef.current.getEntriesSnapshot,
        getSnapshot: storeRef.current.getSnapshot,
        subscribe: storeRef.current.subscribe,
      },
    }),
    [storeRef],
  );

  return (
    <RegistryContext value={contextValue}>
      {children}
    </RegistryContext>
  );
}

export function useRegistryActions(): any {
  return useRequiredContext(
    RegistryContext,
    "useRegistryActions",
    "RegistryProvider",
  ).actions;
}

function useRegistrySubscription(): any {
  return useRequiredContext(
    RegistryContext,
    "useRegistrySubscription",
    "RegistryProvider",
  ).subscription;
}

export function useRegistryValue<
  K extends string = string,
  T = K extends keyof import("./types").RegistrySchema
    ? import("./types").RegistrySchema[K]
    : any,
>(type: K, key: string): T | undefined {
  const { getSnapshot, subscribe } = useRegistrySubscription();

  const subscribeToKey = useCallback(
    (listener: () => void) => subscribe(type, key, listener),
    [key, subscribe, type],
  );
  const getValue = useCallback(
    () => getSnapshot(type, key),
    [getSnapshot, key, type],
  );

  return useSyncExternalStore(subscribeToKey, getValue, getValue);
}

export function useRegistrySelector<
  K extends string = string,
  TValue = K extends keyof import("./types").RegistrySchema
    ? import("./types").RegistrySchema[K]
    : any,
  TSelected = TValue,
>(
  type: K,
  key: string,
  selector: (value: TValue | undefined) => TSelected = IDENTITY_SELECTOR as any,
  isEqual: (a: TSelected, b: TSelected) => boolean = Object.is,
): TSelected {
  const { getSnapshot, subscribe } = useRegistrySubscription();
  const resolvedSelector =
    typeof selector === "function" ? selector : (IDENTITY_SELECTOR as any);
  const resolvedIsEqual = typeof isEqual === "function" ? isEqual : Object.is;
  const selectionRef = useRef<any>(null);

  const subscribeToKey = useCallback(
    (listener: () => void) => subscribe(type, key, listener),
    [key, subscribe, type],
  );

  const getSelection = useCallback(() => {
    const snapshot = getSnapshot(type, key);
    const previous = selectionRef.current;

    if (
      previous &&
      previous.snapshot === snapshot &&
      previous.selector === resolvedSelector &&
      previous.isEqual === resolvedIsEqual
    ) {
      return previous.value;
    }

    const nextValue = resolvedSelector(snapshot);
    if (
      previous &&
      previous.selector === resolvedSelector &&
      previous.isEqual === resolvedIsEqual &&
      resolvedIsEqual(previous.value, nextValue)
    ) {
      selectionRef.current = { ...previous, snapshot };
      return previous.value;
    }

    selectionRef.current = {
      isEqual: resolvedIsEqual,
      selector: resolvedSelector,
      snapshot,
      value: nextValue,
    };
    return nextValue;
  }, [getSnapshot, key, resolvedIsEqual, resolvedSelector, type]);

  return useSyncExternalStore(subscribeToKey, getSelection, getSelection);
}

export function useRegistryEntries<
  K extends string = string,
  T = K extends keyof import("./types").RegistrySchema
    ? import("./types").RegistrySchema[K]
    : any,
>(type: K): Record<string, T> {
  const { getEntriesSnapshot, subscribe } = useRegistrySubscription();

  const subscribeToType = useCallback(
    (listener: () => void) => subscribe(type, null, listener),
    [subscribe, type],
  );
  const getEntries = useCallback(
    () => getEntriesSnapshot(type),
    [getEntriesSnapshot, type],
  );

  return useSyncExternalStore(subscribeToType, getEntries, getEntries);
}
