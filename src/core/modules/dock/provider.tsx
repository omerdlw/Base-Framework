"use client";

import {
  createContext,
  createElement,
  memo,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { EVENT_TYPES, globalEvents } from "@/core/events";
import { useDockRegistry } from "@/core/orchestration";

import {
  createDockOperationState,
  createDockOperation,
  dockOperationReducer,
  resolveActiveDockOperation,
  createDockSelectorStore,
  useDockBackgroundActions as useBackgroundActions,
  useDockBackgroundState as useBackgroundState,
  useDockLoadingActions as useLoadingActions,
  useDockLoadingState as useLoadingState,
} from "./runtime";
import {
  areShallowCollectionsEqual,
  resolveActiveIndex,
  toArray,
  toSearchableText,
} from "./utils";
import {
  DOCK_ATTENTION_KIND,
  DOCK_OPERATION_EVENTS,
  DOCK_OPERATION_MAX_ENTRIES,
  DOCK_OPERATION_STATUS,
  DOCK_EVENTS,
} from "./constants";
import { checkGuards, getDockGuardCount } from "./guards";
import { resolveDockAttention } from "./attention";
import {
  blurActiveElement,
  useDockRouteReset,
} from "./behavior";
import {
  isPathPrefix,
  isSamePath,
  normalizePath,
  createDockTopology,
  getDockLocationKey,
  resolveDockRoutePolicy,
  useDockContinuity,
  useDockTransactions,
} from "./routing";
import { SurfaceExtensionsProvider } from "./surface";
import {
  applySurfaceToDockItem,
  createInlineSurfaceEntry,
  SurfaceFlowProvider,
} from "./surface-flow";
import {
  createSurfaceLifecycleState,
  surfaceLifecycleReducer,
  useSurfaceStack,
} from "./surface-machine";
import {
  areSelectionModeStatesEqual,
  createHudDefinition,
  createDockOperationHud,
  createSelectionModeState,
  getActiveDockHud,
  DockHeightSpacer,
  DockHud,
  removeHudEntries,
  upsertHudEntry,
} from "./hud";
import { applyStatusOverlay, useDockStatus } from "./status";
import { applyMediaAction } from "./media";
import { BreadcrumbProvider } from "./breadcrumbs";
import { useDockCommandRegistry } from "./commands";
import { createDockScheduler } from "./scheduler";
import {
  DockContext,
  type DockContextValue,
  useDockActions,
  useDockSelector,
} from "./runtime";
import type {
  DockHudDescriptor,
  DockActions,
  DockAttention,
  DockMachineAction,
  DockItem,
} from "./types";

const IS_DEV = process.env.NODE_ENV !== "production";

export {
  DockSurfaceControls,
  DockSurfaceHeader,
  DockSurfaceHeaderButton,
  DockSurfaceShell,
  useSurfaceHeader,
} from "./surface";
export { DockHeightSpacer, DockHud, DockContext };

function emitDockEvent(
  eventType: string,
  data: Record<string, any> = {},
) {
  return globalEvents.emit(eventType, {
    timestamp: Date.now(),
    type: eventType,
    ...data,
  });
}

function useDockLocationKey() {
  const pathname = usePathname();

  const getBrowserLocationKey = useCallback(
    () =>
      getDockLocationKey({
        hash: typeof window === "undefined" ? "" : window.location.hash,
        pathname,
        search: typeof window === "undefined" ? "" : window.location.search,
      }),
    [pathname],
  );

  const [locationKey, setLocationKey] = useState(getBrowserLocationKey);

  const syncLocationKey = useCallback(() => {
    const nextLocationKey = getBrowserLocationKey();
    setLocationKey((current) =>
      current === nextLocationKey ? current : nextLocationKey,
    );
    return nextLocationKey;
  }, [getBrowserLocationKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    syncLocationKey();
    window.addEventListener("hashchange", syncLocationKey);
    window.addEventListener("popstate", syncLocationKey);
    return () => {
      window.removeEventListener("hashchange", syncLocationKey);
      window.removeEventListener("popstate", syncLocationKey);
    };
  }, [syncLocationKey]);

  return { locationKey, syncLocationKey };
}

export function useDockCore() {
  const pathname = usePathname();
  const { locationKey, syncLocationKey } = useDockLocationKey();
  const router = useRouter();

  const {
    clearPreparedRouteReset,
    closeSurface,
    continuity,
    prepareRouteReset,
  } = useDockActions();
  const { stopLoading } = useLoadingActions();

  const previousLocationKeyRef = useRef(locationKey);

  const handleTransactionTimeout = useCallback(() => {
    clearPreparedRouteReset();
    stopLoading();
  }, [clearPreparedRouteReset, stopLoading]);

  const {
    activeTransaction,
    beginTransaction,
    cancelActiveTransaction,
    cancelTransaction,
    completeTransactionForPath,
    failTransaction,
    isTransactionCurrent,
    lastTransaction,
  } = useDockTransactions({
    onTimeout: handleTransactionTimeout,
  });

  const cancelDock = useCallback(
    (reason = "guard") => {
      cancelActiveTransaction(reason);
      clearPreparedRouteReset();
      closeSurface({ cancelled: true, reason, success: false });
    },
    [cancelActiveTransaction, clearPreparedRouteReset, closeSurface],
  );

  const commitDock = useCallback(
    ({
      from,
      href,
      routePolicy,
      source = "dock",
      transaction = null,
    }: {
      from: string;
      href: string;
      routePolicy: any;
      source?: string;
      transaction?: any;
    }) => {
      const activeRouteTransaction =
        transaction || beginTransaction({ from, source, to: href });
      if (!isTransactionCurrent(activeRouteTransaction.id)) return false;

      try {
        continuity?.remember?.(from);
        blurActiveElement();
        prepareRouteReset(routePolicy);

        emitDockEvent(DOCK_EVENTS.NAVIGATE_START, { from, to: href });
        router.push(href);
        emitDockEvent(DOCK_EVENTS.NAVIGATE, {
          from,
          item: undefined,
          to: href,
        });

        if (typeof window !== "undefined") {
          const currentUrl = new URL(window.location.href);
          const destinationUrl = new URL(href, window.location.origin);

          if (
            normalizePath(currentUrl.pathname) ===
            normalizePath(destinationUrl.pathname)
          ) {
            window.requestAnimationFrame(() => {
              const currentLocKey = getDockLocationKey({
                hash: window.location.hash,
                pathname: window.location.pathname,
                search: window.location.search,
              });
              if (
                !isSamePath(currentLocKey, href) ||
                !completeTransactionForPath(currentLocKey)
              )
                return;

              emitDockEvent(DOCK_EVENTS.NAVIGATE_END, {
                duration: undefined,
                from,
                to: currentLocKey,
              });
              previousLocationKeyRef.current = currentLocKey;
              syncLocationKey();
              stopLoading();
            });
          }
        }
        return true;
      } catch (error) {
        clearPreparedRouteReset();
        failTransaction(activeRouteTransaction.id, error);
        stopLoading();
        if (IS_DEV)
          console.error("[Dock] Route transition failed:", error);
        return false;
      }
    },
    [
      beginTransaction,
      clearPreparedRouteReset,
      completeTransactionForPath,
      continuity,
      failTransaction,
      isTransactionCurrent,
      prepareRouteReset,
      router,
      stopLoading,
      syncLocationKey,
    ],
  );

  const openGuardConfirmation = useCallback(
    ({
      href,
      from,
      message,
      routePolicy,
    }: {
      href: string;
      from: string;
      message?: string;
      routePolicy: any;
    }) => {
      const confirmDock = () => {
        globalEvents.emit(EVENT_TYPES.DOCK_GUARD, { clear: true });
        commitDock({
          from,
          href,
          routePolicy,
          source: "guard-confirmation",
        });
      };
      const cancelDockAction = () => {
        globalEvents.emit(EVENT_TYPES.DOCK_GUARD, { clear: true });
        closeSurface({ cancelled: true, reason: "guard", success: false });
      };

      globalEvents.emit(EVENT_TYPES.DOCK_GUARD, {
        to: href,
        from,
        title: "Navigation Blocked",
        message:
          message ||
          "You have unsaved changes. Are you sure you want to leave?",
        icon: "solar:danger-triangle-bold",
        cancelText: "Stay",
        confirmText: "Leave",
        onCancel: cancelDockAction,
        onConfirm: confirmDock,
      });
    },
    [closeSurface, commitDock],
  );

  const navigate = useCallback(
    async (
      href: string,
      {
        force = false,
        item = null,
        source = "dock",
      }: { force?: boolean; item?: any; source?: string } = {},
    ) => {
      if (!href) return false;
      const from = locationKey;
      const routePolicy = resolveDockRoutePolicy({ href, item });

      if (!routePolicy.canNavigate) {
        return false;
      }
      if (isSamePath(href, from)) return false;

      const transaction = beginTransaction({ from, source, to: href });

      try {
        if (!force && getDockGuardCount() > 0) {
          const guardResult = await checkGuards(href, from);
          if (!isTransactionCurrent(transaction.id)) return false;
          if (guardResult.blocked) {
            cancelTransaction(transaction.id, "guard");
            blurActiveElement();
            openGuardConfirmation({
              href,
              from,
              message: guardResult.message,
              routePolicy,
            });
            return false;
          }
        }
        return commitDock({
          from,
          href,
          routePolicy,
          source,
          transaction,
        });
      } catch (error) {
        failTransaction(transaction.id, error);
        stopLoading();
        if (IS_DEV)
          console.error("[Dock] Navigation guard failed:", error);
        return false;
      }
    },
    [
      beginTransaction,
      cancelTransaction,
      commitDock,
      failTransaction,
      isTransactionCurrent,
      openGuardConfirmation,
      locationKey,
      stopLoading,
    ],
  );

  useEffect(() => {
    if (previousLocationKeyRef.current === locationKey) return;
    emitDockEvent(DOCK_EVENTS.NAVIGATE_END, {
      duration: undefined,
      from: previousLocationKeyRef.current,
      to: locationKey,
    });
    completeTransactionForPath(locationKey);
    previousLocationKeyRef.current = locationKey;
    stopLoading();
  }, [completeTransactionForPath, locationKey, stopLoading]);

  return {
    activeTransaction,
    cancelDock,
    lastTransaction,
    navigate,
    pathname,
  };
}

function isNotFoundItem(item: any): boolean {
  return (
    item?.isNotFound || item?.path === "not-found" || item?.type === "NOT_FOUND"
  );
}

function flattenDockItems(items: DockItem[]): DockItem[] {
  return items.map((item) => ({
    ...item,
    activeChild: null,
    children: null,
    hasActiveChild: false,
    isExpanded: false,
    isParent: false,
  }));
}

function filterDockItems(
  items: DockItem[],
  searchQuery: string,
): DockItem[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) return items;
  return items.filter(
    (item) =>
      toSearchableText(item.name).toLowerCase().includes(normalizedQuery) ||
      toSearchableText(item.title).toLowerCase().includes(normalizedQuery) ||
      toSearchableText(item.description)
        .toLowerCase()
        .includes(normalizedQuery),
  );
}

