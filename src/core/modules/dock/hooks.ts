"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";
import { useRequiredContext } from "@/core/hooks";
import {
  DockContext,
  useDockBackgroundState as useBackgroundState,
  useDockHeight,
  useDockActions,
  useDockSelector,
  useDockState,
} from "./runtime";
import { getDockGuardCount } from "./guards";
import {
  areShallowCollectionsEqual,
  findDockItemIndex,
  isSameItem,
  isSamePath,
  normalizePath,
  removeAncestorDuplicates,
  removeInactiveLoadingItems,
  reorderItemsWithActiveFirst,
  replaceActiveItem,
  toArray,
} from "./utils";
import {
  MAX_VISIBLE_STACKED_CARDS,
  DOCK_ATTENTION_KIND,
} from "./constants";
import {
  useDockCompactController,
  useDockRouteReset,
} from "./behavior";
import { useDockHudLifecycle } from "./hud";
import { DOCK_COMPACT_TO_EXPAND_DELAY_MS } from "./motion";
import {
  useDockCore,
  useDockDisplay,
} from "./provider";
import type { DockItem } from "./types";

export {
  DockContext,
  useDockHeight,
  useDockActions,
  useDockSelector,
  useDockState,
};

export function useDockRuntimeHealth() {
  const { runtimeScheduler } = useRequiredContext(
    DockContext,
    "useDockRuntimeHealth",
    "DockProvider",
  );
  const schedulerSnapshot = useSyncExternalStore(
    runtimeScheduler.subscribe,
    runtimeScheduler.getSnapshot,
    runtimeScheduler.getSnapshot,
  );

  return useMemo(
    () => ({ scheduler: schedulerSnapshot }),
    [schedulerSnapshot],
  );
}

export function useDockContext(): any {
  const actions = useDockActions();
  const state = useDockState();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}

export function useDockContextActions(actions: any) {
  const { registerContextAction, unregisterContextAction } =
    useDockActions() as any;
  const registeredKeysRef = useRef(new Set<string>());

  useEffect(() => {
    const currentKeys = new Set<string>();
    toArray(actions).forEach((action: any, index: number) => {
      if (!action) return;
      const key = action.key || `ctx-action-${index}`;
      currentKeys.add(key);
      registerContextAction({ key, ...action });
    });

    registeredKeysRef.current.forEach((prevKey) => {
      if (!currentKeys.has(prevKey)) unregisterContextAction(prevKey);
    });
    registeredKeysRef.current = currentKeys;
  }, [actions, registerContextAction, unregisterContextAction]);

  useEffect(() => {
    return () => {
      registeredKeysRef.current.forEach(unregisterContextAction);
      registeredKeysRef.current.clear();
    };
  }, [unregisterContextAction]);
}

export function useDockRouteState() {
  return useDockSelector(
    (state) => ({
      activeItem: state.activeItem,
      locationKey: state.locationKey,
      pathname: state.pathname,
    }),
    areShallowCollectionsEqual,
  );
}

export function useDockBehaviorState() {
  return useDockSelector(
    (state) => ({
      compact: state.compact,
      compactLocked: state.compactLocked,
      expanded: state.expanded,
      isHovered: state.isHovered,
      searchQuery: state.searchQuery,
    }),
    areShallowCollectionsEqual,
  );
}

export function useDockHudState() {
  return useDockSelector(
    (state) => ({
      attention: state.attention,
      hud: state.hud,
      isHudActive: state.isHudActive,
    }),
    areShallowCollectionsEqual,
  );
}

export function useDockSurfaceState() {
  return useDockSelector(
    (state) => ({
      activeSurface:
        state.surfaceStack?.[state.surfaceStack.length - 1] ?? null,
      isSurfaceActive: Boolean(state.activeItem?.isSurface),
      surfacePhase: state.surfacePhase,
      surfaceStack: state.surfaceStack,
    }),
    areShallowCollectionsEqual,
  );
}

export function useDockDimensions() {
  const { dockHeight } = useDockHeight();
  const activeItem = useDockSelector((state) => state.activeItem);
  return {
    height: dockHeight,
    width: activeItem?.width ?? null,
    isSurface: Boolean(activeItem?.isSurface),
  };
}

