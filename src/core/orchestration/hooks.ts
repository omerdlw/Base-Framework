"use client";

import { usePathname } from "next/navigation";
import { useIsomorphicLayoutEffect } from "@/core/hooks";
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useMemo,
  useRef,
} from "react";
import { applyRegistryConfig } from "./handlers";
import {
  DEFAULT_SOURCE,
  DYNAMIC_SOURCE,
  normalizePageRegistryConfig,
  REGISTRY_KEYS,
  REGISTRY_TYPES,
} from "./schema";
import { runScopedBatch } from "./operations";
import {
  useRegistryActions,
  useRegistryEntries,
  useRegistrySelector,
} from "./provider";
import { isObject } from "@/core/utils";
import type { PageConfig } from "./types";

function createRegistryActionContext<T = any>(
  type: string,
  defaultSource: string = DYNAMIC_SOURCE,
) {
  return function useScopedRegistryActions() {
    const { batch, register, unregister } = useRegistryActions();

    const scopedRegister = useCallback(
      (
        key: string,
        config: T,
        sourceOrOptions: any = defaultSource,
        options: any = {},
      ) => register(type, key, config, sourceOrOptions, options),
      [register],
    );

    const scopedUnregister = useCallback(
      (key: string, sourceOrOptions: any = defaultSource) =>
        unregister(type, key, sourceOrOptions),
      [unregister],
    );

    const scopedBatch = useCallback(
      (
        executor: (queue: {
          register: (
            key: string,
            config: T,
            sourceOrOptions?: any,
            options?: any,
          ) => void;
          unregister: (key: string, sourceOrOptions?: any) => void;
        }) => void,
      ) =>
        runScopedBatch(batch, executor, (queue: any) => ({
          register: (
            key: string,
            config: T,
            sourceOrOptions: any = defaultSource,
            options: any = {},
          ) => queue.register(type, key, config, sourceOrOptions, options),
          unregister: (key: string, sourceOrOptions: any = defaultSource) =>
            queue.unregister(type, key, sourceOrOptions),
        })),
      [batch],
    );

    return useMemo(
      () => ({
        batch: scopedBatch,
        register: scopedRegister,
        unregister: scopedUnregister,
      }),
      [scopedBatch, scopedRegister, scopedUnregister],
    );
  };
}

export const useModalRegistryActions = createRegistryActionContext(
  REGISTRY_TYPES.MODAL,
  DYNAMIC_SOURCE,
);
export const useDockRegistryActions = createRegistryActionContext(
  REGISTRY_TYPES.DOCK,
  DEFAULT_SOURCE,
);

export function useModalRegistry() {
  const { batch, register, unregister } = useModalRegistryActions();
  const entries = useRegistryEntries(REGISTRY_TYPES.MODAL);

  return useMemo(
    () => ({ batch, unregister, register, get: (key: string) => entries[key] }),
    [batch, entries, register, unregister],
  );
}

export function useDockRegistry() {
  const { batch, register, unregister } = useDockRegistryActions();
  const entries = useRegistryEntries(REGISTRY_TYPES.DOCK);

  return useMemo(
    () => ({
      batch,
      get: (key: string) => entries[key],
      getAll: () => entries,
      unregister,
      register,
    }),
    [batch, entries, register, unregister],
  );
}

export function useBackgroundValue<T = any>(
  selector?: (value: any) => T,
  isEqual?: (a: any, b: any) => boolean,
): T {
  return useRegistrySelector(
    REGISTRY_TYPES.BACKGROUND,
    REGISTRY_KEYS.BACKGROUND,
    selector,
    isEqual,
  );
}

export function useLoadingValue<T = any>(
  selector?: (value: any) => T,
  isEqual?: (a: any, b: any) => boolean,
): T {
  return useRegistrySelector(
    REGISTRY_TYPES.LOADING,
    REGISTRY_KEYS.LOADING,
    selector,
    isEqual,
  );
}

export function useDockValue<T = any>(
  key: string,
  selector?: (value: any) => T,
  isEqual?: (a: any, b: any) => boolean,
): T {
  return useRegistrySelector(REGISTRY_TYPES.DOCK, key, selector, isEqual);
}

export function useModalValue<T = any>(
  key: string,
  selector?: (value: any) => T,
  isEqual?: (a: any, b: any) => boolean,
): T {
  return useRegistrySelector(REGISTRY_TYPES.MODAL, key, selector, isEqual);
}

export function useContextMenuValue<T = any>(
  key: string,
  selector?: (value: any) => T,
  isEqual?: (a: any, b: any) => boolean,
): T {
  return useRegistrySelector(
    REGISTRY_TYPES.CONTEXT_MENU,
    key,
    selector,
    isEqual,
  );
}