function buildDockItems({
  rawItems,
  expanded,
  searchQuery,
  isNotFoundPage,
}: {
  rawItems: DockItem[];
  expanded?: boolean;
  searchQuery: string;
  isNotFoundPage: boolean;
}): DockItem[] {
  const baseItems = isNotFoundPage
    ? rawItems.filter((item) => item.path === "/" || isNotFoundItem(item))
    : rawItems;
  const flattenedItems = flattenDockItems(baseItems);
  if (expanded && searchQuery)
    return filterDockItems(flattenedItems, searchQuery);
  return flattenedItems;
}

function resolveBaseActiveItem({
  rawItems,
  dockItems,
  pathname,
  isNotFoundPage,
}: {
  rawItems: DockItem[];
  dockItems: DockItem[];
  pathname: string;
  isNotFoundPage: boolean;
}): DockItem | null {
  const normalizedPathname = normalizePath(pathname);

  const selectedDataSource = dockItems.find(
    (item) => item.isDataSource && item.isSelected,
  );
  if (selectedDataSource) return selectedDataSource;

  if (isNotFoundPage)
    return rawItems.find(isNotFoundItem) || rawItems[0] || null;

  const matchInDock = dockItems.find(
    (item) =>
      isSamePath(item.path, normalizedPathname) ||
      (item.targetPath && isSamePath(item.targetPath, normalizedPathname)),
  );
  if (matchInDock) return matchInDock;

  const matchInRaw = rawItems.find(
    (item) =>
      isSamePath(item.path, normalizedPathname) ||
      (item.targetPath && isSamePath(item.targetPath, normalizedPathname)),
  );
  if (matchInRaw) return matchInRaw;

  let prefixMatchedRawItem: DockItem | null = null;
  let longestPrefixLength = -1;
  for (let i = 0; i < rawItems.length; i++) {
    const candidatePath = normalizePath(rawItems[i]?.path);
    if (
      candidatePath.length > longestPrefixLength &&
      isPathPrefix(candidatePath, normalizedPathname)
    ) {
      prefixMatchedRawItem = rawItems[i];
      longestPrefixLength = candidatePath.length;
    }
  }

  if (prefixMatchedRawItem) {
    return (
      dockItems.find(
        (entry) =>
          isSamePath(entry?.path, prefixMatchedRawItem?.path) ||
          (entry?.name && entry.name === prefixMatchedRawItem?.name),
      ) || prefixMatchedRawItem
    );
  }
  return rawItems[0] || null;
}

