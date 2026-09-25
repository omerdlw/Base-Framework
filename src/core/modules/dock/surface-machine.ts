"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  DOCK_EVENTS,
  DOCK_LIFECYCLE,
  DOCK_SURFACE_FLOW_STATUS,
  DOCK_SURFACE_PHASE,
} from "./constants";
import {
  focusDockElement,
  shouldRestoreDockFocus,
} from "./behavior";
import {
  DOCK_COMPACT_TO_SURFACE_DELAY_MS,
  DOCK_SURFACE_CHOREOGRAPHY_TIMINGS,
  DOCK_SURFACE_CLOSE_TO_COMPACT_DELAY_MS,
  DOCK_SURFACE_EXIT_SETTLE_MS,
} from "./motion";
import {
  createDockScheduler,
  createPendingSurfaceScheduler,
} from "./scheduler";
import {
  isValidComponentType,
  normalizeSurfaceFlowSnapshot,
} from "./utils";
import type {
  SurfaceTransitionResult,
  SurfaceTransitionState,
} from "./types";
import {
  createSurfaceEntryDefinition,
  createSurfaceError,
  createSurfaceFlowDefinition,
  createSurfaceFlowSession,
  updateSurfaceFlowSession,
} from "./surface-flow";

export { createPendingSurfaceScheduler };

const IS_BROWSER = typeof window !== "undefined";

export const SURFACE_TRANSITION_EVENTS = Object.freeze({
  ADVANCE: "surface-transition:advance",
  CLOSE: "surface-transition:close",
  CLOSE_ALL: "surface-transition:close-all",
  OPEN: "surface-transition:open",
  SET_COMPACT: "surface-transition:set-compact",
} as const);

export const SURFACE_TRANSITION_EFFECTS = Object.freeze({
  MOUNT: "surface-transition:mount",
  RELEASE: "surface-transition:release",
  SCHEDULE: "surface-transition:schedule",
} as const);

const EMPTY_SURFACE_TRANSITION_EFFECTS = Object.freeze([]);

function freezeSurfaceTransitionState(state: any): SurfaceTransitionState {
  return {
    closingSurfaceIds: [...state.closingSurfaceIds],
    isCompact: Boolean(state.isCompact),
    phase: state.phase,
    surfaceIds: [...state.surfaceIds],
    surfaceLifecycle: state.surfaceLifecycle,
  };
}

function createTransitionResult(
  state: SurfaceTransitionState,
  effects: readonly any[] = EMPTY_SURFACE_TRANSITION_EFFECTS,
): SurfaceTransitionResult {
  return { state, effects: [...effects] };
}

function createScheduledTransition(delayMs: number, label: string) {
  return {
    delayMs: Math.max(0, Number(delayMs) || 0),
    event: { type: SURFACE_TRANSITION_EVENTS.ADVANCE },
    label,
    type: SURFACE_TRANSITION_EFFECTS.SCHEDULE,
  };
}

function createReleaseEffect(surfaceIds: readonly string[]) {
  return {
    surfaceIds: [...surfaceIds],
    type: SURFACE_TRANSITION_EFFECTS.RELEASE,
  };
}

export function createSurfaceTransitionState(
  input: any = {},
): SurfaceTransitionState {
  const surfaceIds = [
    ...new Set(Array.isArray(input.surfaceIds) ? input.surfaceIds : []),
  ].filter((s) => s != null);
  const closingSurfaceIds = [
    ...new Set(
      Array.isArray(input.closingSurfaceIds) ? input.closingSurfaceIds : [],
    ),
  ].filter((s) => (surfaceIds as any[]).includes(s));
  const phase = Object.values(DOCK_SURFACE_PHASE).includes(input.phase)
    ? input.phase
    : surfaceIds.length > 0
      ? DOCK_SURFACE_PHASE.OPEN
      : DOCK_SURFACE_PHASE.IDLE;

  const surfaceLifecycle = Object.values(DOCK_LIFECYCLE).includes(
    input.surfaceLifecycle,
  )
    ? input.surfaceLifecycle
    : phase === DOCK_SURFACE_PHASE.IDLE
      ? DOCK_LIFECYCLE.IDLE
      : phase === DOCK_SURFACE_PHASE.OPEN
        ? DOCK_LIFECYCLE.OPEN
        : closingSurfaceIds.length > 0
          ? DOCK_LIFECYCLE.CLOSING
          : DOCK_LIFECYCLE.OPENING;

  return freezeSurfaceTransitionState({
    closingSurfaceIds,
    isCompact: input.isCompact,
    phase,
    surfaceIds,
    surfaceLifecycle,
  });
}