export const useContextMenuRegistryActions = createRegistryActionContext(
  REGISTRY_TYPES.CONTEXT_MENU,
  DYNAMIC_SOURCE,
);

export function useContextMenuRegistry() {
  const { batch, register, unregister } = useContextMenuRegistryActions();
  const entries = useRegistryEntries(REGISTRY_TYPES.CONTEXT_MENU);

  return useMemo(
    () => ({
      batch,
      get: (key: string) => entries[key],
      getAll: () => entries,
      register,
      unregister,
    }),
    [batch, entries, register, unregister],
  );
}

function withInstanceId(
  instanceId: string,
  sourceOrOptions: any,
  optionsArg?: any,
) {
  if (typeof sourceOrOptions === "string") {
    return {
      optionsArg: { ...(isObject(optionsArg) ? optionsArg : {}), instanceId },
      sourceOrOptions,
    };
  }
  if (isObject(sourceOrOptions)) {
    return {
      optionsArg,
      sourceOrOptions: { ...sourceOrOptions, instanceId },
    };
  }
  return {
    optionsArg: undefined,
    sourceOrOptions: {
      ...(isObject(optionsArg) ? optionsArg : {}),
      instanceId,
    },
  };
}

function withInstanceIdForUnregister(instanceId: string, sourceOrOptions: any) {
  if (typeof sourceOrOptions === "string") {
    return { instanceId, source: sourceOrOptions };
  }
  if (isObject(sourceOrOptions)) {
    return { ...sourceOrOptions, instanceId };
  }
  return { instanceId };
}

function resolveRegisterArgsWithInstance(
  instanceId: string,
  sourceOrOptions: any,
  optionsArg?: any,
) {
  const input = withInstanceId(instanceId, sourceOrOptions, optionsArg);
  return [input.sourceOrOptions, input.optionsArg];
}

const MAX_STABILIZATION_DEPTH = 64;

function createStableFunctionEntry(fn: any) {
  const entry = {
    current: fn,
    stable(this: any, ...args: any[]) {
      return entry.current?.apply(this, args);
    },
  };
  return entry;
}

function isDirectRegistryComponentPath(path: string): boolean {
  return /^config\.(modal|modals)\.[^.[]+$/.test(path);
}

function isReactNodeLike(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === "boolean" ||
    typeof value === "string" ||
    typeof value === "number" ||
    isValidElement(value)
  );
}

function isStabilizableObject(value: any): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !isValidElement(value)
  );
}

function hasSameObjectKeys(previousValue: any, nextValue: any): boolean {
  if (
    !isStabilizableObject(previousValue) ||
    !isStabilizableObject(nextValue)
  ) {
    return false;
  }
  const previousKeys = Object.keys(previousValue);
  const nextKeys = Object.keys(nextValue);
  if (previousKeys.length !== nextKeys.length) return false;
  return nextKeys.every((key) =>
    Object.prototype.hasOwnProperty.call(previousValue, key),
  );
}

