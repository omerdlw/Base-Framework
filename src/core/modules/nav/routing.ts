"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  NAVIGATION_CONTINUITY_EVENTS,
  NAVIGATION_CONTINUITY_MAX_ENTRIES,
  NAVIGATION_SURFACE_RETURN_MAX_ENTRIES,
  NAVIGATION_PREFETCH_INTENT_DELAY_MS,
  NAVIGATION_TRANSACTION_EVENTS,
  NAVIGATION_TRANSACTION_REASON,
  NAVIGATION_TRANSACTION_STATUS,
  NAVIGATION_TRANSACTION_TIMEOUT_MS,
} from "./constants";
import {
  getNavigationLocationKey,
  isEqualRoutePath,
  isInlineActionPathMatch,
  isPathPrefix,
  isSafeInternalHref,
  isSameItem,
  isSameNavItem,
  isSamePath,
  normalizePath,
} from "./utils";

export {
  getNavigationLocationKey,
  isEqualRoutePath,
  isInlineActionPathMatch,
  isPathPrefix,
  isSafeInternalHref,
  isSameItem,
  isSameNavItem,
  isSamePath,
  normalizePath,
};

const IS_DEV = process.env.NODE_ENV !== "production";

export function createNavigationTransactionState() {
  return { active: null, last: null };
}

export function createNavigationTransaction(
  {
    from = "",
    id,
    source = "navigation",
    startedAt = Date.now(),
    to = "",
  }: {
    from?: string;
    id: any;
    source?: string;
    startedAt?: number;
    to?: string;
  } = {} as any,
) {
  return {
    from: String(from || ""),
    id,
    source,
    startedAt,
    status: NAVIGATION_TRANSACTION_STATUS.PENDING as string,
    to: String(to || ""),
  };
}

function settleNavigationTransaction(
  transaction: any,
  action: any,
  status: string,
) {
  return {
    ...transaction,
    endedAt: action.endedAt ?? Date.now(),
    error: action.error ?? null,
    reason: action.reason ?? null,
    status,
  };
}

const TRANSACTION_STATUS_MAP: Record<string, string> = Object.freeze({
  [NAVIGATION_TRANSACTION_EVENTS.COMPLETE]:
    NAVIGATION_TRANSACTION_STATUS.COMPLETED,
  [NAVIGATION_TRANSACTION_EVENTS.CANCEL]:
    NAVIGATION_TRANSACTION_STATUS.CANCELLED,
  [NAVIGATION_TRANSACTION_EVENTS.FAIL]: NAVIGATION_TRANSACTION_STATUS.FAILED,
  [NAVIGATION_TRANSACTION_EVENTS.TIME_OUT]:
    NAVIGATION_TRANSACTION_STATUS.TIMED_OUT,
});

export function navigationTransactionReducer(state: any, action: any) {
  if (action?.type === NAVIGATION_TRANSACTION_EVENTS.START) {
    const nextTransaction = action.transaction;
    if (nextTransaction?.id == null) return state;

    const supersededTransaction = state.active
      ? settleNavigationTransaction(
          state.active,
          { reason: NAVIGATION_TRANSACTION_REASON.SUPERSEDED },
          NAVIGATION_TRANSACTION_STATUS.CANCELLED,
        )
      : state.last;

    return { active: nextTransaction, last: supersededTransaction };
  }

  const newStatus = TRANSACTION_STATUS_MAP[action?.type];
  if (newStatus && state.active && state.active.id === action.id) {
    return {
      active: null,
      last: settleNavigationTransaction(state.active, action, newStatus),
    };
  }

  return state;
}