export function useDockHud(descriptor: any) {
  const { setHud, clearHud } = useDockActions();
  return useDockHudLifecycle({ clearHud, descriptor, setHud });
}

export function useDockOperations() {
  const { activeOperation, entries } = useDockSelector(
    (state) => ({
      activeOperation: state.activeOperation,
      entries: state.operations,
    }),
    areShallowCollectionsEqual,
  );
  const actions = useDockActions() as any;
  return useMemo(
    () => ({ active: activeOperation, entries, ...actions.operations }),
    [activeOperation, entries, actions.operations],
  );
}

export function useDockContinuityState() {
  const { entries, returnHandoffs } = useDockSelector(
    (state) => ({
      entries: state.dockContinuity,
      returnHandoffs: state.dockReturnHandoffs,
    }),
    areShallowCollectionsEqual,
  );
  const { continuity } = useDockActions();
  return useMemo(
    () => ({ entries, returnHandoffs, ...continuity }),
    [continuity, entries, returnHandoffs],
  );
}

export function useSurfaceReturn() {
  const pathname = usePathname();
  const { continuity } = useDockActions();
  const dockReturnHandoffs = useDockSelector(
    (state) => state.dockReturnHandoffs,
  );

  const entries = useMemo(
    () =>
      (dockReturnHandoffs || []).filter((handoff: any) =>
        isSamePath(handoff.path, pathname),
      ),
    [dockReturnHandoffs, pathname],
  );
  const consume = useCallback(
    (handoffId: any = null) =>
      (continuity as any).consumeReturn(pathname, handoffId),
    [continuity, pathname],
  );

  return useMemo(
    () => ({ consume, entries, peek: () => entries[0] || null }),
    [consume, entries],
  );
}

export function useDockLayout({
  dockItems,
  activeItem,
  pathname: overridePathname,
}: {
  dockItems?: DockItem[];
  activeItem?: DockItem | null;
  pathname?: string;
} = {}) {
  const routePathname = usePathname();
  const pathname = overridePathname || routePathname;

  const { displayItems, displayActiveIndex } = useMemo(() => {
    const items = dockItems || [];
    const activeIndex = findDockItemIndex(
      items,
      activeItem ?? null,
      pathname,
    );
    const itemsWithActiveItem = replaceActiveItem(
      items,
      activeIndex,
      activeItem ?? null,
    );

    const reorderedItems = reorderItemsWithActiveFirst(
      itemsWithActiveItem,
      activeIndex,
    );
    const filteredItems = removeInactiveLoadingItems(
      reorderedItems,
      activeItem ?? null,
    );
    const deduplicatedItems = removeAncestorDuplicates(filteredItems);
    const activeIndexForDisplay = deduplicatedItems.findIndex((item) =>
      isSameItem(item, activeItem),
    );

    return {
      displayItems: deduplicatedItems,
      displayActiveIndex:
        activeIndexForDisplay !== -1
          ? activeIndexForDisplay
          : reorderedItems.length > 0
            ? 0
            : -1,
    };
  }, [pathname, dockItems, activeItem]);

  return {
    displayItems,
    activeIndex: displayActiveIndex,
    MAX_VISIBLE_STACKED_CARDS,
  };
}

