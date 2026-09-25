"use client";

import { DEFAULT_REGISTRY_SCOPE, REGISTRY_SCOPE_KINDS } from "./constants";
import type { RegistryScope } from "./types";

export { DEFAULT_REGISTRY_SCOPE, REGISTRY_SCOPE_KINDS };

export function normalizeRegistryScope(
  scope: any,
  fallback = DEFAULT_REGISTRY_SCOPE,
): string {
  if (!scope) return fallback;

  const candidate =
    typeof scope === "string"
      ? scope
      : typeof scope.id === "string"
        ? scope.id
        : fallback;
  return candidate.trim() || fallback;
}

export function createRegistryScope(
  id: any,
  parent: any = null,
  kind: any = id,
): RegistryScope {
  return Object.freeze({
    id: normalizeRegistryScope(id),
    kind: normalizeRegistryScope(kind, DEFAULT_REGISTRY_SCOPE),
    parent: parent ? normalizeRegistryScope(parent) : null,
  });
}

export function createScopedRegistryStore(
  store: any,
  defaultScope = DEFAULT_REGISTRY_SCOPE,
): any {
  const scope = normalizeRegistryScope(defaultScope);
  if (!store) return null;

  const withScope = (options: any) => ({
    ...(options && typeof options === "object" ? options : {}),
    scope: normalizeRegistryScope(options?.scope, scope),
  });

  return Object.freeze({
    ...store,
    batch(fn: (scopedQueue: any) => void) {
      if (typeof fn !== "function") return 0;

      return store.batch((queue: any) =>
        fn({
          register(type: string, key: string, item: any, options: any) {
            return queue.register(type, key, item, withScope(options));
          },
          unregister(type: string, key: string, options: any) {
            return queue.unregister(
              type,
              key,
              typeof options === "string"
                ? withScope({ source: options })
                : withScope(options),
            );
          },
        }),
      );
    },
    clearScope(targetScope = scope) {
      return store.clearScope(normalizeRegistryScope(targetScope, scope));
    },
    register(type: string, key: string, item: any, options: any) {
      return store.register(type, key, item, withScope(options));
    },
    unregister(type: string, key: string, sourceOrOptions: any) {
      const normalized =
        typeof sourceOrOptions === "string"
          ? withScope({ source: sourceOrOptions })
          : withScope(sourceOrOptions);
      return store.unregister(type, key, normalized);
    },
  });
}

export function createRegistryTransaction(
  store: any,
  metadata: Record<string, any> = {},
): any {
  if (!store) return null;

  const operations: any[] = [];
  let status = "open";
  const traceId =
    metadata.traceId ||
    `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const ensureOpen = () => status === "open";

  const mergeOptions = (options: any) => {
    const baseOpts = options && typeof options === "object" ? options : {};
    const needsSource = metadata.source && !baseOpts.source;
    const needsScope = metadata.scope && !baseOpts.scope;

    if (!needsSource && !needsScope) return baseOpts;

    return {
      ...baseOpts,
      ...(needsSource ? { source: metadata.source } : {}),
      ...(needsScope ? { scope: metadata.scope } : {}),
    };
  };

  const register = (
    type: string,
    key: string,
    value: any,
    sourceOrOptions: any,
    optionsArg: any,
  ) => {
    if (!ensureOpen()) return { status, traceId };

    const options =
      typeof sourceOrOptions === "string"
        ? mergeOptions({ ...(optionsArg || {}), source: sourceOrOptions })
        : mergeOptions(sourceOrOptions);

    operations.push({ key, item: value, options, type });
    return { index: operations.length - 1, status: "queued", traceId };
  };

  const unregister = (type: string, key: string, sourceOrOptions: any) => {
    if (!ensureOpen()) return { status, traceId };

    const options = mergeOptions(
      typeof sourceOrOptions === "string"
        ? { source: sourceOrOptions }
        : sourceOrOptions,
    );

    operations.push({ key, options, type, unregister: true });
    return { index: operations.length - 1, status: "queued", traceId };
  };

  const rollback = (_reason = "manual") => {
    if (!ensureOpen()) return { status, traceId };

    status = "rolled-back";
    operations.length = 0;
    return { status, traceId };
  };

  const commit = () => {
    if (!ensureOpen()) return { status, traceId };

    status = "committed";
    const result = store.batch((queue: any) => {
      operations.forEach((op) => {
        if (op.unregister) queue.unregister(op.type, op.key, op.options);
        else queue.register(op.type, op.key, op.item, op.options);
      });
    });

    const applied = Number.isFinite(result) ? result : 0;
    return { applied, queued: operations.length, status, traceId };
  };

  const run = (executor: any) => {
    if (typeof executor !== "function") return rollback("invalid-executor");
    try {
      executor({ register, unregister });
      return commit();
    } catch (error: any) {
      rollback(error?.message || String(error));
      throw error;
    }
  };

  return {
    commit,
    get operations() {
      return operations.slice();
    },
    register,
    rollback,
    run,
    get status() {
      return status;
    },
    traceId,
    unregister,
  };
}