function resolveActiveItem({
  rawItems,
  dockItems,
  pathname,
  isNotFoundPage,
  surfaceState,
  statusState,
  isVideo,
  toggleBackgroundVideo,
  mediaAction,
  surfaceActions,
  isPageLoading,
  attention,
}: {
  rawItems: DockItem[];
  dockItems: DockItem[];
  pathname: string;
  isNotFoundPage: boolean;
  surfaceState: any;
  statusState: any;
  isVideo: boolean;
  toggleBackgroundVideo: () => void;
  mediaAction: any;
  surfaceActions: any;
  isPageLoading: boolean;
  attention: DockAttention;
}): DockItem | null {
  const baseActiveItem = resolveBaseActiveItem({
    rawItems,
    dockItems,
    pathname,
    isNotFoundPage,
  });
  if (!baseActiveItem) return null;

  if (attention?.kind === DOCK_ATTENTION_KIND.SURFACE)
    return applySurfaceToDockItem(
      baseActiveItem,
      surfaceState.activeSurfaceEntry,
      {
        ...surfaceActions,
        surfacePhase: surfaceState.surfacePhase,
        surfaceStack: surfaceState.surfaceStack,
      },
    );
  if (attention?.kind === DOCK_ATTENTION_KIND.STATUS && statusState?.isOverlay)
    return applyStatusOverlay(baseActiveItem, statusState);
  if (
    attention?.kind === DOCK_ATTENTION_KIND.HUD ||
    attention?.kind === DOCK_ATTENTION_KIND.OPERATION
  )
    return baseActiveItem;
  if (attention?.kind === DOCK_ATTENTION_KIND.STATUS && statusState)
    return applyStatusOverlay(baseActiveItem, statusState);

  const itemWithMediaAction = applyMediaAction(
    baseActiveItem,
    isVideo,
    toggleBackgroundVideo,
    mediaAction,
  );
  const inlineSurface = createInlineSurfaceEntry(itemWithMediaAction?.surface);

  if (inlineSurface)
    return applySurfaceToDockItem(
      itemWithMediaAction,
      inlineSurface,
      surfaceActions,
    );
  return itemWithMediaAction;
}

