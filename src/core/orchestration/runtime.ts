"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_REGISTRY_SCOPE,
  MAX_DIAGNOSTICS,
  REGISTRY_SCOPE_KINDS,
  REGISTRY_TYPES,
} from "./constants";
import type { RegistryDiagnostic, RegistryScope } from "./types";

export { DEFAULT_REGISTRY_SCOPE, REGISTRY_SCOPE_KINDS };

const IS_DIAGNOSTICS_ENABLED =
  typeof process === "undefined" || process.env?.NODE_ENV !== "production";

const diagnostics: RegistryDiagnostic[] = [];
const listeners = new Set<() => void>();
let diagnosticsSnapshot: readonly RegistryDiagnostic[] = Object.freeze([]);

function publishDiagnosticsSnapshot(): void {
  diagnosticsSnapshot = Object.freeze(diagnostics.slice());
  for (const listener of listeners) {
    try {
      listener();
    } catch {}
  }
}

export function recordRegistryDiagnostic(event: any): void {
  if (!IS_DIAGNOSTICS_ENABLED || !event || typeof event !== "object") return;

  diagnostics.push(Object.freeze({ ...event, timestamp: Date.now() }));

  if (diagnostics.length > MAX_DIAGNOSTICS) {
    diagnostics.splice(0, diagnostics.length - MAX_DIAGNOSTICS);
  }

  publishDiagnosticsSnapshot();
}

export function getRegistryDiagnostics(
  filter: Record<string, any> | null = null,
): readonly RegistryDiagnostic[] {
  if (!filter || typeof filter !== "object") return diagnosticsSnapshot;

  const filterEntries = Object.entries(filter);
  return Object.freeze(
    diagnosticsSnapshot.filter((event) =>
      filterEntries.every(([key, value]) => event[key] === value),
    ),
  );
}

export function queryRegistryDiagnostics(
  filter?: Record<string, any> | null,
): readonly RegistryDiagnostic[] {
  return getRegistryDiagnostics(filter);
}

export function clearRegistryDiagnostics(): void {
  diagnostics.length = 0;
  publishDiagnosticsSnapshot();
}

export function subscribeRegistryDiagnostics(listener: () => void): () => void {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRegistryDiagnostics(): readonly RegistryDiagnostic[] {
  return useSyncExternalStore(
    subscribeRegistryDiagnostics,
    getRegistryDiagnostics,
    getRegistryDiagnostics,
  );
}

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
    kind: normalizeRegistryScope(kind, REGISTRY_SCOPE_KINDS.APP),
    parent: parent ? normalizeRegistryScope(parent) : null,
  });
}

export function createScopedRegistryStore(store: any, scope: any): any {
  if (!store || typeof store.register !== "function") return store;

  const normalizedScope = normalizeRegistryScope(scope);

  const withScope = (options: any) => {
    if (
      options &&
      typeof options === "object" &&
      options.scope === normalizedScope
    ) {
      return options;
    }
    return {
      ...(typeof options === "object" ? options : {}),
      scope: normalizedScope,
    };
  };

  return {
    ...store,
    register: (
      type: string,
      key: string,
      value: any,
      sourceOrOptions: any,
      optionsArg: any,
    ) => {
      if (typeof sourceOrOptions === "string") {
        return store.register(
          type,
          key,
          value,
          sourceOrOptions,
          withScope(optionsArg),
        );
      }
      return store.register(type, key, value, withScope(sourceOrOptions));
    },
    unregister: (type: string, key: string, sourceOrOptions: any) => {
      if (typeof sourceOrOptions === "string") {
        return store.unregister(type, key, {
          source: sourceOrOptions,
          scope: normalizedScope,
        });
      }
      return store.unregister(type, key, withScope(sourceOrOptions));
    },
    getSnapshot: (type: string, key: string) =>
      store.getSnapshot(type, key, normalizedScope),
    getEntriesSnapshot: (type: string) =>
      store.getEntriesSnapshot(type, normalizedScope),
    transaction: (executor: any, metadata = {}) =>
      store.transaction(executor, { ...metadata, scope: normalizedScope }),
  };
}

function createTraceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `registry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createRegistryTransaction(store: any, metadata: any = {}): any {
  const operations: any[] = [];
  const traceId = metadata.traceId || createTraceId();
  let status = "open";

  const ensureOpen = () => status === "open";

  const mergeOptions = (options: any) => {
    const baseOpts = typeof options === "object" && options ? options : {};
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

  const rollback = (reason = "manual") => {
    if (!ensureOpen()) return { status, traceId };

    status = "rolled-back";
    operations.length = 0;
    recordRegistryDiagnostic({ action: "rollback", reason, traceId });
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
    recordRegistryDiagnostic({
      action: "commit",
      applied,
      queued: operations.length,
      traceId,
    });

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

export function createRegistryInspector(
  store: any,
  getDiagnostics: () => any[] = () => [],
): any {
  if (!store) return null;

  const typesList = Object.values(REGISTRY_TYPES);

  return {
    getSnapshot: () => ({
      diagnostics: getDiagnostics(),
      entries: Object.fromEntries(
        typesList.map((type) => [type, store.getEntriesSnapshot(type)]),
      ),
    }),
    subscribe(listener: () => void) {
      if (typeof listener !== "function") return () => {};

      const cleanups = typesList.map((type) =>
        store.subscribe(type, null, listener),
      );
      return () => cleanups.forEach((cleanup: any) => cleanup());
    },
  };
}