export function useNavigationTransactions({
  onTransactionEvent = null,
  onTimeout = null,
  timeoutMs = NAVIGATION_TRANSACTION_TIMEOUT_MS,
}: {
  onTransactionEvent?:
    ((event: { transaction: any; type: string }) => void) | null;
  onTimeout?: ((transaction: any) => void) | null;
  timeoutMs?: number;
} = {}) {
  const [state, dispatch] = useReducer(
    navigationTransactionReducer,
    undefined,
    createNavigationTransactionState,
  );

  const activeTransactionRef = useRef<any>(null);
  const nextTransactionIdRef = useRef(0);
  const timeoutRef = useRef<any>(null);

  const onTimeoutRef = useRef(onTimeout);
  const onTransactionEventRef = useRef(onTransactionEvent);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);
  useEffect(() => {
    onTransactionEventRef.current = onTransactionEvent;
  }, [onTransactionEvent]);

  const clearTransactionTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const settleTransaction = useCallback(
    (id: any, type: string, details: Record<string, any> = {}) => {
      const activeTransaction = activeTransactionRef.current;
      if (!activeTransaction || activeTransaction.id !== id) return false;

      clearTransactionTimeout();
      activeTransactionRef.current = null;

      const event = { ...details, endedAt: Date.now(), id, type };
      const settledTransaction = settleNavigationTransaction(
        activeTransaction,
        event,
        TRANSACTION_STATUS_MAP[type] || NAVIGATION_TRANSACTION_STATUS.TIMED_OUT,
      );

      dispatch(event);
      onTransactionEventRef.current?.({
        transaction: settledTransaction,
        type,
      });
      return true;
    },
    [clearTransactionTimeout],
  );

  const beginTransaction = useCallback(
    ({
      from,
      source,
      to,
    }: { from?: string; source?: string; to?: string } = {}) => {
      const activeTransaction = activeTransactionRef.current;
      if (activeTransaction) {
        settleTransaction(
          activeTransaction.id,
          NAVIGATION_TRANSACTION_EVENTS.CANCEL,
          { reason: NAVIGATION_TRANSACTION_REASON.SUPERSEDED },
        );
      }

      const transaction = createNavigationTransaction({
        from,
        id: ++nextTransactionIdRef.current,
        source,
        to,
      });
      activeTransactionRef.current = transaction;

      dispatch({ transaction, type: NAVIGATION_TRANSACTION_EVENTS.START });
      onTransactionEventRef.current?.({
        transaction,
        type: NAVIGATION_TRANSACTION_EVENTS.START,
      });

      const safeTimeout = Number(timeoutMs);
      if (Number.isFinite(safeTimeout) && safeTimeout > 0) {
        timeoutRef.current = setTimeout(() => {
          if (
            !settleTransaction(
              transaction.id,
              NAVIGATION_TRANSACTION_EVENTS.TIME_OUT,
              { reason: NAVIGATION_TRANSACTION_REASON.TIME_OUT },
            )
          )
            return;
          onTimeoutRef.current?.(transaction);
        }, safeTimeout);
      }
      return transaction;
    },
    [settleTransaction, timeoutMs],
  );

  const completeTransaction = useCallback(
    (id: any) => settleTransaction(id, NAVIGATION_TRANSACTION_EVENTS.COMPLETE),
    [settleTransaction],
  );
  const cancelTransaction = useCallback(
    (id: any, reason: any = null) =>
      settleTransaction(id, NAVIGATION_TRANSACTION_EVENTS.CANCEL, { reason }),
    [settleTransaction],
  );
  const cancelActiveTransaction = useCallback(
    (reason: any = null) =>
      activeTransactionRef.current
        ? cancelTransaction(activeTransactionRef.current.id, reason)
        : false,
    [cancelTransaction],
  );
  const failTransaction = useCallback(
    (id: any, error: any) =>
      settleTransaction(id, NAVIGATION_TRANSACTION_EVENTS.FAIL, { error }),
    [settleTransaction],
  );

  const completeTransactionForPath = useCallback(
    (pathname: string) => {
      const activeTransaction = activeTransactionRef.current;
      if (!activeTransaction || !isSamePath(activeTransaction.to, pathname))
        return false;
      return completeTransaction(activeTransaction.id);
    },
    [completeTransaction],
  );

  const isTransactionCurrent = useCallback(
    (id: any) => activeTransactionRef.current?.id === id,
    [],
  );

  useEffect(() => {
    return () => {
      clearTransactionTimeout();
      activeTransactionRef.current = null;
    };
  }, [clearTransactionTimeout]);

  return useMemo(
    () => ({
      activeTransaction: state.active,
      beginTransaction,
      cancelActiveTransaction,
      cancelTransaction,
      completeTransaction,
      completeTransactionForPath,
      failTransaction,
      isTransactionCurrent,
      lastTransaction: state.last,
    }),
    [
      state.active,
      state.last,
      beginTransaction,
      cancelActiveTransaction,
      cancelTransaction,
      completeTransaction,
      completeTransactionForPath,
      failTransaction,
      isTransactionCurrent,
    ],
  );
}