export function useDockDisplay(overridePathname?: string) {
  const routerPathname = usePathname();
  const pathname = overridePathname || routerPathname;
  const loadingState = useLoadingState();
  const isPageLoading = Boolean(loadingState?.isLoading);
  const { rawItems } = useDockItems();

  const {
    closeAllSurfaces,
    goBackSurface,
    closeSurface,
    pushStep,
    popStep,
    goToStep,
    getSurfaceFlow,
    handleSurfaceAnimationComplete,
  } = useDockActions();

  const {
    expanded,
    searchQuery,
    activeSurfaceId,
    activeSurfaceEntry,
    activeOperation,
    hud,
    isSurfaceOpen,
    surfaceStack,
    surfacePhase,
  } = useDockSelector(
    (state) => ({
      activeOperation: state.activeOperation,
      activeSurfaceEntry: state.activeSurfaceEntry,
      activeSurfaceId: state.activeSurfaceId,
      expanded: state.expanded,
      hud: state.hud,
      isSurfaceOpen: state.isSurfaceOpen,
      searchQuery: state.searchQuery,
      surfacePhase: state.surfacePhase,
      surfaceStack: state.surfaceStack,
    }),
    areShallowCollectionsEqual,
  );

  const surfaceState = useMemo(
    () => ({
      activeSurfaceId,
      activeSurfaceEntry,
      isSurfaceOpen,
      surfaceStack,
      surfacePhase,
    }),
    [
      activeSurfaceId,
      activeSurfaceEntry,
      isSurfaceOpen,
      surfaceStack,
      surfacePhase,
    ],
  );

  const dockCtx = use(DockContext);
  const mediaAction = dockCtx?.runtimeActions?.mediaAction ?? null;
  const notFoundAction = dockCtx?.runtimeActions?.notFoundAction ?? null;
  const statusState = useDockStatus({ notFoundAction });
  const { isVideo } = useBackgroundState();
  const { toggleVideo: toggleBackgroundVideo } = useBackgroundActions();

  const attention = useMemo(
    () =>
      resolveDockAttention({
        hud,
        isPageLoading,
        operation: activeOperation,
        status: statusState,
        surface: surfaceState,
      }),
    [activeOperation, hud, isPageLoading, statusState, surfaceState],
  );

  const isNotFoundPage = useMemo(
    () => rawItems.some(isNotFoundItem),
    [rawItems],
  );

  const dockItems = useMemo(
    () =>
      buildDockItems({ rawItems, expanded, searchQuery, isNotFoundPage }),
    [rawItems, expanded, searchQuery, isNotFoundPage],
  );

  const activeItem = useMemo(
    () =>
      resolveActiveItem({
        rawItems,
        dockItems,
        pathname,
        isNotFoundPage,
        surfaceState,
        statusState,
        isVideo,
        toggleBackgroundVideo,
        mediaAction,
        surfaceActions: {
          closeSurface,
          closeAllSurfaces,
          goBackSurface,
          pushStep,
          popStep,
          goToStep,
          getSurfaceFlow,
          handleSurfaceAnimationComplete,
          surfaceStack,
        },
        isPageLoading,
        attention,
      }),
    [
      rawItems,
      dockItems,
      pathname,
      isNotFoundPage,
      surfaceState,
      statusState,
      isVideo,
      toggleBackgroundVideo,
      mediaAction,
      closeSurface,
      closeAllSurfaces,
      goBackSurface,
      pushStep,
      popStep,
      goToStep,
      getSurfaceFlow,
      handleSurfaceAnimationComplete,
      surfaceStack,
      isPageLoading,
      attention,
    ],
  );

  const activeIndex = useMemo(
    () => resolveActiveIndex({ dockItems, activeItem, pathname }),
    [dockItems, activeItem, pathname],
  );

  const topology = useMemo(
    () => createDockTopology(dockItems, { pathname }),
    [dockItems, pathname],
  );

  return useMemo(
    () => ({
      dockItems,
      activeItem,
      activeIndex,
      statusState,
      attention,
      topology,
    }),
    [
      dockItems,
      activeItem,
      activeIndex,
      statusState,
      attention,
      topology,
    ],
  );
}

