"use client";

import { createContext } from "react";
import { useRequiredContext, useStore } from "@/core/hooks";
import { createStore } from "@/core/utils";
import { usePageRuntimeBridge } from "@/core/orchestration";
import {
  DOCK_OPERATION_MAX_ENTRIES,
  DOCK_OPERATION_EVENTS,
  DOCK_OPERATION_STATUS,
} from "./constants";
import type { DockActions } from "./types";

export interface DockContextValue {
  actions: DockActions;
  runtimeActions: { mediaAction: any; notFoundAction: any };
  runtimeScheduler: any;
  selectorStore: any;
  state: any;
}

export const DockContext =
  createContext<DockContextValue | null>(null);

export function useDockState(): any {
  return useRequiredContext(
    DockContext,
    "useDockState",
    "DockProvider",
  ).state;
}

export function useDockSelector<T = any>(
  selector: (state: any) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const { selectorStore } = useRequiredContext(
    DockContext,
    "useDockSelector",
    "DockProvider",
  );
  return useStore(selectorStore, selector, isEqual);
}

export function useDockActions(): DockActions {
  return useRequiredContext(
    DockContext,
    "useDockActions",
    "DockProvider",
  ).actions;
}

export function useDockHeight() {
  const dockHeight = useDockSelector((state) => state.dockHeight);
  return { dockHeight, padding: { paddingBottom: `${dockHeight}px` } };
}

export function createDockOperationState() {
  return { entries: [] };
}

export function createDockOperation(
  {
    cancellable = true,
    description = null,
    hud = null,
    id,
    icon = null,
    label = "Working",
    metadata = null,
    onCancel = null,
    priority = 0,
    progress = null,
    startedAt = Date.now(),
  }: {
    cancellable?: boolean;
    description?: string | null;
    hud?: any;
    id: string | number;
    icon?: any;
    label?: string;
    metadata?: any;
    onCancel?: (() => void) | null;
    priority?: number;
    progress?: number | null;
    startedAt?: number;
  } = {} as any,
) {
  const normalizedId =
    typeof id === "string" || typeof id === "number" ? String(id) : "";
  if (!normalizedId) return null;

  const numericPriority = Number(priority);
  const numericProgress = Number(progress);

  return {
    cancellable: Boolean(cancellable),
    description:
      typeof description === "string" && description.trim()
        ? description.trim()
        : null,
    hud,
    id: normalizedId,
    icon: icon ?? null,
    label: typeof label === "string" && label.trim() ? label.trim() : "Working",
    metadata:
      metadata && typeof metadata === "object" && !Array.isArray(metadata)
        ? { ...metadata }
        : {},
    priority: Number.isFinite(numericPriority) ? numericPriority : 0,
    progress: Number.isFinite(numericProgress)
      ? Math.min(1, Math.max(0, numericProgress))
      : null,
    startedAt: Number.isFinite(Number(startedAt))
      ? Number(startedAt)
      : Date.now(),
    status: DOCK_OPERATION_STATUS.PENDING as string,
    onCancel: typeof onCancel === "function" ? onCancel : null,
  };
}

function settleDockOperation(
  operation: any,
  status: string,
  action: any,
) {
  return {
    ...operation,
    endedAt: action.endedAt ?? Date.now(),
    result: action.result ?? null,
    status,
  };
}

export function dockOperationReducer(state: any, action: any) {
  const currentState = state || createDockOperationState();

  if (action?.type === DOCK_OPERATION_EVENTS.CLEAR) {
    if (action.id == null)
      return currentState.entries.length
        ? createDockOperationState()
        : currentState;

    const entries = currentState.entries.filter(
      (entry: any) => entry.id !== String(action.id),
    );
    return entries.length === currentState.entries.length
      ? currentState
      : { entries };
  }

  if (action?.type === DOCK_OPERATION_EVENTS.START) {
    const operation = action.operation;
    if (!operation?.id) return currentState;

    const maxEntries = Math.max(
      1,
      Number(action.maxEntries) || DOCK_OPERATION_MAX_ENTRIES,
    );
    const filteredEntries = currentState.entries.filter(
      (entry: any) => entry.id !== operation.id,
    );

    filteredEntries.push(operation);
    if (filteredEntries.length > maxEntries) {
      filteredEntries.splice(0, filteredEntries.length - maxEntries);
    }

    return { entries: filteredEntries };
  }

  const id = action?.id == null ? "" : String(action.id);
  const operation = currentState.entries.find((entry: any) => entry.id === id);
  if (!operation) return currentState;

  if (action.type === DOCK_OPERATION_EVENTS.UPDATE) {
    if (operation.status !== DOCK_OPERATION_STATUS.PENDING)
      return currentState;

    const updatedOperation = createDockOperation({
      ...operation,
      ...action.patch,
    });
    if (!updatedOperation) return currentState;

    return {
      entries: currentState.entries.map((entry: any) =>
        entry.id === id
          ? { ...updatedOperation, startedAt: operation.startedAt }
          : entry,
      ),
    };
  }

  const status =
    action.type === DOCK_OPERATION_EVENTS.COMPLETE
      ? DOCK_OPERATION_STATUS.COMPLETED
      : action.type === DOCK_OPERATION_EVENTS.CANCEL
        ? DOCK_OPERATION_STATUS.CANCELLED
        : null;

  if (!status || operation.status !== DOCK_OPERATION_STATUS.PENDING)
    return currentState;

  return {
    entries: currentState.entries.map((entry: any) =>
      entry.id === id
        ? settleDockOperation(entry, status, action)
        : entry,
    ),
  };
}

export function resolveActiveDockOperation(state: any) {
  let active: any = null;
  for (const entry of state?.entries || []) {
    if (entry.status !== DOCK_OPERATION_STATUS.PENDING) continue;

    if (
      !active ||
      entry.priority > active.priority ||
      (entry.priority === active.priority && entry.startedAt < active.startedAt)
    ) {
      active = entry;
    }
  }
  return active;
}

export function createDockSelectorStore(initialState: any = {}) {
  return createStore(initialState);
}

export function useDockBackgroundState() {
  const bridge = usePageRuntimeBridge();
  return bridge.useBackgroundState();
}

export function useDockBackgroundActions() {
  const bridge = usePageRuntimeBridge();
  return bridge.useBackgroundActions();
}

export function useDockLoadingState() {
  const bridge = usePageRuntimeBridge();
  return bridge.useLoadingState();
}

export function useDockLoadingActions() {
  const bridge = usePageRuntimeBridge();
  return bridge.useLoadingActions();
}