function getTopologyNodeId(item: any, index: number): string {
  return item?.id || item?.path || item?.name || `navigation-node-${index}`;
}

function flattenNavigationTopology(
  items: any[],
  parentId: string | null = null,
  depth = 0,
  nodes: any[] = [],
): any[] {
  if (!Array.isArray(items)) return nodes;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== "object") continue;

    const id = getTopologyNodeId(item, nodes.length);
    nodes.push({ depth, id, parentId, path: normalizePath(item.path || "") });

    if (item.children) {
      flattenNavigationTopology(item.children, id, depth + 1, nodes);
    }
  }
  return nodes;
}

function resolveTopologyActiveNode(nodes: any[], pathname: string): any {
  const normalizedPath = normalizePath(pathname || "");
  return nodes.find((node) => isSamePath(node.path, normalizedPath)) || null;
}

function resolveTopologyAncestors(nodes: any[], activeNode: any): any[] {
  if (!activeNode) return [];
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const ancestors = [];
  let currentNode = activeNode;

  while (currentNode?.parentId) {
    currentNode = nodesById.get(currentNode.parentId);
    if (currentNode) ancestors.unshift(currentNode);
  }
  return ancestors;
}

export function createNavigationTopology(
  items: any[] = [],
  { pathname = "" }: { pathname?: string } = {},
) {
  const nodes = flattenNavigationTopology(items);
  const activePath = normalizePath(pathname || "");
  const activeNode = resolveTopologyActiveNode(nodes, activePath);

  return {
    activeNode,
    activePath,
    ancestors: resolveTopologyAncestors(nodes, activeNode),
    nodes,
  };
}

export function resolveNavigationTopologyPath(
  topology: any,
  pathname = topology?.activePath,
): any[] {
  const nodes = Array.isArray(topology?.nodes) ? topology.nodes : [];
  const activeNode = resolveTopologyActiveNode(nodes, pathname);
  return activeNode
    ? [...resolveTopologyAncestors(nodes, activeNode), activeNode]
    : [];
}

function normalizeContinuitySnapshot(snapshot: any): Record<string, any> {
  if (
    snapshot == null ||
    typeof snapshot !== "object" ||
    Array.isArray(snapshot)
  )
    return {};
  return { ...snapshot };
}

export function createNavigationContinuityState() {
  return { entries: [], returnHandoffs: [] };
}

function normalizeNavigationReturnValue(value: any): any {
  if (value == null || typeof value !== "object") return value ?? null;
  if (Array.isArray(value)) return [...value];
  return { ...value };
}

let navigationReturnHandoffSequence = 0;

export function createNavigationReturnHandoff({
  data = null,
  flowId = null,
  pathname = "",
  status = null,
  timestamp = Date.now(),
}: {
  data?: any;
  flowId?: string | null;
  pathname?: string;
  status?: string | null;
  timestamp?: number;
} = {}) {
  if (!isSafeInternalHref(pathname)) return null;
  const path = normalizePath(pathname || "");
  if (!path) return null;

  const resolvedTimestamp = Number.isFinite(Number(timestamp))
    ? Number(timestamp)
    : Date.now();
  return {
    data: normalizeNavigationReturnValue(data),
    flowId: typeof flowId === "string" && flowId ? flowId : null,
    id: `${typeof flowId === "string" && flowId ? flowId : "surface-flow"}:${resolvedTimestamp}:${++navigationReturnHandoffSequence}`,
    path,
    status: typeof status === "string" && status ? status : null,
    timestamp: resolvedTimestamp,
  };
}