function stripChildrenSystemFields(item: any): DockItem {
  if (!item || typeof item !== "object") return item;
  return {
    ...item,
    activeChild: null,
    children: null,
    hasActiveChild: false,
    isChild: false,
    isExpanded: false,
    isParent: false,
    parentName: null,
    parentPath: null,
  };
}

function useDockItems(): { rawItems: DockItem[] } {
  const { getAll } = useDockRegistry();
  const rawItems = useMemo(
    () => Object.values(getAll()).map(stripChildrenSystemFields),
    [getAll],
  );
  return { rawItems };
}

export function createDockMachineState() {
  return { expanded: false, ...createSurfaceLifecycleState() };
}

export function dockStateReducer(
  state: any,
  action: DockMachineAction,
): any {
  switch (action?.type) {
    case DOCK_EVENTS.COLLAPSE:
      return state.expanded ? { ...state, expanded: false } : state;
    case DOCK_EVENTS.EXPAND:
      return state.expanded ? state : { ...state, expanded: true };
    case DOCK_EVENTS.SET_EXPANDED: {
      const value =
        typeof action.payload === "function"
          ? action.payload(state.expanded)
          : ((action as any).value ?? action.payload);
      return state.expanded === Boolean(value)
        ? state
        : { ...state, expanded: Boolean(value) };
    }
    case DOCK_EVENTS.TOGGLE:
      return { ...state, expanded: !state.expanded };
    case DOCK_EVENTS.OPEN_SURFACE: {
      const nextState = surfaceLifecycleReducer(state, action);
      return nextState === state ? state : { ...nextState, expanded: false };
    }
    default:
      return surfaceLifecycleReducer(state, action);
  }
}

function updateCompactLocks(
  compactLocks: Record<string, boolean>,
  lockId: string,
  isLocked: boolean,
): Record<string, boolean> {
  if (!lockId) return compactLocks;
  const hasLock = Boolean(compactLocks[lockId]);
  if (isLocked)
    return hasLock ? compactLocks : { ...compactLocks, [lockId]: true };
  if (!hasLock) return compactLocks;

  const nextLocks = { ...compactLocks };
  delete nextLocks[lockId];
  return nextLocks;
}

function hasCompactLocks(compactLocks: Record<string, boolean>): boolean {
  return Object.keys(compactLocks).length > 0;
}

export interface DockProviderProps {
  breadcrumbConfig?: any;
  children?: ReactNode;
  mediaAction?: any;
  notFoundAction?: any;
  scheduler?: any;
}

