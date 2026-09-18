"use client";

import {
  createContext,
  createElement,
  isValidElement,
  use,
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
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
import { createRegistryTransaction, recordRegistryDiagnostic } from "./runtime";
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
  handle.dispose = () => false;
  handle.update = () => handle;
  Object.defineProperties(handle, {
    active: { enumerable: true, value: false },
    instanceId: { enumerable: true, value: null },
    key: { enumerable: true, value: "" },
    priority: { enumerable: true, value: 0 },
    reason: { enumerable: true, value: reason },
    source: { enumerable: true, value: "" },
    status: { enumerable: true, value: status },
    type: { enumerable: true, value: "" },
    updatedAt: { enumerable: true, value: 0 },
    validation: { enumerable: true, value: "warn" },
  });
  return handle as RegistrationHandle;
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

  return Object.freeze(clone);
}

const DEFAULT_REGISTRY_ACTIONS = Object.freeze({
  batch: (fn: any) =>
    typeof fn === "function"
      ? fn({ register: () => NOOP_HANDLE, unregister: NOOP })
      : 0,
  register: () => NOOP_HANDLE,
  transaction: () => ({ status: "unavailable" }),
  unregister: NOOP,
});

const DEFAULT_REGISTRY_SUBSCRIPTION = Object.freeze({
  getEntriesSnapshot: () => EMPTY_ENTRIES,
  getSnapshot: () => null,
  subscribe: () => NOOP,
});

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
    } catch (error: any) {
      recordRegistryDiagnostic({
        action: "error",
        error: error?.message || String(error),
        phase: "notify",
      });
    }
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

  const source =
    typeof sourceOrOptions === "string"
      ? sourceOrOptions
      : typeof options.source === "string"
        ? options.source
        : DEFAULT_SOURCE;
  const hasExplicitPriority = Object.prototype.hasOwnProperty.call(
    options,
    "priority",
  );
  const hasKnownSourcePriority = Object.prototype.hasOwnProperty.call(
    REGISTRY_SOURCES,
    source.toUpperCase(),
  );

  if (!hasKnownSourcePriority && !hasExplicitPriority) {
    recordRegistryDiagnostic({
      action: "validation-warning",
      key,
      reason: "implicit-source-priority",
      source,
      type,
    });
  }

  if (!metadataValidation.valid) {
    recordRegistryDiagnostic({
      action: isStrict ? "reject" : "validation-warning",
      issues: metadataValidation.issues,
      key,
      reason: "invalid-metadata",
      type,
      validation: isStrict ? "strict" : "warn",
    });
    if (isStrict)
      return {
        issues: metadataValidation.issues,
        reason: "invalid-metadata",
        valid: false,
      };
  }

  const validation = validateRegistryValue(type, key, value);
  if (validation.valid) return { valid: true };

  recordRegistryDiagnostic({
    action: isStrict ? "reject" : "validation-warning",
    issues: validation.issues,
    key,
    reason: "invalid-value",
    type,
    validation: options.validation || REGISTRY_VALIDATION_MODES.WARN,
  });

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
      cloneRegistryValue(value),
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

    recordRegistryDiagnostic({
      action: "dispose",
      instanceId: operation.instanceId,
      key: operation.key,
      reason,
      source: operation.source,
      type: operation.type,
    });
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
      recordRegistryDiagnostic({
        action: "reject",
        issues: validateRegistryKey(type, key).issues,
        key,
        reason: "invalid-target",
        type,
      });
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
      recordRegistryDiagnostic({
        action: "ignore",
        instanceId: operation.instanceId,
        key,
        reason: "unchanged",
        source: operation.source,
        type,
      });
      return createNoopHandle("ignored", "unchanged");
    }

    commit(applyOperation(registries, operation), [operation]);

    recordRegistryDiagnostic({
      action: "register",
      instanceId: operation.instanceId,
      key,
      priority: operation.record.priority,
      source: operation.source,
      type,
    });
    return createRegistrationHandle(store, operation);
  };

  const unregister = (
    type: string,
    key: string,
    sourceOrOptions: any = DEFAULT_SOURCE,
  ): void => {
    if (!isValidRegistryTarget(type, key)) {
      recordRegistryDiagnostic({
        action: "reject",
        issues: validateRegistryKey(type, key).issues,
        key,
        reason: "invalid-target",
        type,
      });
      return;
    }
    const operation = createUnregisterOperation(type, key, sourceOrOptions);
    if (!hasOperationEffect(registries, operation)) {
      recordRegistryDiagnostic({
        action: "ignore",
        instanceId: operation.instanceId,
        key,
        reason: "missing-record",
        source: operation.source,
        type,
      });
      return;
    }

    commit(applyOperation(registries, operation), [operation]);
    recordRegistryDiagnostic({
      action: "unregister",
      instanceId: operation.instanceId,
      key,
      source: operation.source,
      type,
    });
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
          recordRegistryDiagnostic({
            action: "reject",
            issues: validateRegistryKey(type, key).issues,
            key,
            reason: "invalid-target",
            type,
          });
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
        if (!isValidRegistryTarget(type, key)) {
          recordRegistryDiagnostic({
            action: "reject",
            issues: validateRegistryKey(type, key).issues,
            key,
            reason: "invalid-target",
            type,
          });
          return;
        }
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

    effectiveOperations.forEach((operation) => {
      recordRegistryDiagnostic({
        action: operation.kind,
        instanceId: operation.instanceId,
        key: operation.key,
        priority: (operation as any).record?.priority,
        source: operation.source,
        type: operation.type,
      });
    });

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

    const value = cloneRegistryValue(resolveCachedValue(type, entry, scope));
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
        const value = cloneRegistryValue(
          resolveCachedValue(type, typeRegistry[key], scope),
        );
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

const RegistryActionsContext = createContext<any>(null);
const RegistrySubscriptionContext = createContext<any>(null);

export function RegistryProvider({
  children,
  initialEntries = [],
}: {
  children?: ReactNode;
  initialEntries?: any[] | readonly any[];
}) {
  const storeRef = useLazyRef(() => createRegistryStore(initialEntries));

  const actionsValue = useMemo(
    () => ({
      batch: storeRef.current.batch,
      register: storeRef.current.register,
      transaction: storeRef.current.transaction,
      unregister: storeRef.current.unregister,
    }),
    [storeRef],
  );

  const subscriptionValue = useMemo(
    () => ({
      getEntriesSnapshot: storeRef.current.getEntriesSnapshot,
      getSnapshot: storeRef.current.getSnapshot,
      subscribe: storeRef.current.subscribe,
    }),
    [storeRef],
  );

  return (
    <RegistryActionsContext value={actionsValue}>
      <RegistrySubscriptionContext value={subscriptionValue}>
        {children}
      </RegistrySubscriptionContext>
    </RegistryActionsContext>
  );
}

export function useRegistryActions(): any {
  return use(RegistryActionsContext) ?? DEFAULT_REGISTRY_ACTIONS;
}

function useRegistrySubscription(): any {
  return use(RegistrySubscriptionContext) ?? DEFAULT_REGISTRY_SUBSCRIPTION;
}

export function useRegistryValue(type: string, key: string): any {
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

export function useRegistrySelector(
  type: string,
  key: string,
  selector: (value: any) => any = IDENTITY_SELECTOR,
  isEqual: (a: any, b: any) => boolean = Object.is,
): any {
  const { getSnapshot, subscribe } = useRegistrySubscription();
  const resolvedSelector =
    typeof selector === "function" ? selector : IDENTITY_SELECTOR;
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

export function useRegistryEntries(type: string): Record<string, any> {
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