export function transitionSurface(
  currentState: any,
  event: any = {},
): SurfaceTransitionResult {
  const state = createSurfaceTransitionState(currentState);
  switch (event.type) {
    case SURFACE_TRANSITION_EVENTS.SET_COMPACT:
      return state.isCompact === Boolean(event.value)
        ? createTransitionResult(state)
        : createTransitionResult(
            freezeSurfaceTransitionState({
              ...state,
              isCompact: Boolean(event.value),
            }),
          );

    case SURFACE_TRANSITION_EVENTS.OPEN: {
      const { surfaceId } = event;
      if (surfaceId == null || state.surfaceIds.includes(surfaceId))
        return createTransitionResult(state);

      const isStacked = state.surfaceIds.length > 0;
      const phase = isStacked
        ? DOCK_SURFACE_PHASE.OPEN
        : event.skipActionDismiss
          ? DOCK_SURFACE_PHASE.EXPANDING_BODY
          : DOCK_SURFACE_PHASE.DISMISSING_ACTION;

      const nextState = freezeSurfaceTransitionState({
        ...state,
        closingSurfaceIds: [],
        phase,
        surfaceIds: [...state.surfaceIds, surfaceId],
        surfaceLifecycle: isStacked
          ? DOCK_LIFECYCLE.OPEN
          : DOCK_LIFECYCLE.OPENING,
      });
      const effects = isStacked
        ? [Object.freeze({ surfaceId, type: SURFACE_TRANSITION_EFFECTS.MOUNT })]
        : event.skipActionDismiss
          ? [
              Object.freeze({
                surfaceId,
                type: SURFACE_TRANSITION_EFFECTS.MOUNT,
              }),
              createScheduledTransition(
                DOCK_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_ENTER_MS,
                "surface:open-body",
              ),
            ]
          : [
              createScheduledTransition(
                DOCK_SURFACE_CHOREOGRAPHY_TIMINGS.ACTION_DISMISS_MS +
                  DOCK_SURFACE_CHOREOGRAPHY_TIMINGS.ACTION_DISMISS_SETTLE_MS,
                "surface:dismiss-action",
              ),
            ];
      return createTransitionResult(nextState, effects);
    }

    case SURFACE_TRANSITION_EVENTS.CLOSE: {
      if (!state.surfaceIds.includes(event.surfaceId))
        return createTransitionResult(state);
      const remainingSurfaceIds = state.surfaceIds.filter(
        (id) => id !== event.surfaceId,
      );

      if (remainingSurfaceIds.length > 0) {
        return createTransitionResult(
          freezeSurfaceTransitionState({
            ...state,
            closingSurfaceIds: [],
            phase: DOCK_SURFACE_PHASE.OPEN,
            surfaceIds: remainingSurfaceIds,
            surfaceLifecycle: DOCK_LIFECYCLE.OPEN,
          }),
          [createReleaseEffect([event.surfaceId])],
        );
      }
      return createTransitionResult(
        freezeSurfaceTransitionState({
          ...state,
          closingSurfaceIds: [event.surfaceId],
          phase: DOCK_SURFACE_PHASE.COLLAPSING_BODY,
          surfaceLifecycle: DOCK_LIFECYCLE.CLOSING,
        }),
        [
          createScheduledTransition(
            DOCK_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_EXIT_MS +
              DOCK_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_COLLAPSE_SETTLE_MS,
            "surface:collapse-body",
          ),
        ],
      );
    }

    case SURFACE_TRANSITION_EVENTS.CLOSE_ALL:
      return state.surfaceIds.length === 0
        ? createTransitionResult(state)
        : createTransitionResult(
            freezeSurfaceTransitionState({
              ...state,
              closingSurfaceIds: state.surfaceIds,
              phase: DOCK_SURFACE_PHASE.COLLAPSING_BODY,
              surfaceLifecycle: DOCK_LIFECYCLE.CLOSING,
            }),
            [
              createScheduledTransition(
                DOCK_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_EXIT_MS +
                  DOCK_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_COLLAPSE_SETTLE_MS,
                "surface:collapse-all",
              ),
            ],
          );

    case SURFACE_TRANSITION_EVENTS.ADVANCE:
      if (
        state.phase === DOCK_SURFACE_PHASE.DISMISSING_ACTION ||
        state.phase === DOCK_SURFACE_PHASE.SWAPPING_HEADER
      ) {
        const activeSurfaceId = state.surfaceIds.at(-1);
        return createTransitionResult(
          freezeSurfaceTransitionState({
            ...state,
            phase: DOCK_SURFACE_PHASE.EXPANDING_BODY,
          }),
          [
            Object.freeze({
              surfaceId: activeSurfaceId,
              type: SURFACE_TRANSITION_EFFECTS.MOUNT,
            }),
            createScheduledTransition(
              DOCK_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_ENTER_MS,
              "surface:expand-body",
            ),
          ],
        );
      }
      if (state.phase === DOCK_SURFACE_PHASE.EXPANDING_BODY) {
        return createTransitionResult(
          freezeSurfaceTransitionState({
            ...state,
            phase: DOCK_SURFACE_PHASE.OPEN,
            surfaceLifecycle: DOCK_LIFECYCLE.OPEN,
          }),
        );
      }
      if (
        state.phase === DOCK_SURFACE_PHASE.COLLAPSING_BODY &&
        DOCK_SURFACE_CHOREOGRAPHY_TIMINGS.HEADER_RESTORE_MS > 0
      ) {
        return createTransitionResult(
          freezeSurfaceTransitionState({
            ...state,
            phase: DOCK_SURFACE_PHASE.RESTORING_HEADER,
          }),
          [
            createScheduledTransition(
              DOCK_SURFACE_CHOREOGRAPHY_TIMINGS.HEADER_RESTORE_MS,
              "surface:restore-header",
            ),
          ],
        );
      }
      if (
        state.phase === DOCK_SURFACE_PHASE.COLLAPSING_BODY ||
        state.phase === DOCK_SURFACE_PHASE.RESTORING_HEADER
      ) {
        const releasedSurfaceIds = state.closingSurfaceIds;
        const surfaceIds = state.surfaceIds.filter(
          (id) => !releasedSurfaceIds.includes(id),
        );
        return createTransitionResult(
          freezeSurfaceTransitionState({
            ...state,
            closingSurfaceIds: [],
            phase:
              surfaceIds.length > 0
                ? DOCK_SURFACE_PHASE.OPEN
                : DOCK_SURFACE_PHASE.IDLE,
            surfaceIds,
            surfaceLifecycle:
              surfaceIds.length > 0
                ? DOCK_LIFECYCLE.OPEN
                : DOCK_LIFECYCLE.IDLE,
          }),
          releasedSurfaceIds.length > 0
            ? [createReleaseEffect(releasedSurfaceIds)]
            : EMPTY_SURFACE_TRANSITION_EFFECTS,
        );
      }
      return createTransitionResult(state);

    default:
      return createTransitionResult(state);
  }
}