function stabilizeRegistryValue(
  value: any,
  path: string,
  functionEntries: Map<string, any>,
  usedPaths: Set<string>,
  previousValue?: any,
  seen = new WeakSet(),
  depth = 0,
): any {
  if (depth > MAX_STABILIZATION_DEPTH) return value;

  if (typeof value === "function") {
    const isComponent = value.name && /^[A-Z]/.test(value.name);
    if (isComponent || isDirectRegistryComponentPath(path)) {
      return value;
    }
    usedPaths.add(path);
    let entry = functionEntries.get(path);
    if (!entry) {
      entry = createStableFunctionEntry(value);
      functionEntries.set(path, entry);
    } else {
      entry.current = value;
    }
    return entry.stable;
  }

  if (value && typeof value === "object") {
    if (seen.has(value)) return value;
    seen.add(value);
  }

  if (isValidElement(value)) {
    const nextProps = stabilizeRegistryValue(
      value.props as any,
      `${path}.props`,
      functionEntries,
      usedPaths,
      isValidElement(previousValue) ? (previousValue.props as any) : undefined,
      seen,
      depth + 1,
    );
    if (
      isValidElement(previousValue) &&
      previousValue.type === value.type &&
      previousValue.key === value.key &&
      previousValue.props === nextProps
    ) {
      return previousValue;
    }
    return cloneElement(value, nextProps);
  }

  if (Array.isArray(value)) {
    const nextValue = value.every(isReactNodeLike)
      ? Children.toArray(value)
      : value;
    const previousArray = Array.isArray(previousValue) ? previousValue : null;
    let hasChanged =
      !previousArray || previousArray.length !== nextValue.length;

    const stabilizedValue: any[] = nextValue.map((item, index) => {
      const nextItem = stabilizeRegistryValue(
        item,
        `${path}[${index}]`,
        functionEntries,
        usedPaths,
        previousArray?.[index],
        seen,
        depth + 1,
      );
      if (!previousArray || nextItem !== previousArray[index]) {
        hasChanged = true;
      }
      return nextItem;
    });
    return !hasChanged ? previousArray : stabilizedValue;
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  const stabilizedValue: Record<string, any> = {};
  const canReusePrevious = hasSameObjectKeys(previousValue, value);
  let hasChanged = !canReusePrevious;

  Object.keys(value).forEach((key) => {
    const nextValue = stabilizeRegistryValue(
      value[key],
      `${path}.${key}`,
      functionEntries,
      usedPaths,
      previousValue?.[key],
      seen,
      depth + 1,
    );
    stabilizedValue[key] = nextValue;
    if (!canReusePrevious || nextValue !== previousValue[key]) {
      hasChanged = true;
    }
  });

  return !hasChanged ? previousValue : stabilizedValue;
}

export function useStabilizedRegistryConfig(config: any): any {
  const functionEntriesRef = useRef(new Map<string, any>());
  const stabilizedConfigRef = useRef<any>(undefined);

  return useMemo(() => {
    const usedPaths = new Set<string>();
    const stabilizedConfig = stabilizeRegistryValue(
      config,
      "config",
      functionEntriesRef.current,
      usedPaths,
      stabilizedConfigRef.current,
    );

    functionEntriesRef.current.forEach((_entry, path) => {
      if (!usedPaths.has(path)) {
        functionEntriesRef.current.delete(path);
      }
    });

    stabilizedConfigRef.current = stabilizedConfig;
    return stabilizedConfig;
  }, [config]);
}

export function useRegistry(config?: PageConfig | null): void {
  const { batch, register, unregister } = useRegistryActions();
  const pathname = usePathname();
  const defaultId = useId();

  const instanceIdRef = useRef(`registry-instance-${defaultId}`);
  const cleanupScopeRef = useRef(new Map());

  const registerWithInstance = useCallback(
    (
      type: string,
      key: string,
      item: any,
      sourceOrOptions?: any,
      optionsArg?: any,
    ) => {
      const [resolvedSourceOrOptions, resolvedOptionsArg] =
        resolveRegisterArgsWithInstance(
          instanceIdRef.current,
          sourceOrOptions,
          optionsArg,
        );
      return register(
        type,
        key,
        item,
        resolvedSourceOrOptions,
        resolvedOptionsArg,
      );
    },
    [register],
  );

  const unregisterWithInstance = useCallback(
    (type: string, key: string, sourceOrOptions?: any) => {
      return unregister(
        type,
        key,
        withInstanceIdForUnregister(instanceIdRef.current, sourceOrOptions),
      );
    },
    [unregister],
  );

  const batchWithInstance = useCallback(
    (executor: (queue: any) => void) => {
      if (typeof executor !== "function") return 0;
      return batch((queue: any) => {
        executor({
          register: (
            type: string,
            key: string,
            item: any,
            sourceOrOptions?: any,
            optionsArg?: any,
          ) => {
            const [resolvedSourceOrOptions, resolvedOptionsArg] =
              resolveRegisterArgsWithInstance(
                instanceIdRef.current,
                sourceOrOptions,
                optionsArg,
              );
            return queue.register(
              type,
              key,
              item,
              resolvedSourceOrOptions,
              resolvedOptionsArg,
            );
          },
          unregister: (type: string, key: string, sourceOrOptions?: any) => {
            queue.unregister(
              type,
              key,
              withInstanceIdForUnregister(
                instanceIdRef.current,
                sourceOrOptions,
              ),
            );
          },
        });
      });
    },
    [batch],
  );

  const context = useMemo(
    () => ({
      register: registerWithInstance,
      unregister: unregisterWithInstance,
      batch: batchWithInstance,
      instanceId: instanceIdRef.current,
      cleanupScope: cleanupScopeRef.current,
      pathname,
    }),
    [batchWithInstance, registerWithInstance, unregisterWithInstance, pathname],
  );

  const normalizedConfig = normalizePageRegistryConfig(config);
  const stableConfig = useStabilizedRegistryConfig(normalizedConfig);

  useIsomorphicLayoutEffect(() => {
    return applyRegistryConfig(stableConfig, context);
  }, [stableConfig, context]);
}

export function usePageRegistry(config?: PageConfig | null): void {
  return useRegistry(config);
}