export function createNavigationContinuityEntry({
  focusKey = null,
  pathname = "",
  scrollY = 0,
  snapshot = null,
  updatedAt = Date.now(),
}: {
  focusKey?: string | null;
  pathname?: string;
  scrollY?: number;
  snapshot?: any;
  updatedAt?: number;
} = {}) {
  const path = normalizePath(pathname || "");
  if (!path) return null;

  const numericScrollY = Number(scrollY);
  return {
    focusKey: typeof focusKey === "string" && focusKey ? focusKey : null,
    path,
    scrollY: Number.isFinite(numericScrollY) ? Math.max(0, numericScrollY) : 0,
    snapshot: normalizeContinuitySnapshot(snapshot),
    updatedAt: Number.isFinite(Number(updatedAt))
      ? Number(updatedAt)
      : Date.now(),
  };
}

export function navigationContinuityReducer(state: any, action: any) {
  const currentState = state || createNavigationContinuityState();
  const returnHandoffs = Array.isArray(currentState.returnHandoffs)
    ? currentState.returnHandoffs
    : [];

  if (action?.type === NAVIGATION_CONTINUITY_EVENTS.CLEAR) {
    return currentState.entries.length || returnHandoffs.length
      ? createNavigationContinuityState()
      : currentState;
  }

  if (action?.type === NAVIGATION_CONTINUITY_EVENTS.DELIVER_RETURN) {
    const handoff = action.handoff;
    if (!handoff?.id || !handoff.path) return currentState;
    const maxEntries = Math.max(
      1,
      Number(action.maxEntries) || NAVIGATION_SURFACE_RETURN_MAX_ENTRIES,
    );

    const filteredHandoffs = returnHandoffs.filter(
      (entry: any) => entry.id !== handoff.id,
    );
    filteredHandoffs.push(handoff);
    if (filteredHandoffs.length > maxEntries)
      filteredHandoffs.splice(0, filteredHandoffs.length - maxEntries);

    return { ...currentState, returnHandoffs: filteredHandoffs };
  }

  if (action?.type === NAVIGATION_CONTINUITY_EVENTS.CONSUME_RETURN) {
    const handoffId =
      typeof action.handoffId === "string" ? action.handoffId : "";
    if (!handoffId) return currentState;

    const nextReturnHandoffs = returnHandoffs.filter(
      (entry: any) => entry.id !== handoffId,
    );
    return nextReturnHandoffs.length === returnHandoffs.length
      ? currentState
      : { ...currentState, returnHandoffs: nextReturnHandoffs };
  }

  if (action?.type === NAVIGATION_CONTINUITY_EVENTS.REMOVE) {
    const path = normalizePath(action.path || "");
    const entries = currentState.entries.filter(
      (entry: any) => entry.path !== path,
    );
    return entries.length === currentState.entries.length
      ? currentState
      : { ...currentState, entries };
  }

  if (
    action?.type !== NAVIGATION_CONTINUITY_EVENTS.RECORD ||
    !action.entry?.path
  ) {
    return currentState;
  }

  const maxEntries = Math.max(
    1,
    Number(action.maxEntries) || NAVIGATION_CONTINUITY_MAX_ENTRIES,
  );

  const nextEntries = currentState.entries.filter(
    (entry: any) => entry.path !== action.entry.path,
  );
  nextEntries.push(action.entry);
  if (nextEntries.length > maxEntries)
    nextEntries.splice(0, nextEntries.length - maxEntries);

  return { ...currentState, entries: nextEntries };
}

export function resolveNavigationContinuityEntry(state: any, pathname: string) {
  const path = normalizePath(pathname || "");
  return state?.entries?.find((entry: any) => entry.path === path) || null;
}