export function runSurfaceTransition({
  event,
  onEffect = () => {},
  onTransition = () => {},
  scheduler = createDockScheduler(),
  state,
}: {
  event?: any;
  onEffect?: (effect: any, state: any) => void;
  onTransition?: (state: any, event: any) => void;
  scheduler?: any;
  state?: any;
} = {}) {
  let currentState = createSurfaceTransitionState(state);
  let pendingEvent: any = null;
  let pendingTaskId: any = null;
  let stopped = false;

  const cancelPending = () => {
    if (pendingTaskId !== null) scheduler.cancel(pendingTaskId);
    pendingEvent = null;
    pendingTaskId = null;
  };

  const apply = (nextEvent: any, synchronous = false) => {
    if (stopped || !nextEvent) return currentState;
    const result = transitionSurface(currentState, nextEvent);
    currentState = result.state;
    onTransition(currentState, nextEvent);

    result.effects.forEach((effect) => {
      if (effect.type !== SURFACE_TRANSITION_EFFECTS.SCHEDULE) {
        onEffect(effect, currentState);
        return;
      }
      pendingEvent = effect.event;
      if (synchronous) return;
      pendingTaskId = scheduler.schedule(
        () => {
          const scheduledEvent = pendingEvent;
          pendingEvent = null;
          pendingTaskId = null;
          apply(scheduledEvent);
        },
        effect.delayMs,
        { label: effect.label },
      );
    });
    return currentState;
  };

  const finish = () => {
    if (stopped) return currentState;
    let advances = 0;
    while (pendingEvent && advances < 16) {
      const nextEvent = pendingEvent;
      if (pendingTaskId !== null) scheduler.cancel(pendingTaskId);
      pendingEvent = null;
      pendingTaskId = null;
      apply(nextEvent, true);
      advances += 1;
    }
    if (pendingEvent)
      throw new Error("Surface transition exceeded its advance safety limit");
    return currentState;
  };

  apply(event);

  return Object.freeze({
    cancel() {
      if (stopped) return false;
      stopped = true;
      cancelPending();
      return true;
    },
    dispatch(nextEvent: any) {
      finish();
      return apply(nextEvent);
    },
    finish,
    getState() {
      return currentState;
    },
  });
}

export function createSurfaceLifecycleState() {
  return {
    isCompact: false,
    surfaceIds: [] as any[],
    surfaceLifecycle: DOCK_LIFECYCLE.IDLE as string,
  };
}

export function surfaceLifecycleReducer(state: any, action: any) {
  switch (action?.type) {
    case DOCK_EVENTS.SET_COMPACT:
      return state.isCompact === Boolean(action.value)
        ? state
        : { ...state, isCompact: Boolean(action.value) };
    case DOCK_EVENTS.OPEN_SURFACE:
      if (
        action.surfaceId == null ||
        state.surfaceIds.includes(action.surfaceId)
      )
        return state;
      return {
        ...state,
        surfaceIds: [...state.surfaceIds, action.surfaceId],
        surfaceLifecycle: DOCK_LIFECYCLE.OPENING,
      };
    case DOCK_EVENTS.SURFACE_MOUNTED:
      return state.surfaceLifecycle === DOCK_LIFECYCLE.OPENING
        ? { ...state, surfaceLifecycle: DOCK_LIFECYCLE.OPEN }
        : state;
    case DOCK_EVENTS.CLOSE_SURFACE: {
      const surfaceIds = state.surfaceIds.filter(
        (id: any) => id !== action.surfaceId,
      );
      if (surfaceIds.length === state.surfaceIds.length) return state;
      return {
        ...state,
        surfaceIds,
        surfaceLifecycle: surfaceIds.length
          ? DOCK_LIFECYCLE.OPEN
          : DOCK_LIFECYCLE.CLOSING,
      };
    }
    case DOCK_EVENTS.CLOSE_ALL_SURFACES:
      return state.surfaceIds.length
        ? {
            ...state,
            surfaceIds: [],
            surfaceLifecycle: DOCK_LIFECYCLE.CLOSING,
          }
        : state;
    default:
      return state;
  }
}

function resolveSurfaceEntry(entry: any, payloadMap: any) {
  if (!entry) return null;
  return { ...(payloadMap?.get(entry.payloadId) || {}), ...entry };
}

export function createSurfaceState(
  surfaceStack: any[] = [],
  payloadMap: any = null,
  surfacePhase: string = DOCK_SURFACE_PHASE.IDLE,
) {
  const resolvedSurfaceStack = surfaceStack
    .map((entry) => resolveSurfaceEntry(entry, payloadMap))
    .filter(Boolean);
  const activeSurface = resolvedSurfaceStack[resolvedSurfaceStack.length - 1];
  return {
    activeSurfaceId: activeSurface?.id || null,
    isSurfaceOpen: resolvedSurfaceStack.length > 0,
    activeSurfaceEntry: activeSurface || null,
    surfaceStack: resolvedSurfaceStack,
    surfacePhase,
  };
}

function getSurfaceUrlValue(surfaceEntry: any): string {
  return typeof surfaceEntry?.syncWithUrl === "string"
    ? surfaceEntry.syncWithUrl
    : surfaceEntry?.urlKey || "open";
}

function createSurfaceHistoryState(surfaceEntry: any) {
  const value = getSurfaceUrlValue(surfaceEntry);
  const flow = surfaceEntry?.flow;
  return {
    value,
    ...(flow ? { flow: { id: flow.flowId, snapshot: flow.snapshot } } : {}),
  };
}

function toSurfaceFlowState(session: any) {
  if (!session?.flowId) return null;
  return {
    flowId: session.flowId,
    returnHandshake: session.returnHandshake,
    snapshot: session.snapshot,
    status: session.status,
  };
}

function getRestorableSurfaceFlowSnapshot(definition: any) {
  if (!IS_BROWSER || !definition?.restoreFromUrl || !definition?.id)
    return undefined;

  const dockSurface = window.history.state?.dockSurface;
  const flow = dockSurface?.flow;
  const currentSurfaceValue = new URL(window.location.href).searchParams.get(
    "surface",
  );

  if (
    !flow ||
    flow.id !== definition.id ||
    !dockSurface.value ||
    currentSurfaceValue !== dockSurface.value
  )
    return undefined;
  return normalizeSurfaceFlowSnapshot(flow.snapshot);
}

function syncSurfaceUrl(
  surfaceEntry: any,
  isOpening: boolean,
  urlState: any = null,
) {
  if (!IS_BROWSER || (!surfaceEntry?.syncWithUrl && !surfaceEntry?.urlKey))
    return;
  try {
    const url = new URL(window.location.href);
    if (isOpening) {
      const value = getSurfaceUrlValue(surfaceEntry);
      if (urlState) urlState.previousValue = url.searchParams.get("surface");
      url.searchParams.set("surface", value);
      window.history.pushState(
        {
          ...window.history.state,
          dockSurface: createSurfaceHistoryState(surfaceEntry),
        },
        "",
        url.toString(),
      );
      return;
    }
    if (urlState?.value && url.searchParams.get("surface") !== urlState.value)
      return;
    if (urlState?.previousValue)
      url.searchParams.set("surface", urlState.previousValue);
    else url.searchParams.delete("surface");

    const state = { ...window.history.state };
    if (state.dockSurface?.value === urlState?.value) delete state.dockSurface;
    window.history.replaceState(state, "", url.toString());
  } catch (error) {
    if (process.env.NODE_ENV !== "production")
      console.warn("[Dock] Surface URL synchronization failed:", error);
  }
}