export function useDock() {
  const {
    closeSurface,
    setCompactLock,
    setExpanded: setExpandedState,
    setIsCompact,
    setDockHeight,
    setSearchQuery,
  } = useDockActions() as any;
  const { compactLocked, isExpanded, searchQuery } = useDockSelector(
    (state) => ({
      compactLocked: state.compactLocked,
      isExpanded: state.expanded,
      searchQuery: state.searchQuery,
    }),
    areShallowCollectionsEqual,
  );

  const { runtimeScheduler } = useRequiredContext(
    DockContext,
    "useDock",
    "DockProvider",
  );
  const [isHovered, setIsHovered] = useState(false);
  const core = useDockCore();

  const {
    activeTransaction,
    cancelDock,
    lastTransaction,
    navigate: navigateWithGuards,
    pathname,
  } = core;

  const effectivePathname = activeTransaction?.to
    ? normalizePath(activeTransaction.to)
    : pathname;
  const display = useDockDisplay(effectivePathname);
  const { dockItems, activeItem, statusState, attention, topology } =
    display;
  const { isPlaying: isVideoPlaying } = useBackgroundState();

  const isHudModeActive =
    attention?.kind === DOCK_ATTENTION_KIND.HUD ||
    attention?.kind === DOCK_ATTENTION_KIND.OPERATION;
  const isSurfaceActive = Boolean(activeItem?.isSurface);
  const activeItemHasAction = Boolean(activeItem?.action);

  const { compact, exitCompact } = useDockCompactController({
    activeItem,
    expanded: isExpanded,
    isHudActive: isHudModeActive,
    pathname,
    searchQuery,
    compactLocked,
    isVideoPlaying,
  });

  useEffect(() => {
    setIsCompact(compact);
  }, [compact, setIsCompact]);

  const clearHoverState = useCallback(() => setIsHovered(false), []);
  const pendingExpandFrameRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (pendingExpandFrameRef.current !== null)
        runtimeScheduler.cancel(pendingExpandFrameRef.current);
    };
  }, [runtimeScheduler]);

  const setExpanded = useCallback(
    (nextValue: boolean | ((prev: boolean) => boolean)) => {
      const resolvedValue =
        typeof nextValue === "function" ? nextValue(isExpanded) : nextValue;
      if (isSurfaceActive && resolvedValue) return;

      if (!resolvedValue && pendingExpandFrameRef.current !== null) {
        runtimeScheduler.cancel(pendingExpandFrameRef.current);
        pendingExpandFrameRef.current = null;
      }

      if (!resolvedValue || !compact || typeof window === "undefined") {
        setExpandedState(resolvedValue);
        return;
      }

      exitCompact({ preserveRestore: true });
      if (pendingExpandFrameRef.current !== null) return;

      pendingExpandFrameRef.current = runtimeScheduler.schedule(
        () => {
          pendingExpandFrameRef.current = null;
          setExpandedState(true);
        },
        DOCK_COMPACT_TO_EXPAND_DELAY_MS,
        { label: "dock:expand" },
      );
    },
    [
      compact,
      exitCompact,
      isExpanded,
      isSurfaceActive,
      runtimeScheduler,
      setExpandedState,
    ],
  );

  const wasSurfaceActiveRef = useRef(false);
  useEffect(() => {
    if (isSurfaceActive) {
      wasSurfaceActiveRef.current = true;
      return;
    }
    if (wasSurfaceActiveRef.current) {
      wasSurfaceActiveRef.current = false;
      clearHoverState();
    }
  }, [clearHoverState, isSurfaceActive]);

  useEffect(() => {
    if (isSurfaceActive && isExpanded) setExpandedState(false);
  }, [isExpanded, isSurfaceActive, setExpandedState]);

  const navigate = useCallback(
    async (href: string, options?: any) => {
      if (!href) return false;
      const isUnguarded = Boolean(options?.force) || getDockGuardCount() === 0;
      const navigationPromise = navigateWithGuards(href, options);
      if (isUnguarded) {
        setExpanded(false);
        setSearchQuery("");
        clearHoverState();
      }
      const didNavigate = await navigationPromise;
      if (!didNavigate) return didNavigate;
      if (!isUnguarded) {
        setExpanded(false);
        setSearchQuery("");
        clearHoverState();
      }
      return didNavigate;
    },
    [clearHoverState, navigateWithGuards, setExpanded, setSearchQuery],
  );

  const { displayItems, activeIndex: layoutActiveIndex } = useDockLayout({
    dockItems,
    activeItem,
    pathname: effectivePathname,
  });

  useDockRouteReset(pathname, () => {
    setExpanded(false);
    setSearchQuery("");
    setIsHovered(false);
  });

  return {
    dockItems: displayItems,
    activeItem,
    activeIndex: layoutActiveIndex,
    statusState,
    attention,
    topology,
    dockTransaction: activeTransaction,
    lastDockTransaction: lastTransaction,
    navigate,
    pathname,
    cancelDock,
    closeSurface,
    expanded: isExpanded,
    setExpanded,
    setDockHeight,
    setSearchQuery,
    setCompactLock,
    exitCompact,
    isHovered,
    setIsHovered,
    searchQuery,
    activeItemHasAction,
    compactLocked,
    compact,
    isHudActive: isHudModeActive,
  };
}