export function resolveNavigationReturnHandoffs(state: any, pathname: string) {
  const path = normalizePath(pathname || "");
  if (!path) return [];
  return (state?.returnHandoffs || []).filter(
    (handoff: any) => handoff.path === path,
  );
}

export function useNavigationContinuity({
  maxEntries = NAVIGATION_CONTINUITY_MAX_ENTRIES,
}: {
  maxEntries?: number;
} = {}) {
  const [state, dispatch] = useReducer(
    navigationContinuityReducer,
    undefined,
    createNavigationContinuityState,
  );
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const remember = useCallback(
    (pathname: string, options: Record<string, any> = {}) => {
      const entry = createNavigationContinuityEntry({
        pathname,
        scrollY:
          options.scrollY ??
          (typeof window === "undefined" ? 0 : window.scrollY),
        ...options,
      });
      if (!entry) return null;
      dispatch({
        entry,
        maxEntries,
        type: NAVIGATION_CONTINUITY_EVENTS.RECORD,
      });
      return entry;
    },
    [maxEntries],
  );

  const remove = useCallback(
    (pathname: string) =>
      dispatch({ path: pathname, type: NAVIGATION_CONTINUITY_EVENTS.REMOVE }),
    [],
  );
  const clear = useCallback(
    () => dispatch({ type: NAVIGATION_CONTINUITY_EVENTS.CLEAR }),
    [],
  );
  const get = useCallback(
    (pathname: string) =>
      resolveNavigationContinuityEntry(stateRef.current, pathname),
    [],
  );

  const deliverReturn = useCallback(
    (pathname: string, input: Record<string, any> = {}) => {
      const handoff = createNavigationReturnHandoff({ pathname, ...input });
      if (!handoff) return null;
      dispatch({
        handoff,
        maxEntries: NAVIGATION_SURFACE_RETURN_MAX_ENTRIES,
        type: NAVIGATION_CONTINUITY_EVENTS.DELIVER_RETURN,
      });
      return handoff;
    },
    [],
  );

  const getReturns = useCallback(
    (pathname: string) =>
      resolveNavigationReturnHandoffs(stateRef.current, pathname),
    [],
  );

  const consumeReturn = useCallback(
    (pathname: string, handoffId: string | null = null) => {
      const handoffs = resolveNavigationReturnHandoffs(
        stateRef.current,
        pathname,
      );
      const handoff = handoffId
        ? handoffs.find((entry: any) => entry.id === handoffId) || null
        : handoffs[0] || null;
      if (!handoff) return null;

      dispatch({
        handoffId: handoff.id,
        type: NAVIGATION_CONTINUITY_EVENTS.CONSUME_RETURN,
      });
      return handoff;
    },
    [],
  );

  const restore = useCallback(
    (
      pathname: string,
      {
        focusKey = null,
        restoreScroll = true,
      }: { focusKey?: string | null; restoreScroll?: boolean } = {},
    ) => {
      const entry = resolveNavigationContinuityEntry(
        stateRef.current,
        pathname,
      );
      if (typeof window === "undefined") return entry;

      const targetFocusKey = focusKey || entry?.focusKey;

      requestAnimationFrame(() => {
        if (restoreScroll && entry)
          window.scrollTo({ top: entry.scrollY, behavior: "auto" });

        if (!targetFocusKey || typeof document === "undefined") return;

        const safeKey =
          typeof CSS !== "undefined" && CSS.escape
            ? CSS.escape(targetFocusKey)
            : targetFocusKey.replace(/"/g, '\\"');
        const target = document.querySelector(
          `[data-nav-focus-key="${safeKey}"]`,
        ) as HTMLElement | null;

        if (!target || typeof target.focus !== "function") return;
        try {
          target.focus({ preventScroll: true });
        } catch {
          target.focus();
        }
      });

      return entry;
    },
    [],
  );

  return useMemo(
    () => ({
      clear,
      consumeReturn,
      deliverReturn,
      entries: state.entries,
      get,
      getReturns,
      remember,
      remove,
      restore,
      returnHandoffs: state.returnHandoffs,
    }),
    [
      clear,
      consumeReturn,
      deliverReturn,
      get,
      getReturns,
      remember,
      remove,
      restore,
      state.entries,
      state.returnHandoffs,
    ],
  );
}

function getRoutePolicyOverrides(item: any): Record<string, any> {
  return item?.navigationPolicy && typeof item.navigationPolicy === "object"
    ? item.navigationPolicy
    : {};
}

function resolvePolicyBoolean(value: any, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function resolveNavigationRoutePolicy({
  href,
  item = null,
}: { href?: string; item?: any } = {}) {
  const overrides = getRoutePolicyOverrides(item);
  const canNavigate = isSafeInternalHref(href);
  const canPrefetch =
    canNavigate &&
    !item?.isLoading &&
    !item?.isOverlay &&
    !item?.isSurface &&
    !item?.prefetchDisabled;

  return {
    canNavigate,
    clearTransientState: resolvePolicyBoolean(
      overrides.clearTransientState,
      true,
    ),
    dismissSurfaces: resolvePolicyBoolean(overrides.dismissSurfaces, true),
    prefetch:
      resolvePolicyBoolean(overrides.prefetch, canPrefetch) && canPrefetch,
  };
}

export function useRoutePrefetch(
  router: any,
  {
    intentDelayMs = NAVIGATION_PREFETCH_INTENT_DELAY_MS,
  }: { intentDelayMs?: number } = {},
) {
  const routeStatesRef = useRef(
    new Map<string, { isPrefetched: boolean; timeoutId: any }>(),
  );

  const cancelRoutePrefetch = useCallback((href: string) => {
    const routeState = routeStatesRef.current.get(href);
    if (routeState?.timeoutId == null) return false;
    clearTimeout(routeState.timeoutId);
    routeStatesRef.current.delete(href);
    return true;
  }, []);

  const prefetchRoute = useCallback(
    (href: string, { immediate = false }: { immediate?: boolean } = {}) => {
      if (!isSafeInternalHref(href) || typeof router?.prefetch !== "function")
        return false;

      const routeState = routeStatesRef.current.get(href);
      if (routeState?.isPrefetched || routeState?.timeoutId != null)
        return false;

      const startPrefetch = () => {
        const currentState = routeStatesRef.current.get(href);
        if (!currentState) return;

        currentState.timeoutId = null;
        currentState.isPrefetched = true;

        try {
          router.prefetch(href, {
            onInvalidate: () => {
              const invalidatedState = routeStatesRef.current.get(href);
              if (!invalidatedState) return;
              invalidatedState.isPrefetched = false;
              if (invalidatedState.timeoutId == null)
                routeStatesRef.current.delete(href);
            },
          });
        } catch (error) {
          routeStatesRef.current.delete(href);
          if (IS_DEV)
            console.warn("[Navigation] Route prefetch failed:", error);
        }
      };

      const delay = immediate ? 0 : Math.max(0, Number(intentDelayMs) || 0);
      const nextState: { isPrefetched: boolean; timeoutId: any } = {
        isPrefetched: false,
        timeoutId: null,
      };

      routeStatesRef.current.set(href, nextState);
      if (delay === 0) startPrefetch();
      else nextState.timeoutId = setTimeout(startPrefetch, delay);

      return true;
    },
    [intentDelayMs, router],
  );

  useEffect(() => {
    const routeStates = routeStatesRef.current;
    return () => {
      routeStates.forEach((routeState) => {
        if (routeState.timeoutId != null) clearTimeout(routeState.timeoutId);
      });
      routeStates.clear();
    };
  }, []);

  return useMemo(
    () => ({ cancelRoutePrefetch, prefetchRoute }),
    [cancelRoutePrefetch, prefetchRoute],
  );
}

export function formatSlugTitle(slug = ""): string {
  if (!slug) return "";
  return String(slug)
    .split(/[-_]+/)
    .map((word) =>
      word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : "",
    )
    .filter(Boolean)
    .join(" ");
}