function syncSurfaceFlowUrlState(surfaceEntry: any, urlState: any = null) {
  if (!IS_BROWSER || (!surfaceEntry?.syncWithUrl && !surfaceEntry?.urlKey))
    return;
  try {
    const url = new URL(window.location.href);
    const value = getSurfaceUrlValue(surfaceEntry);
    if (url.searchParams.get("surface") !== value || urlState?.value !== value)
      return;
    window.history.replaceState(
      {
        ...window.history.state,
        dockSurface: createSurfaceHistoryState(surfaceEntry),
      },
      "",
      url.toString(),
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production")
      console.warn(
        "[Dock] Surface flow URL synchronization failed:",
        error,
      );
  }
}

function getTargetSurfaceId(surfaceStack: any[], targetSurfaceId: any = null) {
  return targetSurfaceId || surfaceStack[surfaceStack.length - 1]?.id || null;
}

function findSurfaceEntry(surfaceStack: any[], surfaceId: any) {
  return surfaceStack.find((entry) => entry.id === surfaceId) || null;
}

function updateSurfaceStackEntry(
  surfaceStack: any[],
  surfaceId: any,
  updateEntry: (entry: any) => any,
) {
  return surfaceStack.map((entry) =>
    entry.id === surfaceId ? updateEntry(entry) : entry,
  );
}

function createSurfaceRuntimeEntry(
  surfaceId: any,
  definition: any,
  flowSession: any = null,
) {
  const {
    onClose,
    component,
    content,
    props,
    action,
    showAction,
    steps,
    trailing,
    headerAction,
    title,
    description,
    icon,
    closeLabel,
    ...surfaceMetadata
  } = definition;
  const payloadId = `surface-payload-${surfaceId}`;
  return {
    payload: {
      component,
      content,
      props,
      action,
      showAction,
      steps,
      trailing,
      headerAction,
      title,
      description,
      icon,
      closeLabel,
      onClose,
    },
    surfaceEntry: {
      id: surfaceId,
      payloadId,
      ...(flowSession ? { flow: toSurfaceFlowState(flowSession) } : {}),
      ...surfaceMetadata,
    },
  };
}

function releaseSurfaceResources({
  result,
  surfaceEntryMap,
  surfaceId,
  surfaceOnCloseMap,
  surfacePayloadMap,
  surfaceFlowSessionMap,
  surfaceFlowToSurfaceIdMap,
  surfacePromiseMap,
  surfaceResolveMap,
  surfaceUrlStateMap,
}: {
  result: any;
  surfaceEntryMap: Map<any, any>;
  surfaceId: any;
  surfaceOnCloseMap: Map<any, any>;
  surfacePayloadMap: Map<any, any>;
  surfaceFlowSessionMap: Map<any, any>;
  surfaceFlowToSurfaceIdMap: Map<any, any>;
  surfacePromiseMap: Map<any, any>;
  surfaceResolveMap: Map<any, any>;
  surfaceUrlStateMap: Map<any, any>;
}) {
  const targetEntry = surfaceEntryMap.get(surfaceId);
  if (targetEntry) {
    syncSurfaceUrl(targetEntry, false, surfaceUrlStateMap.get(surfaceId));
    surfacePayloadMap.delete(targetEntry.payloadId);
  }
  surfaceEntryMap.delete(surfaceId);
  surfaceUrlStateMap.delete(surfaceId);

  const flowSession = surfaceFlowSessionMap.get(surfaceId);
  if (
    flowSession &&
    surfaceFlowToSurfaceIdMap.get(flowSession.flowId) === surfaceId
  ) {
    surfaceFlowToSurfaceIdMap.delete(flowSession.flowId);
  }
  surfaceFlowSessionMap.delete(surfaceId);
  surfacePromiseMap.delete(surfaceId);

  const onClose = surfaceOnCloseMap.get(surfaceId);
  if (typeof onClose === "function") {
    try {
      onClose(result);
    } catch (error) {
      console.error("Dock surface onClose handler failed:", error);
    }
  }
  surfaceOnCloseMap.delete(surfaceId);

  const resolve = surfaceResolveMap.get(surfaceId);
  if (typeof resolve === "function") resolve(result);
  surfaceResolveMap.delete(surfaceId);

  return flowSession || null;
}

const initialSurfaceState = createSurfaceState(
  [],
  null,
  DOCK_SURFACE_PHASE.IDLE,
);

export function useSurfaceStack({
  isCompact = false,
  onSurfaceFlowSettled = null,
  scheduler = null,
  setCompactLock,
  setExpanded,
  setSearchQuery,
}: {
  isCompact?: boolean;
  onSurfaceFlowSettled?: any;
  scheduler?: any;
  setCompactLock: (source: string, locked: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  setSearchQuery: (query: string) => void;
}) {
  const [surfaceState, setSurfaceState] = useState(initialSurfaceState);
  const [surfaceLifecycleState, setSurfaceLifecycleState] = useState(
    createSurfaceLifecycleState,
  );
  const [surfacePhase, setSurfacePhase] = useState<string>(
    DOCK_SURFACE_PHASE.IDLE,
  );

  const surfaceStackRef = useRef<any[]>([]);
  const surfacePayloadMapRef = useRef(new Map());
  const surfaceEntryMapRef = useRef(new Map());
  const surfaceFlowSessionMapRef = useRef(new Map());
  const surfaceFlowToSurfaceIdMapRef = useRef(new Map());
  const surfacePromiseMapRef = useRef(new Map());
  const surfaceResolveMapRef = useRef(new Map());
  const surfaceOnCloseMapRef = useRef(new Map());
  const surfaceUrlStateMapRef = useRef(new Map());
  const surfaceFocusOriginMapRef = useRef(new Map());

  const surfaceIdRef = useRef(0);
  const isCompactRef = useRef(Boolean(isCompact));
  isCompactRef.current = Boolean(isCompact);
  const wasCompactRef = useRef(false);
  const runtimeSchedulerRef = useRef(scheduler || createDockScheduler());
  const compactUnlockTimerRef = useRef<any>(null);
  const pendingSurfaceSchedulerRef = useRef(
    createPendingSurfaceScheduler({ scheduler: runtimeSchedulerRef.current }),
  );
  const focusRestoreFrameRef = useRef<any>(null);
  const surfacePhaseRef = useRef<string>(DOCK_SURFACE_PHASE.IDLE);
  const transitionRunnerRef = useRef<any>(null);
  const onSurfaceFlowSettledRef = useRef(onSurfaceFlowSettled);
  onSurfaceFlowSettledRef.current = onSurfaceFlowSettled;

  const runtimeScheduler = runtimeSchedulerRef.current;

  const clearChoreographyTimers = useCallback(() => {
    transitionRunnerRef.current?.cancel();
    transitionRunnerRef.current = null;
  }, []);

  const finishSurfaceTransition = useCallback(() => {
    transitionRunnerRef.current?.finish();
    transitionRunnerRef.current = null;
  }, []);

  const setIsCompact = useCallback((compactVal: boolean) => {
    isCompactRef.current = compactVal;
    setSurfaceLifecycleState((currentState: any) =>
      surfaceLifecycleReducer(currentState, {
        type: DOCK_EVENTS.SET_COMPACT,
        value: compactVal,
      }),
    );
  }, []);

  const syncSurfaceStack = useCallback(
    (nextStack: any[], nextPhase: string | null = null) => {
      surfaceStackRef.current = nextStack;
      const effectivePhase =
        nextPhase ??
        (nextStack.length > 0
          ? DOCK_SURFACE_PHASE.OPEN
          : DOCK_SURFACE_PHASE.IDLE);
      surfacePhaseRef.current = effectivePhase;
      setSurfacePhase(effectivePhase);
      setSurfaceState(
        createSurfaceState(
          nextStack,
          surfacePayloadMapRef.current,
          effectivePhase,
        ),
      );
    },
    [],
  );

  const restoreSurfaceFocus = useCallback(
    (surfaceId: any, result: any, nextStack: any[] = []) => {
      const focusOrigin = surfaceFocusOriginMapRef.current.get(surfaceId);
      surfaceFocusOriginMapRef.current.delete(surfaceId);
      if (
        !focusOrigin ||
        nextStack.length > 0 ||
        !shouldRestoreDockFocus(result)
      )
        return;

      if (focusRestoreFrameRef.current !== null)
        runtimeScheduler.cancel(focusRestoreFrameRef.current);
      focusRestoreFrameRef.current = runtimeScheduler.scheduleFrame(
        () => {
          focusRestoreFrameRef.current = null;
          if (surfaceStackRef.current.length > 0) return;
          focusDockElement(focusOrigin);
        },
        { label: "surface:restore-focus" },
      );
    },
    [runtimeScheduler],
  );

  const finalizeSurfaceClose = useCallback(
    (surfaceId: any, result: any, nextStack: any[] = []) => {
      const flowSession = releaseSurfaceResources({
        result,
        surfaceEntryMap: surfaceEntryMapRef.current,
        surfaceId,
        surfaceOnCloseMap: surfaceOnCloseMapRef.current,
        surfacePayloadMap: surfacePayloadMapRef.current,
        surfaceFlowSessionMap: surfaceFlowSessionMapRef.current,
        surfaceFlowToSurfaceIdMap: surfaceFlowToSurfaceIdMapRef.current,
        surfacePromiseMap: surfacePromiseMapRef.current,
        surfaceResolveMap: surfaceResolveMapRef.current,
        surfaceUrlStateMap: surfaceUrlStateMapRef.current,
      });

      const isReturnHandshakeHandled = Boolean(
        flowSession &&
        onSurfaceFlowSettledRef.current?.({ flow: flowSession, result }),
      );
      if (!isReturnHandshakeHandled)
        restoreSurfaceFocus(surfaceId, result, nextStack);
    },
    [restoreSurfaceFocus],
  );

  const unlockCompactAfterSurfaceClose = useCallback(() => {
    if (!wasCompactRef.current) return;
    if (compactUnlockTimerRef.current !== null)
      runtimeScheduler.cancel(compactUnlockTimerRef.current);
    compactUnlockTimerRef.current = runtimeScheduler.schedule(
      () => {
        compactUnlockTimerRef.current = null;
        wasCompactRef.current = false;
        setCompactLock("surface-opening", false);
      },
      DOCK_SURFACE_EXIT_SETTLE_MS,
      { label: "surface:compact-unlock" },
    );
  }, [runtimeScheduler, setCompactLock]);

  const handleSurfaceAnimationComplete = useCallback(
    (definition: any) => {
      if (definition !== "exit" || !wasCompactRef.current) return;
      if (compactUnlockTimerRef.current !== null) {
        runtimeScheduler.cancel(compactUnlockTimerRef.current);
        compactUnlockTimerRef.current = null;
      }
      wasCompactRef.current = false;
      compactUnlockTimerRef.current = runtimeScheduler.schedule(
        () => {
          compactUnlockTimerRef.current = null;
          setCompactLock("surface-opening", false);
        },
        DOCK_SURFACE_CLOSE_TO_COMPACT_DELAY_MS,
        { label: "surface:compact-cooldown" },
      );
    },
    [runtimeScheduler, setCompactLock],
  );

  const runSurfaceChoreography = useCallback(
    (
      event: any,
      {
        initialSurfaceIds = null,
        result = null,
      }: { initialSurfaceIds?: any[] | null; result?: any } = {},
    ) => {
      const transitionState = createSurfaceTransitionState({
        isCompact: isCompactRef.current,
        phase: surfacePhaseRef.current,
        surfaceIds:
          initialSurfaceIds || surfaceStackRef.current.map((s) => s.id),
      });

      const runner = runSurfaceTransition({
        event,
        scheduler: runtimeScheduler,
        state: transitionState,
        onTransition(nextState: any) {
          const activeSurfaceIds = new Set(nextState.surfaceIds);
          const nextStack = surfaceStackRef.current.filter((s) =>
            activeSurfaceIds.has(s.id),
          );
          surfaceStackRef.current = nextStack;
          surfacePhaseRef.current = nextState.phase;
          setSurfacePhase(nextState.phase);
          setSurfaceState(
            createSurfaceState(
              nextStack,
              surfacePayloadMapRef.current,
              nextState.phase,
            ),
          );
          setSurfaceLifecycleState({
            isCompact: isCompactRef.current,
            surfaceIds: [...nextState.surfaceIds],
            surfaceLifecycle: nextState.surfaceLifecycle,
          });
        },
        onEffect(effect: any) {
          if (effect.type !== SURFACE_TRANSITION_EFFECTS.RELEASE) return;
          const nextStack = surfaceStackRef.current;
          effect.surfaceIds.forEach((surfaceId: any) =>
            finalizeSurfaceClose(surfaceId, result, nextStack),
          );
          if (
            nextStack.length === 0 &&
            pendingSurfaceSchedulerRef.current.size === 0
          )
            unlockCompactAfterSurfaceClose();
        },
      });
      transitionRunnerRef.current = runner;
      return runner;
    },
    [finalizeSurfaceClose, runtimeScheduler, unlockCompactAfterSurfaceClose],
  );

  const pushStep = useCallback(
    (stepInput: any, targetSurfaceId: any = null) => {
      const currentStack = surfaceStackRef.current;
      const activeSurfaceId = getTargetSurfaceId(currentStack, targetSurfaceId);
      if (!activeSurfaceId) return;

      const nextStack = updateSurfaceStackEntry(
        currentStack,
        activeSurfaceId,
        (entry) => {
          const resolvedEntry = resolveSurfaceEntry(
            entry,
            surfacePayloadMapRef.current,
          );
          const initialStep = {
            component: resolvedEntry.component,
            content: resolvedEntry.content,
            props: resolvedEntry.props,
            title: resolvedEntry.title,
            description: resolvedEntry.description,
            icon: resolvedEntry.icon,
            trailing: resolvedEntry.trailing,
            headerAction: resolvedEntry.headerAction,
            action: resolvedEntry.action,
            showAction: resolvedEntry.showAction,
            closeLabel: resolvedEntry.closeLabel,
          };
          const currentSteps =
            Array.isArray(resolvedEntry.steps) && resolvedEntry.steps.length > 0
              ? [...resolvedEntry.steps]
              : [initialStep];
          const nextSteps = [...currentSteps, stepInput];
          surfacePayloadMapRef.current.set(entry.payloadId, {
            ...surfacePayloadMapRef.current.get(entry.payloadId),
            steps: nextSteps,
          });
          return { ...entry, currentStepIndex: nextSteps.length - 1 };
        },
      );
      syncSurfaceStack(nextStack, DOCK_SURFACE_PHASE.OPEN);
    },
    [syncSurfaceStack],
  );

  const popStep = useCallback(
    (targetSurfaceId: any = null) => {
      const currentStack = surfaceStackRef.current;
      const activeSurfaceId = getTargetSurfaceId(currentStack, targetSurfaceId);
      if (!activeSurfaceId) return;

      const resolvedTargetEntry = resolveSurfaceEntry(
        findSurfaceEntry(currentStack, activeSurfaceId),
        surfacePayloadMapRef.current,
      );
      if (
        !resolvedTargetEntry?.steps ||
        (resolvedTargetEntry.currentStepIndex || 0) <= 0
      )
        return;

      syncSurfaceStack(
        updateSurfaceStackEntry(currentStack, activeSurfaceId, (entry) => ({
          ...entry,
          currentStepIndex: (entry.currentStepIndex || 0) - 1,
        })),
        DOCK_SURFACE_PHASE.OPEN,
      );
    },
    [syncSurfaceStack],
  );

  const goToStep = useCallback(
    (index: number, targetSurfaceId: any = null) => {
      const currentStack = surfaceStackRef.current;
      const activeSurfaceId = getTargetSurfaceId(currentStack, targetSurfaceId);
      if (!activeSurfaceId) return;

      const resolvedTargetEntry = resolveSurfaceEntry(
        findSurfaceEntry(currentStack, activeSurfaceId),
        surfacePayloadMapRef.current,
      );
      const stepIndex = Number(index);
      if (
        !resolvedTargetEntry?.steps ||
        !Number.isInteger(stepIndex) ||
        stepIndex < 0 ||
        stepIndex >= resolvedTargetEntry.steps.length
      )
        return;

      syncSurfaceStack(
        updateSurfaceStackEntry(currentStack, activeSurfaceId, (entry) => ({
          ...entry,
          currentStepIndex: stepIndex,
        })),
        DOCK_SURFACE_PHASE.OPEN,
      );
    },
    [syncSurfaceStack],
  );

  const closeSurface = useCallback(
    (result: any = null, targetSurfaceId: any = null) => {
      finishSurfaceTransition();
      const currentStack = surfaceStackRef.current;
      const pendingScheduler = pendingSurfaceSchedulerRef.current;
      const pendingSurfaceId = pendingScheduler.getLatestId();
      const activeSurfaceId = currentStack[currentStack.length - 1]?.id || null;
      const surfaceId =
        targetSurfaceId ||
        (pendingSurfaceId &&
        (!activeSurfaceId || pendingSurfaceId > activeSurfaceId)
          ? pendingSurfaceId
          : activeSurfaceId);
      if (!surfaceId) return;

      if (pendingScheduler.cancel(surfaceId)) {
        finalizeSurfaceClose(surfaceId, result, currentStack);
        if (currentStack.length === 0 && pendingScheduler.size === 0)
          unlockCompactAfterSurfaceClose();
        return;
      }

      if (!findSurfaceEntry(currentStack, surfaceId)) return;
      runSurfaceChoreography(
        { surfaceId, type: SURFACE_TRANSITION_EVENTS.CLOSE },
        { result },
      );
    },
    [
      finalizeSurfaceClose,
      finishSurfaceTransition,
      runSurfaceChoreography,
      unlockCompactAfterSurfaceClose,
    ],
  );

  const goBackSurface = useCallback(() => {
    const currentStack = surfaceStackRef.current;
    const activeEntry = currentStack[currentStack.length - 1];
    if (!activeEntry) return;
    if ((activeEntry.currentStepIndex || 0) > 0) popStep(activeEntry.id);
    else if (currentStack.length > 1) closeSurface(null, activeEntry.id);
  }, [closeSurface, popStep]);

  const closeAllSurfaces = useCallback(
    (result: any = null) => {
      finishSurfaceTransition();
      const currentStack = [...surfaceStackRef.current];
      const pendingSurfaceIds = pendingSurfaceSchedulerRef.current.cancelAll();
      if (currentStack.length === 0 && pendingSurfaceIds.length === 0) return;

      pendingSurfaceIds.forEach((surfaceId) =>
        finalizeSurfaceClose(surfaceId, result),
      );
      if (currentStack.length === 0) {
        unlockCompactAfterSurfaceClose();
        return;
      }

      runSurfaceChoreography(
        { type: SURFACE_TRANSITION_EVENTS.CLOSE_ALL },
        { result },
      );
    },
    [
      finalizeSurfaceClose,
      finishSurfaceTransition,
      runSurfaceChoreography,
      unlockCompactAfterSurfaceClose,
    ],
  );

  const openSurface = useCallback(
    (input: any, config: Record<string, any> = {}) => {
      let effectiveInput = input;
      let effectiveConfig = config;

      if (
        typeof input === "function" &&
        (input.isSurfaceFactory || !isValidComponentType(input))
      ) {
        effectiveInput = input(config);
        effectiveConfig = {};
      }

      const {
        flowSession: providedFlowSession,
        preserveUrl = false,
        ...surfaceConfig
      } = effectiveConfig;
      const definition = createSurfaceEntryDefinition(
        effectiveInput,
        surfaceConfig,
      );
      if (!definition) {
        const error = createSurfaceError(
          "DOCK_SURFACE_INVALID_COMPONENT",
          "Dock surface input is invalid",
        );
        console.error(error);
        return Promise.resolve({ success: false, error });
      }

      const surfaceId = ++surfaceIdRef.current;
      const flowSession = providedFlowSession
        ? { ...providedFlowSession, surfaceId }
        : null;
      const { payload, surfaceEntry } = createSurfaceRuntimeEntry(
        surfaceId,
        definition,
        flowSession,
      );

      surfacePayloadMapRef.current.set(surfaceEntry.payloadId, payload);
      surfaceEntryMapRef.current.set(surfaceId, surfaceEntry);

      if (flowSession) {
        surfaceFlowSessionMapRef.current.set(surfaceId, flowSession);
        surfaceFlowToSurfaceIdMapRef.current.set(flowSession.flowId, surfaceId);
      }
      if (IS_BROWSER && document.activeElement) {
        surfaceFocusOriginMapRef.current.set(surfaceId, document.activeElement);
      }

      setExpanded(false);
      setSearchQuery("");

      const executeSurfaceOpen = () => {
        finishSurfaceTransition();
        const previousSurfaceIds = surfaceStackRef.current.map(
          (entry) => entry.id,
        );
        const urlState = {
          value: getSurfaceUrlValue(surfaceEntry),
          previousValue: null,
        };
        surfaceUrlStateMapRef.current.set(surfaceId, urlState);
        if (!preserveUrl) syncSurfaceUrl(surfaceEntry, true, urlState);

        surfaceStackRef.current = [...surfaceStackRef.current, surfaceEntry];
        runSurfaceChoreography(
          {
            skipActionDismiss: (surfaceEntry as any).skipActionDismiss,
            surfaceId,
            type: SURFACE_TRANSITION_EVENTS.OPEN,
          },
          { initialSurfaceIds: previousSurfaceIds },
        );
      };

      const resultPromise = new Promise((resolve) => {
        surfaceResolveMapRef.current.set(surfaceId, resolve);
        surfaceOnCloseMapRef.current.set(surfaceId, payload.onClose || null);
      });
      surfacePromiseMapRef.current.set(surfaceId, resultPromise);

      if (isCompactRef.current) {
        if (compactUnlockTimerRef.current !== null) {
          runtimeScheduler.cancel(compactUnlockTimerRef.current);
          compactUnlockTimerRef.current = null;
        }
        wasCompactRef.current = true;
        setCompactLock("surface-opening", true);
        pendingSurfaceSchedulerRef.current.schedule(
          surfaceId,
          executeSurfaceOpen,
          DOCK_COMPACT_TO_SURFACE_DELAY_MS,
        );
      } else {
        executeSurfaceOpen();
      }
      return resultPromise;
    },
    [
      finishSurfaceTransition,
      runSurfaceChoreography,
      runtimeScheduler,
      setCompactLock,
      setExpanded,
      setSearchQuery,
    ],
  );

  const updateSurfaceFlow = useCallback(
    (flowId: string, snapshot: any) => {
      const surfaceId = surfaceFlowToSurfaceIdMapRef.current.get(flowId);
      if (!surfaceId) return false;
      const session = surfaceFlowSessionMapRef.current.get(surfaceId);
      const surfaceEntry = surfaceEntryMapRef.current.get(surfaceId);
      if (!session || !surfaceEntry) return false;

      const nextSession = updateSurfaceFlowSession(session, snapshot);
      if (!nextSession) return false;

      const nextSurfaceEntry = {
        ...surfaceEntry,
        flow: toSurfaceFlowState(nextSession),
      };
      surfaceFlowSessionMapRef.current.set(surfaceId, nextSession);
      surfaceEntryMapRef.current.set(surfaceId, nextSurfaceEntry);
      syncSurfaceFlowUrlState(
        nextSurfaceEntry,
        surfaceUrlStateMapRef.current.get(surfaceId),
      );
      syncSurfaceStack(
        updateSurfaceStackEntry(
          surfaceStackRef.current,
          surfaceId,
          () => nextSurfaceEntry,
        ),
      );
      return true;
    },
    [syncSurfaceStack],
  );

  const completeSurfaceFlow = useCallback(
    (flowId: string, data: any = null) => {
      const surfaceId = surfaceFlowToSurfaceIdMapRef.current.get(flowId);
      if (!surfaceId) return false;
      const session = surfaceFlowSessionMapRef.current.get(surfaceId);
      if (session)
        surfaceFlowSessionMapRef.current.set(surfaceId, {
          ...session,
          status: DOCK_SURFACE_FLOW_STATUS.COMPLETED,
        });
      closeSurface({ data, success: true }, surfaceId);
      return true;
    },
    [closeSurface],
  );

  const cancelSurfaceFlow = useCallback(
    (flowId: string, data: any = null) => {
      const surfaceId = surfaceFlowToSurfaceIdMapRef.current.get(flowId);
      if (!surfaceId) return false;
      const session = surfaceFlowSessionMapRef.current.get(surfaceId);
      if (session)
        surfaceFlowSessionMapRef.current.set(surfaceId, {
          ...session,
          status: DOCK_SURFACE_FLOW_STATUS.CANCELLED,
        });
      closeSurface(
        { cancelled: true, data, reason: "flow-cancelled", success: false },
        surfaceId,
      );
      return true;
    },
    [closeSurface],
  );

  const getSurfaceFlow = useCallback(
    (flowId: string) => {
      const surfaceId = surfaceFlowToSurfaceIdMapRef.current.get(flowId);
      const session = surfaceId
        ? surfaceFlowSessionMapRef.current.get(surfaceId)
        : null;
      if (!session) return null;
      return {
        cancel: (data: any = null) => cancelSurfaceFlow(flowId, data),
        complete: (data: any = null) => completeSurfaceFlow(flowId, data),
        flowId,
        isOpen: session.status === DOCK_SURFACE_FLOW_STATUS.OPEN,
        snapshot: session.snapshot,
        status: session.status,
        update: (snapshot: any) => updateSurfaceFlow(flowId, snapshot),
      };
    },
    [cancelSurfaceFlow, completeSurfaceFlow, updateSurfaceFlow],
  );

  const openSurfaceFlow = useCallback(
    (
      input: any,
      flowInput: any = null,
      {
        preserveUrl = false,
        snapshot,
      }: { preserveUrl?: boolean; snapshot?: any } = {},
    ) => {
      const definition = createSurfaceFlowDefinition(input);
      if (!definition) {
        const error = createSurfaceError(
          "DOCK_SURFACE_FLOW_INVALID_DEFINITION",
          "Dock surface flow definition is invalid",
        );
        console.error(error);
        return Promise.resolve({ success: false, error });
      }
      const existingSurfaceId = surfaceFlowToSurfaceIdMapRef.current.get(
        definition.id,
      );
      if (definition.singleton && existingSurfaceId) {
        return (
          surfacePromiseMapRef.current.get(existingSurfaceId) ??
          Promise.resolve({
            success: false,
            error: createSurfaceError(
              "DOCK_SURFACE_FLOW_ORPHANED",
              "Dock surface flow is orphaned",
            ),
          })
        );
      }

      const flowSession = createSurfaceFlowSession(definition, {
        input: flowInput,
        snapshot,
      });
      try {
        const surfaceInput = (definition.createSurface as any)({
          flowId: definition.id,
          input: flowInput,
          snapshot: flowSession?.snapshot,
        });
        return openSurface(surfaceInput, { flowSession, preserveUrl });
      } catch (error) {
        console.error("Dock surface flow factory failed:", error);
        return Promise.resolve({ success: false, error });
      }
    },
    [openSurface],
  );

  const restoreSurfaceFlow = useCallback(
    (input: any) => {
      const definition = createSurfaceFlowDefinition(input);
      const snapshot = getRestorableSurfaceFlowSnapshot(definition);
      if (!definition || snapshot === undefined) return Promise.resolve(null);
      return openSurfaceFlow(definition, null, { preserveUrl: true, snapshot });
    },
    [openSurfaceFlow],
  );

  useEffect(() => {
    if (!IS_BROWSER) return;
    const handlePopState = () => {
      const activeEntry =
        surfaceStackRef.current[surfaceStackRef.current.length - 1];
      if (!activeEntry?.syncWithUrl && !activeEntry?.urlKey) return;
      if (
        new URL(window.location.href).searchParams.get("surface") ===
        getSurfaceUrlValue(activeEntry)
      )
        return;
      closeAllSurfaces({
        success: false,
        cancelled: true,
        reason: "browser-back",
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [closeAllSurfaces]);

  useEffect(() => {
    const pendingScheduler = pendingSurfaceSchedulerRef.current;
    return () => {
      if (compactUnlockTimerRef.current !== null) {
        runtimeScheduler.cancel(compactUnlockTimerRef.current);
        compactUnlockTimerRef.current = null;
      }
      clearChoreographyTimers();
      if (focusRestoreFrameRef.current !== null) {
        runtimeScheduler.cancel(focusRestoreFrameRef.current);
        focusRestoreFrameRef.current = null;
      }

      const surfaceIds = [
        ...surfaceStackRef.current.map((e) => e.id),
        ...pendingScheduler.cancelAll(),
      ];
      const result = { cancelled: true, reason: "unmount", success: false };

      surfaceIds.forEach((surfaceId) => {
        releaseSurfaceResources({
          result,
          surfaceEntryMap: surfaceEntryMapRef.current,
          surfaceId,
          surfaceOnCloseMap: surfaceOnCloseMapRef.current,
          surfacePayloadMap: surfacePayloadMapRef.current,
          surfaceFlowSessionMap: surfaceFlowSessionMapRef.current,
          surfaceFlowToSurfaceIdMap: surfaceFlowToSurfaceIdMapRef.current,
          surfacePromiseMap: surfacePromiseMapRef.current,
          surfaceResolveMap: surfaceResolveMapRef.current,
          surfaceUrlStateMap: surfaceUrlStateMapRef.current,
        });
      });

      surfaceStackRef.current = [];
      surfaceFocusOriginMapRef.current.clear();
      surfacePayloadMapRef.current.clear();
      surfaceEntryMapRef.current.clear();
      surfaceFlowSessionMapRef.current.clear();
      surfaceFlowToSurfaceIdMapRef.current.clear();
      surfacePromiseMapRef.current.clear();
    };
  }, [clearChoreographyTimers, runtimeScheduler]);

  return {
    closeAllSurfaces,
    closeSurface,
    goBackSurface,
    goToStep,
    handleSurfaceAnimationComplete,
    isCompact: surfaceLifecycleState.isCompact,
    cancelSurfaceFlow,
    completeSurfaceFlow,
    getSurfaceFlow,
    openSurface,
    openSurfaceFlow,
    popStep,
    pushStep,
    setIsCompact,
    restoreSurfaceFlow,
    surfacePhase,
    surfaceState: {
      ...surfaceState,
      surfacePhase,
      surfaceLifecycle: surfaceLifecycleState.surfaceLifecycle,
    },
    updateSurfaceFlow,
  };
}