export function DockProvider({
  breadcrumbConfig = null,
  children,
  mediaAction = null,
  notFoundAction = null,
  scheduler = null,
}: DockProviderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const runtimeActionsValue = useMemo(
    () => ({ mediaAction, notFoundAction }),
    [mediaAction, notFoundAction],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [compactLocks, setCompactLocks] = useState<Record<string, boolean>>({});
  const [operationState, dispatchOperation] = useReducer(
    dockOperationReducer,
    undefined,
    createDockOperationState,
  );
  const [dockMachine, dispatchDock] = useReducer(
    dockStateReducer,
    undefined,
    createDockMachineState,
  );
  const [dockHeight, setRawDockHeight] = useState(0);

  const dockHeightRef = useRef(0);
  const operationIdRef = useRef(0);
  const operationStateRef = useRef(operationState);
  const pendingSurfaceReturnRef = useRef<any>(null);
  const pendingRouteResetPolicyRef = useRef<any>(null);

  const runtimeSchedulerRef = useRef(scheduler || createDockScheduler());
  const runtimeScheduler = runtimeSchedulerRef.current;

  const setDockHeight = useCallback((nextHeight: number) => {
    const height = Number.isFinite(Number(nextHeight))
      ? Math.max(0, Number(nextHeight))
      : 0;
    if (dockHeightRef.current === height) return;
    dockHeightRef.current = height;
    setRawDockHeight(height);
  }, []);

  const {
    clearCommands: clearContextActions,
    contextCommands: contextActions,
    registerCommand: registerContextAction,
    setCommands: setContextActions,
    unregisterCommand: unregisterContextAction,
  } = useDockCommandRegistry();
  const [selectionModeState, setSelectionModeState] = useState<any>(null);
  const [hudEntries, setHudEntries] = useState<Record<string, any>>({});
  const dockContinuity = useDockContinuity();

  operationStateRef.current = operationState;

  const activeOperation = useMemo(
    () => resolveActiveDockOperation(operationState),
    [operationState],
  );

  const setExpanded = useCallback(
    (nextValue: boolean | ((prev: boolean) => boolean)) =>
      dispatchDock({
        type: DOCK_EVENTS.SET_EXPANDED,
        payload: nextValue,
      }),
    [],
  );
  const collapse = useCallback(
    () => dispatchDock({ type: DOCK_EVENTS.COLLAPSE }),
    [],
  );
  const expand = useCallback(
    () => dispatchDock({ type: DOCK_EVENTS.EXPAND }),
    [],
  );
  const toggle = useCallback(
    () => dispatchDock({ type: DOCK_EVENTS.TOGGLE }),
    [],
  );
  const setIsCompact = useCallback(
    (value: boolean) =>
      dispatchDock({
        type: DOCK_EVENTS.SET_COMPACT,
        payload: value,
      }),
    [],
  );

  const setCompactLock = useCallback((lockId: string, isLocked: boolean) => {
    if (lockId)
      setCompactLocks((prev) => updateCompactLocks(prev, lockId, isLocked));
  }, []);

  const setHud = useCallback(
    (descriptor: DockHudDescriptor) => {
      const definition = createHudDefinition(descriptor);
      if (!definition) return;
      if (dockMachine.isCompact) {
        setCompactLock("hud-opening", true);
        runtimeScheduler.schedule(
          () => {
            setHudEntries((prev) => upsertHudEntry(prev, definition));
            setCompactLock("hud-opening", false);
          },
          320,
          { label: "dock:hud" },
        );
        return;
      }
      setHudEntries((prev) => upsertHudEntry(prev, definition));
    },
    [dockMachine.isCompact, runtimeScheduler, setCompactLock],
  );

  const clearHud = useCallback((targetId?: string) => {
    setHudEntries((prev) => removeHudEntries(prev, targetId));
  }, []);

  const setSelectionMode = useCallback((config: any) => {
    setSelectionModeState((curr: any) => {
      const nextSelection = createSelectionModeState(config);
      return areSelectionModeStatesEqual(curr, nextSelection)
        ? curr
        : nextSelection;
    });
  }, []);

  const clearSelectionMode = useCallback(() => setSelectionModeState(null), []);

  const prepareRouteReset = useCallback((routePolicy: any) => {
    pendingRouteResetPolicyRef.current = routePolicy || null;
  }, []);
  const clearPreparedRouteReset = useCallback(() => {
    pendingRouteResetPolicyRef.current = null;
  }, []);

  const startDockOperation = useCallback((input: any = {}) => {
    const operation = createDockOperation({
      ...input,
      id: input.id ?? `dock-operation-${++operationIdRef.current}`,
    });
    if (!operation) return null;
    dispatchOperation({
      maxEntries: DOCK_OPERATION_MAX_ENTRIES,
      operation,
      type: DOCK_OPERATION_EVENTS.START,
    });
    return operation;
  }, []);

  const updateDockOperation = useCallback(
    (id: string | number, patch: any = {}) => {
      if (id == null) return false;
      dispatchOperation({
        id,
        patch,
        type: DOCK_OPERATION_EVENTS.UPDATE,
      });
      return true;
    },
    [],
  );

  const completeDockOperation = useCallback(
    (id: string | number, result: any = null) => {
      if (id == null) return false;
      dispatchOperation({
        id,
        result,
        type: DOCK_OPERATION_EVENTS.COMPLETE,
      });
      return true;
    },
    [],
  );

  const cancelDockOperation = useCallback(
    (id: string | number, result: any = null) => {
      if (id == null) return false;
      const operation = operationStateRef.current.entries.find(
        (entry: any) =>
          entry.id === String(id) &&
          entry.status === DOCK_OPERATION_STATUS.PENDING,
      );
      if (!operation) return false;
      if (typeof operation.onCancel === "function") {
        Promise.resolve(operation.onCancel(result)).catch((error) =>
          console.error("Dock operation cancellation handler failed:", error),
        );
      }
      dispatchOperation({
        id,
        result,
        type: DOCK_OPERATION_EVENTS.CANCEL,
      });
      return true;
    },
    [],
  );

  const clearDockOperations = useCallback(
    (id: any = null) =>
      dispatchOperation({ id, type: DOCK_OPERATION_EVENTS.CLEAR }),
    [],
  );

  const handleSurfaceFlowSettlement = useCallback(
    ({ flow, result }: { flow: any; result: any }) => {
      const handshake = flow?.returnHandshake;
      const isCompleted = result?.success === true;
      const isDockCancellation = [
        "browser-back",
        "dock",
        "unmount",
      ].includes(result?.reason);
      if (
        !handshake?.pathname ||
        isDockCancellation ||
        (!isCompleted && !handshake.returnOnCancel)
      )
        return false;

      const handoff = dockContinuity.deliverReturn(handshake.pathname, {
        data: result?.data ?? null,
        flowId: flow.flowId,
        status: isCompleted ? "completed" : "cancelled",
      });
      if (!handoff) return false;

      pendingSurfaceReturnRef.current = handshake;
      if (isSamePath(pathname, handshake.pathname)) {
        pendingSurfaceReturnRef.current = null;
        dockContinuity.restore(handshake.pathname, handshake);
      } else {
        router.push(handshake.pathname);
      }
      return true;
    },
    [dockContinuity, pathname, router],
  );

  const {
    cancelSurfaceFlow,
    closeAllSurfaces,
    closeSurface,
    completeSurfaceFlow,
    goBackSurface,
    goToStep,
    getSurfaceFlow,
    handleSurfaceAnimationComplete,
    openSurface,
    openSurfaceFlow,
    popStep,
    pushStep,
    restoreSurfaceFlow,
    surfaceState,
    updateSurfaceFlow,
  } = useSurfaceStack({
    isCompact: dockMachine.isCompact,
    onSurfaceFlowSettled: handleSurfaceFlowSettlement,
    scheduler: runtimeScheduler,
    setCompactLock,
    setExpanded,
    setSearchQuery,
  });

  useEffect(() => {
    const handshake = pendingSurfaceReturnRef.current;
    if (!handshake || !isSamePath(pathname, handshake.pathname)) return;
    pendingSurfaceReturnRef.current = null;
    dockContinuity.restore(handshake.pathname, handshake);
  }, [dockContinuity, pathname]);

  const handleRouteChange = useCallback(() => {
    const routePolicy = pendingRouteResetPolicyRef.current;
    pendingRouteResetPolicyRef.current = null;

    if (routePolicy?.dismissSurfaces !== false)
      closeAllSurfaces({
        success: false,
        cancelled: true,
        reason: "dock",
      });
    if (routePolicy?.clearTransientState !== false) {
      setSelectionModeState(null);
      setHudEntries({});
    }
  }, [closeAllSurfaces]);

  useDockRouteReset(pathname, handleRouteChange);

  const compactLocked = hasCompactLocks(compactLocks);
  const registeredHud = useMemo(
    () => getActiveDockHud(hudEntries, selectionModeState),
    [hudEntries, selectionModeState],
  );
  const pendingOperationCount = useMemo(
    () =>
      operationState.entries.filter(
        (o: any) => o.status === DOCK_OPERATION_STATUS.PENDING,
      ).length,
    [operationState.entries],
  );
  const operationHud = useMemo(
    () =>
      createDockOperationHud(activeOperation, {
        onCancel: cancelDockOperation,
        pendingCount: pendingOperationCount,
      }),
    [activeOperation, cancelDockOperation, pendingOperationCount],
  );

  const activeHud = operationHud || registeredHud;

  const stateValue = useMemo(
    () => ({
      ...surfaceState,
      activeOperation,
      contextActions,
      hud: activeHud,
      hudEntries: Object.values(hudEntries),
      isHudActive: Boolean(activeHud?.isActive),
      dockContinuity: dockContinuity.entries,
      dockReturnHandoffs: dockContinuity.returnHandoffs,
      operations: operationState.entries,
      selectionMode: selectionModeState,
      searchQuery,
      compactLocked,
      dockHeight,
      expanded: dockMachine.expanded,
      isCompact: dockMachine.isCompact,
    }),
    [
      surfaceState,
      activeOperation,
      contextActions,
      activeHud,
      hudEntries,
      dockContinuity.entries,
      dockContinuity.returnHandoffs,
      operationState.entries,
      selectionModeState,
      searchQuery,
      compactLocked,
      dockHeight,
      dockMachine.expanded,
      dockMachine.isCompact,
    ],
  );

  const selectorStoreRef = useRef<any>(null);
  if (selectorStoreRef.current === null)
    selectorStoreRef.current = createDockSelectorStore(stateValue);

  const selectorStore = selectorStoreRef.current;
  useLayoutEffect(() => {
    selectorStore.publish(stateValue);
  }, [selectorStore, stateValue]);

  const operationActions = useMemo(
    () => ({
      cancel: cancelDockOperation,
      clear: clearDockOperations,
      complete: completeDockOperation,
      start: startDockOperation,
      update: updateDockOperation,
    }),
    [
      cancelDockOperation,
      clearDockOperations,
      completeDockOperation,
      startDockOperation,
      updateDockOperation,
    ],
  );
  const continuityActions = useMemo(
    () => ({
      clear: dockContinuity.clear,
      consumeReturn: dockContinuity.consumeReturn,
      deliverReturn: dockContinuity.deliverReturn,
      get: dockContinuity.get,
      getReturns: dockContinuity.getReturns,
      remember: dockContinuity.remember,
      remove: dockContinuity.remove,
      restore: dockContinuity.restore,
    }),
    [dockContinuity],
  );
  const actionsValue: any = useMemo(
    () => ({
      clearContextActions,
      clearPreparedRouteReset,
      clearHud,
      clearSelectionMode,
      continuity: continuityActions,
      closeAllSurfaces,
      cancelSurfaceFlow,
      closeSurface,
      completeSurfaceFlow,
      goBackSurface,
      goToStep,
      getSurfaceFlow,
      handleSurfaceAnimationComplete,
      openSurface,
      openSurfaceFlow,
      operations: operationActions,
      popStep,
      prepareRouteReset,
      pushStep,
      registerContextAction,
      setCompactLock,
      setContextActions,
      setExpanded,
      setHud,
      setIsCompact,
      setDockHeight,
      setSearchQuery,
      setSelectionMode,
      unregisterContextAction,
      restoreSurfaceFlow,
      updateSurfaceFlow,
      collapse,
      expand,
      toggle,
    }),
    [
      clearContextActions,
      clearPreparedRouteReset,
      clearHud,
      clearSelectionMode,
      continuityActions,
      closeAllSurfaces,
      cancelSurfaceFlow,
      closeSurface,
      completeSurfaceFlow,
      goBackSurface,
      goToStep,
      getSurfaceFlow,
      handleSurfaceAnimationComplete,
      openSurface,
      openSurfaceFlow,
      operationActions,
      popStep,
      prepareRouteReset,
      pushStep,
      registerContextAction,
      setCompactLock,
      setContextActions,
      setExpanded,
      setHud,
      setIsCompact,
      setDockHeight,
      setSearchQuery,
      setSelectionMode,
      unregisterContextAction,
      restoreSurfaceFlow,
      updateSurfaceFlow,
      collapse,
      expand,
      toggle,
    ],
  );

  const surfaceFlowValue = useMemo(
    () => ({
      cancelSurfaceFlow,
      completeSurfaceFlow,
      openSurfaceFlow,
      restoreSurfaceFlow,
      surfaceState,
      updateSurfaceFlow,
    }),
    [
      cancelSurfaceFlow,
      completeSurfaceFlow,
      openSurfaceFlow,
      restoreSurfaceFlow,
      surfaceState,
      updateSurfaceFlow,
    ],
  );

  const dockContextValue = useMemo<DockContextValue>(
    () => ({
      actions: actionsValue,
      runtimeActions: runtimeActionsValue,
      runtimeScheduler,
      selectorStore,
      state: stateValue,
    }),
    [
      actionsValue,
      runtimeActionsValue,
      runtimeScheduler,
      selectorStore,
      stateValue,
    ],
  );

  return (
    <DockContext value={dockContextValue}>
      <SurfaceFlowProvider value={surfaceFlowValue}>
        <SurfaceExtensionsProvider>
          <BreadcrumbProvider config={breadcrumbConfig}>
            {children}
          </BreadcrumbProvider>
        </SurfaceExtensionsProvider>
      </SurfaceFlowProvider>
    </DockContext>
  );
}
