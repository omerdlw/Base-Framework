"use client";

import {
  cloneElement,
  createContext,
  isValidElement,
  memo,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";

import {
  NAVIGATION_EVENTS,
  NAVIGATION_LIFECYCLE,
  NAV_CARD_LAYOUT,
  NAV_SURFACE_FLOW_STATUS,
  NAV_SURFACE_PHASE,
  NAV_SURFACE_RENDER_MODE,
} from "./constants";
import {
  focusNavigationElement,
  shouldRestoreNavigationFocus,
  useNavigationFocusTrap,
} from "./behavior";
import {
  createSurfaceReturnHandshake,
  isPlainObject,
  isSurfaceDescriptor,
  isValidComponentType,
  normalizeSurfaceExtension,
  normalizeSurfaceFlowSnapshot,
  resolveComponentType,
  resolveRenderableContent,
  resolveSurfaceFlowReturnHandshake,
} from "./utils";
import {
  NAV_COMPACT_TO_SURFACE_DELAY_MS,
  NAV_COMPOSITOR_STYLE,
  NAV_SURFACE_BODY_ENTER_TRANSITION,
  NAV_SURFACE_BODY_EXIT_TRANSITION,
  NAV_SURFACE_BODY_STEP_TRANSITION,
  NAV_SURFACE_CHOREOGRAPHY_TIMINGS,
  NAV_SURFACE_DRAG_CONSTRAINTS,
  NAV_SURFACE_DRAG_ELASTIC,
  NAV_SURFACE_DRAG_INTERPOLATION,
  NAV_SURFACE_DRAG_THRESHOLDS,
  NAV_SURFACE_CLOSE_TO_COMPACT_DELAY_MS,
  NAV_SURFACE_EXIT_SETTLE_MS,
  navSurfaceBodyVariants,
  navSurfaceControlsActionVariants,
  navSurfaceControlsBackVariants,
  navSurfaceControlsCloseVariants,
  navSurfaceControlsContainerVariants,
  navSurfaceDragTransformTemplate,
} from "./motion";
import { createNavigationScheduler } from "./scheduler";
import { cn } from "@/core/utils";
import { Button } from "@/core/primitives";
import Iconify from "@/core/primitives/icon";
import type {
  SurfaceFlowDefinition,
  SurfaceFlowSession,
  SurfaceTransitionResult,
  SurfaceTransitionState,
} from "./types";

const ButtonComponent = Button as any;
const IconifyComponent = Iconify as any;

export {
  createSurfaceReturnHandshake,
  isSurfaceDescriptor,
  normalizeSurfaceExtension,
};

const IS_BROWSER = typeof window !== "undefined";
const ROUNDED_CLASS_PATTERN = /\brounded(?:-[a-zA-Z0-9_-]+)?\b/g;

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

export function createSurfaceFlowDefinition(
  input: any,
): SurfaceFlowDefinition | null {
  const id = typeof input?.id === "string" ? input.id.trim() : "";
  if (!id || typeof input?.createSurface !== "function") return null;
  return {
    createSurface: input.createSurface,
    id,
    initialSnapshot: normalizeSurfaceFlowSnapshot(input.initialSnapshot),
    returnHandshake: createSurfaceReturnHandshake(
      input.returnHandshake ?? input.returnTo,
    ),
    restoreFromUrl: input.restoreFromUrl !== false,
    singleton: input.singleton !== false,
  };
}

export function createSurfaceFlowSession(
  definition: any,
  { input = null, snapshot }: { input?: any; snapshot?: any } = {},
): SurfaceFlowSession | null {
  if (!definition?.id) return null;
  return {
    flowId: definition.id,
    input,
    returnHandshake: resolveSurfaceFlowReturnHandshake(definition, input),
    snapshot:
      snapshot === undefined
        ? definition.initialSnapshot
        : normalizeSurfaceFlowSnapshot(snapshot),
    status: NAV_SURFACE_FLOW_STATUS.OPEN as string,
  };
}

export function updateSurfaceFlowSession(
  session: any,
  snapshot: any,
): SurfaceFlowSession | null {
  if (!session?.flowId) return null;
  return { ...session, snapshot: normalizeSurfaceFlowSnapshot(snapshot) };
}

const SurfaceFlowContext = createContext<any>(null);

export function SurfaceFlowProvider({
  children,
  value,
}: {
  children?: ReactNode;
  value: any;
}) {
  return <SurfaceFlowContext value={value}>{children}</SurfaceFlowContext>;
}

export function useSurfaceFlow(input: any) {
  const context = use(SurfaceFlowContext);
  const definition = useMemo(() => createSurfaceFlowDefinition(input), [input]);
  const restoredFlowIdsRef = useRef(new Set());
  const flowId = definition?.id ?? null;

  const activeFlow = useMemo(() => {
    if (!flowId) return null;
    return (
      context?.surfaceState?.surfaceStack
        ?.map((s: any) => s.flow)
        .find((f: any) => f?.flowId === flowId) ?? null
    );
  }, [context?.surfaceState?.surfaceStack, flowId]);

  useEffect(() => {
    if (
      !definition ||
      !context?.restoreSurfaceFlow ||
      restoredFlowIdsRef.current.has(definition.id)
    )
      return;
    restoredFlowIdsRef.current.add(definition.id);
    void context.restoreSurfaceFlow(definition);
  }, [context, definition]);

  const open = useCallback(
    (flowInput: any = null) => {
      if (!definition || !context?.openSurfaceFlow) {
        return Promise.resolve({
          success: false,
          error: createSurfaceError(
            "NAV_SURFACE_FLOW_UNAVAILABLE",
            "Nav surface flow is unavailable",
          ),
        });
      }
      return context.openSurfaceFlow(definition, flowInput);
    },
    [context, definition],
  );

  return useMemo(
    () => ({
      activeFlow,
      cancel: (result: any = null) =>
        context?.cancelSurfaceFlow?.(flowId, result),
      complete: (result: any = null) =>
        context?.completeSurfaceFlow?.(flowId, result),
      flowId,
      isOpen: activeFlow?.status === NAV_SURFACE_FLOW_STATUS.OPEN,
      open,
      snapshot: activeFlow?.snapshot ?? definition?.initialSnapshot ?? null,
      update: (snapshot: any) => context?.updateSurfaceFlow?.(flowId, snapshot),
    }),
    [activeFlow, context, definition?.initialSnapshot, flowId, open],
  );
}

function normalizeSurfaceDefinition(
  input: any,
  config: Record<string, any> = {},
  {
    allowPrimitiveContent = false,
    defaultShowAction = false,
  }: {
    allowPrimitiveContent?: boolean;
    defaultShowAction?: boolean | null;
  } = {},
) {
  const descriptor =
    isSurfaceDescriptor(input) &&
    (isValidComponentType(input.component) ||
      "content" in input ||
      "node" in input ||
      "element" in input ||
      (Array.isArray(input.steps) && input.steps.length > 0))
      ? input
      : null;
  const configuredSteps = descriptor?.steps ?? config?.steps;
  const steps =
    Array.isArray(configuredSteps) && configuredSteps.length > 0
      ? configuredSteps
      : null;
  const firstStep = steps?.[0] ?? null;

  const component = resolveComponentType(
    descriptor?.component,
    descriptor ? null : input,
    firstStep?.component,
    firstStep,
  );
  const explicitContent = resolveRenderableContent(
    descriptor?.content,
    descriptor?.node,
    descriptor?.element,
    firstStep?.content,
    firstStep?.node,
    firstStep?.element,
  );
  const fallbackContent =
    !descriptor &&
    !component &&
    (isValidElement(input) || (allowPrimitiveContent && input != null))
      ? input
      : null;
  const content = explicitContent ?? fallbackContent;

  if (!component && content == null && !steps) return null;

  const directComponentInput = !descriptor && isValidComponentType(input);
  const extRaw = descriptor?.extensions ?? config?.extensions;
  const extensions = Array.isArray(extRaw)
    ? extRaw.map(normalizeSurfaceExtension).filter(Boolean)
    : extRaw
      ? [normalizeSurfaceExtension(extRaw)].filter(Boolean)
      : [];

  return {
    renderMode: component
      ? NAV_SURFACE_RENDER_MODE.COMPONENT
      : NAV_SURFACE_RENDER_MODE.NODE,
    component,
    content: component ? null : (content ?? input),
    props: component
      ? isPlainObject(descriptor?.props)
        ? descriptor.props
        : directComponentInput
          ? config
          : {}
      : {},
    action: descriptor?.action ?? config?.action ?? null,
    showAction:
      descriptor?.showAction ?? config?.showAction ?? defaultShowAction,
    dismissible: descriptor?.dismissible ?? config?.dismissible ?? true,
    onClose: descriptor?.onClose ?? config?.onClose ?? null,
    icon:
      descriptor?.icon ??
      descriptor?.header?.icon ??
      config?.icon ??
      config?.header?.icon ??
      null,
    title:
      descriptor?.title ??
      descriptor?.header?.title ??
      config?.title ??
      config?.header?.title ??
      null,
    description:
      descriptor?.description ??
      descriptor?.header?.description ??
      config?.description ??
      config?.header?.description ??
      null,
    descriptionMaxLines:
      descriptor?.descriptionMaxLines ?? config?.descriptionMaxLines ?? 2,
    trailing: descriptor?.trailing ?? config?.trailing ?? null,
    headerAction: descriptor?.headerAction ?? config?.headerAction ?? null,
    closeLabel: descriptor?.closeLabel ?? config?.closeLabel ?? null,
    expandHorizontal:
      descriptor?.expandHorizontal ?? config?.expandHorizontal ?? false,
    width: descriptor?.width ?? config?.width ?? null,
    allowSwipeDismiss:
      descriptor?.allowSwipeDismiss ?? config?.allowSwipeDismiss ?? true,
    steps,
    currentStepIndex:
      descriptor?.currentStepIndex ?? config?.currentStepIndex ?? 0,
    syncWithUrl: descriptor?.syncWithUrl ?? config?.syncWithUrl ?? false,
    urlKey: descriptor?.urlKey ?? config?.urlKey ?? null,
    badge: descriptor?.badge ?? config?.badge ?? null,
    extensions,
  };
}

export function createSurfaceEntryDefinition(
  input: any,
  config: Record<string, any> = {},
) {
  return normalizeSurfaceDefinition(input, config);
}

export function defineSurface(definition: Record<string, any> = {}) {
  const {
    action = null,
    allowSwipeDismiss = true,
    badge = null,
    closeLabel = null,
    component = null,
    defaultProps = {},
    description = null,
    descriptionMaxLines = 2,
    dismissible = true,
    expandHorizontal = false,
    extensions = [],
    headerAction = null,
    icon = null,
    id = null,
    onClose = null,
    showAction = null,
    syncWithUrl = false,
    title = null,
    trailing = null,
    urlKey = null,
    width = null,
    ...extraConfig
  } = definition;

  const surfaceEntryFactory: any = function surfaceEntryFactory(
    props: Record<string, any> = {},
    overrides: Record<string, any> = {},
  ) {
    const mergedProps = { ...defaultProps, ...props };
    const resolvedTitle =
      typeof title === "function" ? title(mergedProps) : title;
    const resolvedDescription =
      typeof description === "function"
        ? description(mergedProps)
        : description;
    const resolvedIcon = typeof icon === "function" ? icon(mergedProps) : icon;

    return {
      id: overrides.id ?? id,
      component,
      props: mergedProps,
      title: resolvedTitle,
      description: resolvedDescription,
      icon: resolvedIcon,
      action,
      allowSwipeDismiss,
      badge,
      closeLabel,
      descriptionMaxLines,
      dismissible,
      expandHorizontal,
      extensions,
      headerAction,
      onClose,
      showAction,
      syncWithUrl,
      trailing,
      urlKey,
      width,
      ...extraConfig,
      ...overrides,
    };
  };

  surfaceEntryFactory.isSurfaceFactory = true;
  surfaceEntryFactory.id = id;
  surfaceEntryFactory.component = component;
  surfaceEntryFactory.open = (
    openSurfaceFn: any,
    props: Record<string, any> = {},
    overrides: Record<string, any> = {},
  ) => {
    if (typeof openSurfaceFn === "function") {
      return openSurfaceFn(surfaceEntryFactory(props, overrides));
    }
  };

  return surfaceEntryFactory;
}

export function createInlineSurfaceEntry(surface: any) {
  return normalizeSurfaceDefinition(
    surface,
    {},
    { allowPrimitiveContent: true, defaultShowAction: null },
  );
}

export function resolveSurfaceAction(item: any, surfaceEntry: any) {
  if (surfaceEntry?.action != null) return surfaceEntry.action;
  if (surfaceEntry?.showAction === true) return item?.action ?? null;
  if (surfaceEntry?.showAction === false) return null;
  return item?.action ?? null;
}

export function resolveActiveStepDefinition(surfaceEntry: any) {
  if (!surfaceEntry) return null;
  const steps = surfaceEntry.steps;
  if (!Array.isArray(steps) || steps.length === 0) return surfaceEntry;

  const requestedIndex = Number(surfaceEntry.currentStepIndex);
  const currentIndex = Math.max(
    0,
    Math.min(
      Number.isInteger(requestedIndex) ? requestedIndex : 0,
      steps.length - 1,
    ),
  );
  const step = steps[currentIndex];
  if (!step) return surfaceEntry;

  const stepComponent = resolveComponentType(
    step?.component,
    step,
    surfaceEntry.component,
  );
  const stepContent = resolveRenderableContent(
    step?.content,
    step?.node,
    step?.element,
    surfaceEntry.content,
  );

  const extensions = step.extensions
    ? Array.isArray(step.extensions)
      ? step.extensions.map(normalizeSurfaceExtension).filter(Boolean)
      : [normalizeSurfaceExtension(step.extensions)].filter(Boolean)
    : surfaceEntry.extensions || [];

  return {
    ...surfaceEntry,
    component: stepComponent,
    content: stepContent,
    props: {
      ...(surfaceEntry.props || {}),
      ...(isPlainObject(step.props) ? step.props : {}),
    },
    icon: step.icon ?? step.header?.icon ?? surfaceEntry.icon,
    title: step.title ?? step.header?.title ?? surfaceEntry.title,
    description:
      step.description ?? step.header?.description ?? surfaceEntry.description,
    descriptionMaxLines:
      step.descriptionMaxLines ?? surfaceEntry.descriptionMaxLines ?? 2,
    trailing: step.trailing ?? surfaceEntry.trailing,
    headerAction: step.headerAction ?? surfaceEntry.headerAction,
    action: step.action ?? surfaceEntry.action,
    showAction: step.showAction ?? surfaceEntry.showAction,
    closeLabel: step.closeLabel ?? surfaceEntry.closeLabel,
    stepIndex: currentIndex,
    totalSteps: steps.length,
    canGoBack: currentIndex > 0,
    isFirstStep: currentIndex === 0,
    isLastStep: currentIndex === steps.length - 1,
    extensions,
  };
}

export function applySurfaceToNavItem(
  item: any,
  rawSurfaceEntry: any,
  {
    closeSurface,
    closeAllSurfaces,
    goBackSurface,
    pushStep,
    popStep,
    goToStep,
    handleSurfaceAnimationComplete,
    getSurfaceFlow,
    surfaceStack = [],
    surfacePhase = NAV_SURFACE_PHASE.OPEN,
  }: {
    closeSurface?: any;
    closeAllSurfaces?: any;
    goBackSurface?: any;
    pushStep?: any;
    popStep?: any;
    goToStep?: any;
    handleSurfaceAnimationComplete?: any;
    getSurfaceFlow?: any;
    surfaceStack?: any[];
    surfacePhase?: string;
  } = {},
) {
  const createSurfacePresentation = (entry: any, stack: any[]) => {
    const surfaceEntry = resolveActiveStepDefinition(entry);
    const surfaceComponent = surfaceEntry?.component ?? null;
    const surfaceContent = surfaceEntry?.content ?? null;
    if (!surfaceComponent && surfaceContent == null) return null;

    const surfaceId = surfaceEntry.id ?? null;
    const canGoBack = Boolean(surfaceEntry.canGoBack) || stack.length > 1;
    const surfaceFlow =
      typeof getSurfaceFlow === "function"
        ? getSurfaceFlow(surfaceEntry.flow?.flowId)
        : null;

    return {
      allowSwipeDismiss: surfaceEntry.allowSwipeDismiss !== false,
      badge: surfaceEntry.badge ?? null,
      canGoBack,
      closeAllSurfaces:
        typeof closeAllSurfaces === "function" ? closeAllSurfaces : null,
      closeSurface:
        typeof closeSurface === "function"
          ? (res: any = null) => closeSurface(res, surfaceId)
          : (res: any = null) => surfaceEntry?.onClose?.(res),
      dismissible: surfaceEntry.dismissible !== false,
      expandHorizontal: surfaceEntry.expandHorizontal ?? false,
      goToStep:
        typeof goToStep === "function"
          ? (index: number) => goToStep(index, surfaceId)
          : null,
      isFirstStep: surfaceEntry.isFirstStep ?? true,
      isLastStep: surfaceEntry.isLastStep ?? true,
      onAnimationComplete: handleSurfaceAnimationComplete,
      onBack: canGoBack
        ? () => {
            if (typeof goBackSurface === "function") goBackSurface();
            else if (typeof popStep === "function") popStep(surfaceId);
            else if (typeof closeSurface === "function")
              closeSurface(null, surfaceId);
          }
        : null,
      popStep: typeof popStep === "function" ? () => popStep(surfaceId) : null,
      pushStep:
        typeof pushStep === "function"
          ? (step: any) => pushStep(step, surfaceId)
          : null,
      stepIndex: surfaceEntry.stepIndex ?? 0,
      surfaceCloseLabel: surfaceEntry.closeLabel ?? null,
      surfaceComponent,
      surfaceContent,
      surfaceDescription: surfaceEntry.description ?? null,
      surfaceDescriptionMaxLines: surfaceEntry.descriptionMaxLines ?? 2,
      surfaceHeaderAction: surfaceEntry.headerAction ?? null,
      surfaceIcon: surfaceEntry.icon ?? null,
      surfaceId,
      surfaceProps: surfaceFlow
        ? { ...(surfaceEntry.props || {}), surfaceFlow }
        : surfaceEntry.props || {},
      surfacePhase,
      surfaceTitle: surfaceEntry.title ?? null,
      surfaceTrailing: surfaceEntry.trailing ?? null,
      surfaceExtensions: surfaceEntry.extensions || [],
      extensions: surfaceEntry.extensions || [],
      totalSteps: surfaceEntry.totalSteps ?? 1,
      width: surfaceEntry.width ?? null,
    };
  };

  const stackEntries = surfaceStack.length ? surfaceStack : [rawSurfaceEntry];
  const surfaceStackEntries = stackEntries
    .map((entry, idx) =>
      createSurfacePresentation(entry, stackEntries.slice(0, idx + 1)),
    )
    .filter(Boolean);
  const surfaceEntry =
    surfaceStackEntries[surfaceStackEntries.length - 1] || null;

  if (!item || !surfaceEntry) return item;

  return {
    ...item,
    isSurface: true,
    isOverlay: true,
    ...surfaceEntry,
    surfacePhase,
    actions: null,
    action: resolveSurfaceAction(
      item,
      resolveActiveStepDefinition(rawSurfaceEntry),
    ),
    surfaceStackEntries,
    surfaceExtensions:
      surfaceEntry.surfaceExtensions || surfaceEntry.extensions || [],
    extensions: surfaceEntry.extensions || [],
  };
}

export function createPendingSurfaceScheduler({
  clearTimer = clearTimeout,
  scheduler = null,
  scheduleTimer = setTimeout,
}: {
  clearTimer?: any;
  scheduler?: any;
  scheduleTimer?: any;
} = {}) {
  const timers = new Map();
  const cancelTimer = scheduler?.cancel || clearTimer;
  const schedule = scheduler?.schedule
    ? (cb: () => void, ms: number) =>
        scheduler.schedule(cb, ms, { label: "surface:compact-open" })
    : scheduleTimer;

  const cancel = (surfaceId: any) => {
    if (!timers.has(surfaceId)) return false;
    cancelTimer(timers.get(surfaceId));
    timers.delete(surfaceId);
    return true;
  };

  return {
    cancel,
    cancelAll() {
      const surfaceIds = [...timers.keys()];
      surfaceIds.forEach(cancel);
      return surfaceIds;
    },
    getLatestId() {
      const surfaceIds = [...timers.keys()];
      return surfaceIds[surfaceIds.length - 1] || null;
    },
    schedule(surfaceId: any, callback: () => void, delayMs: number) {
      cancel(surfaceId);
      const timerId = schedule(() => {
        timers.delete(surfaceId);
        callback();
      }, delayMs);
      timers.set(surfaceId, timerId);
    },
    get size() {
      return timers.size;
    },
  };
}

function freezeSurfaceTransitionState(state: any): SurfaceTransitionState {
  return Object.freeze({
    closingSurfaceIds: Object.freeze([...state.closingSurfaceIds]),
    isCompact: Boolean(state.isCompact),
    phase: state.phase,
    surfaceIds: Object.freeze([...state.surfaceIds]),
    surfaceLifecycle: state.surfaceLifecycle,
  });
}

function createTransitionResult(
  state: SurfaceTransitionState,
  effects: readonly any[] = EMPTY_SURFACE_TRANSITION_EFFECTS,
): SurfaceTransitionResult {
  return Object.freeze({ state, effects: Object.freeze([...effects]) });
}

function createScheduledTransition(delayMs: number, label: string) {
  return Object.freeze({
    delayMs: Math.max(0, Number(delayMs) || 0),
    event: Object.freeze({ type: SURFACE_TRANSITION_EVENTS.ADVANCE }),
    label,
    type: SURFACE_TRANSITION_EFFECTS.SCHEDULE,
  });
}

function createReleaseEffect(surfaceIds: readonly string[]) {
  return Object.freeze({
    surfaceIds: Object.freeze([...surfaceIds]),
    type: SURFACE_TRANSITION_EFFECTS.RELEASE,
  });
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
  const phase = Object.values(NAV_SURFACE_PHASE).includes(input.phase)
    ? input.phase
    : surfaceIds.length > 0
      ? NAV_SURFACE_PHASE.OPEN
      : NAV_SURFACE_PHASE.IDLE;

  const surfaceLifecycle = Object.values(NAVIGATION_LIFECYCLE).includes(
    input.surfaceLifecycle,
  )
    ? input.surfaceLifecycle
    : phase === NAV_SURFACE_PHASE.IDLE
      ? NAVIGATION_LIFECYCLE.IDLE
      : phase === NAV_SURFACE_PHASE.OPEN
        ? NAVIGATION_LIFECYCLE.OPEN
        : closingSurfaceIds.length > 0
          ? NAVIGATION_LIFECYCLE.CLOSING
          : NAVIGATION_LIFECYCLE.OPENING;

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
        ? NAV_SURFACE_PHASE.OPEN
        : event.skipActionDismiss
          ? NAV_SURFACE_PHASE.EXPANDING_BODY
          : NAV_SURFACE_PHASE.DISMISSING_ACTION;

      const nextState = freezeSurfaceTransitionState({
        ...state,
        closingSurfaceIds: [],
        phase,
        surfaceIds: [...state.surfaceIds, surfaceId],
        surfaceLifecycle: isStacked
          ? NAVIGATION_LIFECYCLE.OPEN
          : NAVIGATION_LIFECYCLE.OPENING,
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
                NAV_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_ENTER_MS,
                "surface:open-body",
              ),
            ]
          : [
              createScheduledTransition(
                NAV_SURFACE_CHOREOGRAPHY_TIMINGS.ACTION_DISMISS_MS +
                  NAV_SURFACE_CHOREOGRAPHY_TIMINGS.ACTION_DISMISS_SETTLE_MS,
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
            phase: NAV_SURFACE_PHASE.OPEN,
            surfaceIds: remainingSurfaceIds,
            surfaceLifecycle: NAVIGATION_LIFECYCLE.OPEN,
          }),
          [createReleaseEffect([event.surfaceId])],
        );
      }
      return createTransitionResult(
        freezeSurfaceTransitionState({
          ...state,
          closingSurfaceIds: [event.surfaceId],
          phase: NAV_SURFACE_PHASE.COLLAPSING_BODY,
          surfaceLifecycle: NAVIGATION_LIFECYCLE.CLOSING,
        }),
        [
          createScheduledTransition(
            NAV_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_EXIT_MS +
              NAV_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_COLLAPSE_SETTLE_MS,
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
              phase: NAV_SURFACE_PHASE.COLLAPSING_BODY,
              surfaceLifecycle: NAVIGATION_LIFECYCLE.CLOSING,
            }),
            [
              createScheduledTransition(
                NAV_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_EXIT_MS +
                  NAV_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_COLLAPSE_SETTLE_MS,
                "surface:collapse-all",
              ),
            ],
          );

    case SURFACE_TRANSITION_EVENTS.ADVANCE:
      if (
        state.phase === NAV_SURFACE_PHASE.DISMISSING_ACTION ||
        state.phase === NAV_SURFACE_PHASE.SWAPPING_HEADER
      ) {
        const activeSurfaceId = state.surfaceIds.at(-1);
        return createTransitionResult(
          freezeSurfaceTransitionState({
            ...state,
            phase: NAV_SURFACE_PHASE.EXPANDING_BODY,
          }),
          [
            Object.freeze({
              surfaceId: activeSurfaceId,
              type: SURFACE_TRANSITION_EFFECTS.MOUNT,
            }),
            createScheduledTransition(
              NAV_SURFACE_CHOREOGRAPHY_TIMINGS.BODY_ENTER_MS,
              "surface:expand-body",
            ),
          ],
        );
      }
      if (state.phase === NAV_SURFACE_PHASE.EXPANDING_BODY) {
        return createTransitionResult(
          freezeSurfaceTransitionState({
            ...state,
            phase: NAV_SURFACE_PHASE.OPEN,
            surfaceLifecycle: NAVIGATION_LIFECYCLE.OPEN,
          }),
        );
      }
      if (
        state.phase === NAV_SURFACE_PHASE.COLLAPSING_BODY &&
        NAV_SURFACE_CHOREOGRAPHY_TIMINGS.HEADER_RESTORE_MS > 0
      ) {
        return createTransitionResult(
          freezeSurfaceTransitionState({
            ...state,
            phase: NAV_SURFACE_PHASE.RESTORING_HEADER,
          }),
          [
            createScheduledTransition(
              NAV_SURFACE_CHOREOGRAPHY_TIMINGS.HEADER_RESTORE_MS,
              "surface:restore-header",
            ),
          ],
        );
      }
      if (
        state.phase === NAV_SURFACE_PHASE.COLLAPSING_BODY ||
        state.phase === NAV_SURFACE_PHASE.RESTORING_HEADER
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
                ? NAV_SURFACE_PHASE.OPEN
                : NAV_SURFACE_PHASE.IDLE,
            surfaceIds,
            surfaceLifecycle:
              surfaceIds.length > 0
                ? NAVIGATION_LIFECYCLE.OPEN
                : NAVIGATION_LIFECYCLE.IDLE,
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
  scheduler = createNavigationScheduler(),
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
    surfaceLifecycle: NAVIGATION_LIFECYCLE.IDLE as string,
  };
}

export function surfaceLifecycleReducer(state: any, action: any) {
  switch (action?.type) {
    case NAVIGATION_EVENTS.SET_COMPACT:
      return state.isCompact === Boolean(action.value)
        ? state
        : { ...state, isCompact: Boolean(action.value) };
    case NAVIGATION_EVENTS.OPEN_SURFACE:
      if (
        action.surfaceId == null ||
        state.surfaceIds.includes(action.surfaceId)
      )
        return state;
      return {
        ...state,
        surfaceIds: [...state.surfaceIds, action.surfaceId],
        surfaceLifecycle: NAVIGATION_LIFECYCLE.OPENING,
      };
    case NAVIGATION_EVENTS.SURFACE_MOUNTED:
      return state.surfaceLifecycle === NAVIGATION_LIFECYCLE.OPENING
        ? { ...state, surfaceLifecycle: NAVIGATION_LIFECYCLE.OPEN }
        : state;
    case NAVIGATION_EVENTS.CLOSE_SURFACE: {
      const surfaceIds = state.surfaceIds.filter(
        (id: any) => id !== action.surfaceId,
      );
      if (surfaceIds.length === state.surfaceIds.length) return state;
      return {
        ...state,
        surfaceIds,
        surfaceLifecycle: surfaceIds.length
          ? NAVIGATION_LIFECYCLE.OPEN
          : NAVIGATION_LIFECYCLE.CLOSING,
      };
    }
    case NAVIGATION_EVENTS.CLOSE_ALL_SURFACES:
      return state.surfaceIds.length
        ? {
            ...state,
            surfaceIds: [],
            surfaceLifecycle: NAVIGATION_LIFECYCLE.CLOSING,
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

function createSurfaceState(
  surfaceStack: any[] = [],
  payloadMap: any = null,
  surfacePhase: string = NAV_SURFACE_PHASE.IDLE,
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

function createSurfaceError(
  code: string,
  message: string,
): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
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

  const navSurface = window.history.state?.navSurface;
  const flow = navSurface?.flow;
  const currentSurfaceValue = new URL(window.location.href).searchParams.get(
    "surface",
  );

  if (
    !flow ||
    flow.id !== definition.id ||
    !navSurface.value ||
    currentSurfaceValue !== navSurface.value
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
          navSurface: createSurfaceHistoryState(surfaceEntry),
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
    if (state.navSurface?.value === urlState?.value) delete state.navSurface;
    window.history.replaceState(state, "", url.toString());
  } catch (error) {
    if (process.env.NODE_ENV !== "production")
      console.warn("[Navigation] Surface URL synchronization failed:", error);
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
        navSurface: createSurfaceHistoryState(surfaceEntry),
      },
      "",
      url.toString(),
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production")
      console.warn(
        "[Navigation] Surface flow URL synchronization failed:",
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
      console.error("Nav surface onClose handler failed:", error);
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
  NAV_SURFACE_PHASE.IDLE,
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
    NAV_SURFACE_PHASE.IDLE,
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
  const runtimeSchedulerRef = useRef(scheduler || createNavigationScheduler());
  const compactUnlockTimerRef = useRef<any>(null);
  const pendingSurfaceSchedulerRef = useRef(
    createPendingSurfaceScheduler({ scheduler: runtimeSchedulerRef.current }),
  );
  const focusRestoreFrameRef = useRef<any>(null);
  const surfacePhaseRef = useRef<string>(NAV_SURFACE_PHASE.IDLE);
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
        type: NAVIGATION_EVENTS.SET_COMPACT,
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
          ? NAV_SURFACE_PHASE.OPEN
          : NAV_SURFACE_PHASE.IDLE);
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
        !shouldRestoreNavigationFocus(result)
      )
        return;

      if (focusRestoreFrameRef.current !== null)
        runtimeScheduler.cancel(focusRestoreFrameRef.current);
      focusRestoreFrameRef.current = runtimeScheduler.scheduleFrame(
        () => {
          focusRestoreFrameRef.current = null;
          if (surfaceStackRef.current.length > 0) return;
          focusNavigationElement(focusOrigin);
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
      NAV_SURFACE_EXIT_SETTLE_MS,
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
        NAV_SURFACE_CLOSE_TO_COMPACT_DELAY_MS,
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
      syncSurfaceStack(nextStack, NAV_SURFACE_PHASE.OPEN);
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
        NAV_SURFACE_PHASE.OPEN,
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
        NAV_SURFACE_PHASE.OPEN,
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
          "NAV_SURFACE_INVALID_COMPONENT",
          "Nav surface input is invalid",
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
          NAV_COMPACT_TO_SURFACE_DELAY_MS,
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
          status: NAV_SURFACE_FLOW_STATUS.COMPLETED,
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
          status: NAV_SURFACE_FLOW_STATUS.CANCELLED,
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
        isOpen: session.status === NAV_SURFACE_FLOW_STATUS.OPEN,
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
          "NAV_SURFACE_FLOW_INVALID_DEFINITION",
          "Nav surface flow definition is invalid",
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
              "NAV_SURFACE_FLOW_ORPHANED",
              "Nav surface flow is orphaned",
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
        console.error("Nav surface flow factory failed:", error);
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

const SurfaceHeaderContext = createContext<any>(null);
export const SurfaceHeaderActionContext = createContext<any>(null);
export const SurfaceExtensionsContext = createContext<any>(null);
export const SurfaceIdContext = createContext<any>(null);
export const SurfaceDimensionsContext = createContext<{ width: any }>({
  width: null,
});

export function useSurfaceDimensions() {
  return use(SurfaceDimensionsContext);
}
export function useSurfaceId() {
  return use(SurfaceIdContext);
}

export function useSurfaceHeader() {
  const store = use(SurfaceHeaderActionContext);
  const surfaceId = useSurfaceId();
  return useCallback(
    (patch: any) => {
      if (!store) return;
      const data = typeof patch === "function" ? patch({}) : patch;
      if (data?.headerAction !== undefined)
        store.setAction(surfaceId, data.headerAction);
    },
    [store, surfaceId],
  );
}

export function useSurfaceAction(action: any) {
  const store = use(SurfaceHeaderActionContext);
  const surfaceId = useSurfaceId();
  useEffect(() => {
    if (!store || action === undefined) return;
    store.setAction(surfaceId, action);
    return () => store.removeAction(surfaceId);
  }, [store, surfaceId, action]);
}

export function NavSurfaceAction({ children }: { children: ReactNode }) {
  useSurfaceAction(children);
  return null;
}

class SurfaceHeaderActionStore {
  actionsBySurface: Map<string, any>;
  listeners: Set<() => void>;
  version: number;

  constructor() {
    this.actionsBySurface = new Map();
    this.listeners = new Set();
    this.version = 0;
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  notify = () => {
    this.version++;
    for (const listener of this.listeners) listener();
  };
  getAction = (surfaceId: any) => {
    const sId = surfaceId != null ? String(surfaceId) : "global";
    return (
      this.actionsBySurface.get(sId) ??
      this.actionsBySurface.get("global") ??
      null
    );
  };
  setAction = (surfaceId: any, action: any) => {
    const sId = surfaceId != null ? String(surfaceId) : "global";
    if (this.actionsBySurface.get(sId) === action) return;
    this.actionsBySurface.set(sId, action);
    this.notify();
  };
  removeAction = (surfaceId: any) => {
    const sId = surfaceId != null ? String(surfaceId) : "global";
    if (!this.actionsBySurface.has(sId)) return;
    this.actionsBySurface.delete(sId);
    this.notify();
  };
  clearSurface = (surfaceId: any) => this.removeAction(surfaceId);
}

class SurfaceExtensionsStore {
  extensionsBySurface: Map<string, Map<string, any>>;
  cachedListBySurface: Map<string, any[]>;
  listeners: Set<() => void>;
  version: number;

  constructor() {
    this.extensionsBySurface = new Map();
    this.cachedListBySurface = new Map();
    this.listeners = new Set();
    this.version = 0;
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  notify = () => {
    this.version++;
    this.cachedListBySurface.clear();
    for (const listener of this.listeners) listener();
  };

  getExtensionsForSurface = (surfaceId: any): any[] => {
    const sId = surfaceId != null ? String(surfaceId) : "global";
    if (this.cachedListBySurface.has(sId))
      return this.cachedListBySurface.get(sId)!;

    const globalExts = this.extensionsBySurface.get("global");
    const surfaceExts = this.extensionsBySurface.get(sId);

    if (!globalExts && !surfaceExts) {
      const empty: any[] = [];
      this.cachedListBySurface.set(sId, empty);
      return empty;
    }

    const merged = new Map([...(globalExts || []), ...(surfaceExts || [])]);
    const result = Array.from(merged.values()).sort(
      (a: any, b: any) => a.order - b.order,
    );
    this.cachedListBySurface.set(sId, result);
    return result;
  };

  setExtension = (surfaceId: any, extension: any) => {
    if (!extension) return;
    const normalized = normalizeSurfaceExtension(extension);
    if (!normalized) return;

    const sId = surfaceId != null ? String(surfaceId) : "global";
    let surfaceMap = this.extensionsBySurface.get(sId);
    if (!surfaceMap) {
      surfaceMap = new Map();
      this.extensionsBySurface.set(sId, surfaceMap);
    }

    const prev = surfaceMap.get(normalized.id);
    if (
      prev &&
      prev.content === normalized.content &&
      prev.align === normalized.align &&
      prev.order === normalized.order &&
      prev.className === normalized.className &&
      prev.unstyled === normalized.unstyled &&
      prev.component === normalized.component &&
      prev.props === normalized.props
    )
      return;

    surfaceMap.set(normalized.id, normalized);
    this.notify();
  };

  removeExtension = (surfaceId: any, extensionId: any) => {
    if (!extensionId) return;
    const sId = surfaceId != null ? String(surfaceId) : "global";
    const surfaceMap = this.extensionsBySurface.get(sId);
    if (!surfaceMap || !surfaceMap.has(extensionId)) return;

    surfaceMap.delete(extensionId);
    if (surfaceMap.size === 0) this.extensionsBySurface.delete(sId);
    this.notify();
  };

  clearSurface = (surfaceId: any) => {
    const sId = surfaceId != null ? String(surfaceId) : "global";
    if (!this.extensionsBySurface.has(sId)) return;
    this.extensionsBySurface.delete(sId);
    this.notify();
  };
}

export function SurfaceExtensionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const storeRef = useRef<SurfaceExtensionsStore | null>(null);
  const actionStoreRef = useRef<SurfaceHeaderActionStore | null>(null);
  if (!storeRef.current) storeRef.current = new SurfaceExtensionsStore();
  if (!actionStoreRef.current)
    actionStoreRef.current = new SurfaceHeaderActionStore();

  return (
    <SurfaceExtensionsContext value={storeRef.current}>
      <SurfaceHeaderActionContext value={actionStoreRef.current}>
        {children}
      </SurfaceHeaderActionContext>
    </SurfaceExtensionsContext>
  );
}

export function useSurfaceExtensions(input: any) {
  const store = use(SurfaceExtensionsContext);
  const surfaceId = useSurfaceId();
  useEffect(() => {
    if (input == null || !store) return;
    const list = Array.isArray(input) ? input : [input];
    list.forEach((item) => store.setExtension(surfaceId, item));
    return () => store.clearSurface(surfaceId);
  }, [store, surfaceId, input]);
  return store;
}

export function NavSurfaceExtension({
  align = "left",
  children,
  className = "",
  id,
  order = 0,
  unstyled = false,
}: {
  align?: string;
  children?: ReactNode;
  className?: string;
  id?: string;
  order?: number;
  unstyled?: boolean;
}) {
  const store = use(SurfaceExtensionsContext);
  const surfaceId = useSurfaceId();
  const generatedIdRef = useRef<string | null>(null);
  if (generatedIdRef.current === null)
    generatedIdRef.current =
      id || `nav-surface-ext-${Math.random().toString(36).slice(2, 9)}`;
  const effectiveId = id || generatedIdRef.current;

  useEffect(() => {
    if (!store) return;
    store.setExtension(surfaceId, {
      align,
      className,
      content: children,
      id: effectiveId,
      order,
      unstyled,
    });
  });

  useEffect(() => {
    return () => {
      if (store) store.removeExtension(surfaceId, effectiveId);
    };
  }, [store, surfaceId, effectiveId]);
  return null;
}

function ExtensionPill({ ext, fill = false }: { ext: any; fill?: boolean }) {
  const Component = ext.component;
  const content = Component ? (
    isValidComponentType(Component) ? (
      <Component {...ext.props} />
    ) : null
  ) : (
    ext.content
  );
  if (ext.unstyled)
    return (
      <div
        className={cn(
          "pointer-events-auto",
          fill && "w-full min-w-0 flex-1",
          ext.className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    );
  return (
    <div
      className={cn(
        "pointer-events-auto flex min-h-6 h-full max-w-full items-center gap-1 select-none",
        fill && "w-full min-w-0 flex-1",
        ext.className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </div>
  );
}

export function useIsSurfaceExtensionsVisible(activeItem: any): boolean {
  const store = use(SurfaceExtensionsContext);
  const surfaceId = activeItem?.surfaceId || "global";
  const isSurface = Boolean(activeItem?.isSurface);
  const phase = activeItem?.surfacePhase;
  const isBodyVisible =
    phase === NAV_SURFACE_PHASE.EXPANDING_BODY ||
    phase === NAV_SURFACE_PHASE.OPEN;

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      store ? store.subscribe(onStoreChange) : () => {},
    [store],
  );
  const getSnapshot = useCallback(
    () => (store ? store.getExtensionsForSurface(surfaceId).length : 0),
    [store, surfaceId],
  );

  const dynamicCount = useSyncExternalStore(subscribe, getSnapshot, () => 0);
  const descriptorCount = useMemo(() => {
    const raw = activeItem?.surfaceExtensions || activeItem?.extensions || [];
    return Array.isArray(raw) ? raw.length : 0;
  }, [activeItem?.surfaceExtensions, activeItem?.extensions]);

  return Boolean(
    isSurface && isBodyVisible && (dynamicCount > 0 || descriptorCount > 0),
  );
}

export const NavSurfaceExtensionsBar = memo(function NavSurfaceExtensionsBar({
  activeItem,
}: {
  activeItem?: any;
}) {
  const store = use(SurfaceExtensionsContext);
  const surfaceId = activeItem?.surfaceId || "global";

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      store ? store.subscribe(onStoreChange) : () => {},
    [store],
  );
  const getSnapshot = useCallback(
    () => (store ? store.getExtensionsForSurface(surfaceId) : []),
    [store, surfaceId],
  );
  const dynamicExtensions = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => [],
  );

  const descriptorExtensions = useMemo(() => {
    const raw = activeItem?.surfaceExtensions || activeItem?.extensions || [];
    return Array.isArray(raw)
      ? raw.map(normalizeSurfaceExtension).filter(Boolean)
      : [];
  }, [activeItem?.surfaceExtensions, activeItem?.extensions]);

  const allExtensions = useMemo(() => {
    const map = new Map();
    descriptorExtensions.forEach((ext: any) => map.set(ext.id, ext));
    dynamicExtensions.forEach((ext: any) => map.set(ext.id, ext));
    return Array.from(map.values()).sort((a: any, b: any) => a.order - b.order);
  }, [descriptorExtensions, dynamicExtensions]);

  if (!allExtensions.length) return null;

  const leftExtensions = allExtensions.filter((e) => e.align === "left");
  const centerExtensions = allExtensions.filter((e) => e.align === "center");
  const rightExtensions = allExtensions.filter((e) => e.align === "right");
  const hasCenter = centerExtensions.length > 0;

  return (
    <div
      className="relative flex h-full w-full items-center justify-between select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="pointer-events-auto z-10 flex h-full shrink-0 items-center justify-start gap-1">
        {leftExtensions.map((ext) => (
          <ExtensionPill
            key={ext.id}
            ext={ext}
            fill={!hasCenter && leftExtensions.length === 1}
          />
        ))}
      </div>
      {hasCenter && (
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
          <div className="pointer-events-auto flex items-center justify-center gap-1">
            {centerExtensions.map((ext) => (
              <ExtensionPill key={ext.id} ext={ext} />
            ))}
          </div>
        </div>
      )}
      <div className="pointer-events-auto z-10 ml-auto flex h-full shrink-0 items-center justify-end gap-1">
        {rightExtensions.map((ext) => (
          <ExtensionPill key={ext.id} ext={ext} />
        ))}
      </div>
    </div>
  );
});

export const NavSurfaceHeaderRadiusContext = createContext<string | null>(null);

function getControlRadiusClass(key: string, activeKeys: string[]): string {
  if (activeKeys.length <= 1) return "rounded-full";
  const index = activeKeys.indexOf(key);
  if (index === 0) return "rounded-l-full rounded-r-none";
  if (index === activeKeys.length - 1) return "rounded-r-full rounded-l-none";
  return "rounded-none";
}

function applyControlRadius(className: any, radiusClass: string): string {
  if (typeof className !== "string" || !className) return radiusClass;
  const stripped = className
    .replace(ROUNDED_CLASS_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
  return [stripped, radiusClass].filter(Boolean).join(" ");
}

export function NavSurfaceHeaderButton({
  children,
  className = "",
  disabled = false,
  onClick,
  ariaLabel,
  icon = null,
}: {
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  ariaLabel?: string;
  icon?: any;
}) {
  const contextRadius = use(NavSurfaceHeaderRadiusContext);
  const radiusClass = contextRadius ?? "rounded-full";
  const isText = typeof children === "string" || Array.isArray(children);

  return (
    <ButtonComponent
      type="button"
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      disabled={disabled}
      aria-label={
        ariaLabel || (typeof children === "string" ? children : undefined)
      }
      className={cn(
        "pointer-events-auto center shrink-0 cursor-pointer bg-black/60 text-white/70 ring-1 ring-white/10 ring-inset hover:z-10 hover:bg-white/15 hover:text-white hover:ring-white/15 active:scale-95 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:outline-none transition-[transform,background-color,color,border-color,border-radius] duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none",
        radiusClass,
        isText ? "h-9 px-3.5 text-xs font-semibold" : "size-9",
        className,
      )}
    >
      {icon && <IconifyComponent icon={icon} size={16} />}
      {children}
    </ButtonComponent>
  );
}

export const NavSurfaceControls = memo(function NavSurfaceControls({
  activeItem = null,
  hasExtensions = false,
  onClose = null,
  onBack = null,
  closeLabel = null,
  backLabel = null,
  className = "",
}: {
  activeItem?: any;
  hasExtensions?: boolean;
  onClose?: (() => void) | null;
  onBack?: (() => void) | null;
  closeLabel?: string | null;
  backLabel?: string | null;
  className?: string;
}) {
  const phase = activeItem?.surfacePhase;
  const isBodyVisible = activeItem
    ? phase === NAV_SURFACE_PHASE.EXPANDING_BODY ||
      phase === NAV_SURFACE_PHASE.OPEN
    : true;
  const actionStore = use(SurfaceHeaderActionContext);
  const surfaceId = activeItem?.surfaceId || "global";

  const subscribeAction = useCallback(
    (onStoreChange: () => void) =>
      actionStore ? actionStore.subscribe(onStoreChange) : () => {},
    [actionStore],
  );
  const getActionSnapshot = useCallback(
    () => (actionStore ? actionStore.getAction(surfaceId) : null),
    [actionStore, surfaceId],
  );

  const dynamicAction = useSyncExternalStore(
    subscribeAction,
    getActionSnapshot,
    () => null,
  );
  const resolvedHeaderAction =
    dynamicAction ??
    activeItem?.headerAction ??
    activeItem?.surfaceHeaderAction ??
    null;
  const resolvedClose =
    onClose ||
    (activeItem?.dismissible !== false
      ? activeItem?.closeAllSurfaces || activeItem?.closeSurface
      : null);
  const resolvedBack = onBack || activeItem?.onBack;
  const resolvedCloseLabel =
    closeLabel || activeItem?.surfaceCloseLabel || "Close surface";
  const resolvedBackLabel =
    backLabel || activeItem?.surfaceBackLabel || "Previous step";

  const hasClose = typeof resolvedClose === "function";
  const hasBack = typeof resolvedBack === "function";
  const hasHeaderAction = Boolean(resolvedHeaderAction);

  const activeControlKeys = [
    hasHeaderAction && "action",
    hasBack && "back",
    hasClose && "close",
  ].filter(Boolean) as string[];

  if (!isBodyVisible || activeControlKeys.length === 0) return null;

  const targetY = hasExtensions
    ? NAV_CARD_LAYOUT.extensionShelfY - NAV_CARD_LAYOUT.collapsed.offsetY
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        key="nav-surface-controls-container"
        custom={targetY}
        variants={navSurfaceControlsContainerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-[calc(100%+12px)] z-30 select-none flex items-center justify-center gap-[2px]",
          className,
        )}
      >
        <AnimatePresence mode="popLayout">
          {hasHeaderAction && (
            <motion.div
              key="nav-surface-custom-action"
              variants={navSurfaceControlsActionVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="pointer-events-auto flex shrink-0 items-center"
            >
              <NavSurfaceHeaderRadiusContext
                value={getControlRadiusClass("action", activeControlKeys)}
              >
                {isValidElement(resolvedHeaderAction)
                  ? cloneElement(resolvedHeaderAction as ReactElement<any>, {
                      className: applyControlRadius(
                        (resolvedHeaderAction as ReactElement<any>).props
                          ?.className,
                        getControlRadiusClass("action", activeControlKeys),
                      ),
                    })
                  : resolvedHeaderAction}
              </NavSurfaceHeaderRadiusContext>
            </motion.div>
          )}
          {hasBack && (
            <motion.div
              key="nav-surface-back"
              variants={navSurfaceControlsBackVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="pointer-events-auto"
            >
              <ButtonComponent
                type="button"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  resolvedBack();
                }}
                className={cn(
                  "center size-9 shrink-0 cursor-pointer bg-black/60 text-white/70 ring-1 ring-white/10 ring-inset hover:z-10 hover:bg-white/15 hover:text-white hover:ring-white/15 active:scale-95 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:outline-none transition-[transform,background-color,color,border-color,border-radius] duration-150 ease-out",
                  getControlRadiusClass("back", activeControlKeys),
                )}
                aria-label={resolvedBackLabel}
                title={resolvedBackLabel}
              >
                <IconifyComponent icon="solar:alt-arrow-left-bold" size={16} />
              </ButtonComponent>
            </motion.div>
          )}
          {hasClose && (
            <motion.div
              key="nav-surface-close"
              variants={navSurfaceControlsCloseVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="pointer-events-auto"
            >
              <ButtonComponent
                type="button"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  resolvedClose();
                }}
                className={cn(
                  "center size-9 shrink-0 cursor-pointer bg-black/60 text-white/70 ring-1 ring-white/10 ring-inset hover:z-10 hover:bg-white/15 hover:text-white hover:ring-white/15 active:scale-95 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:outline-none transition-[transform,background-color,color,border-color,border-radius] duration-150 ease-out",
                  getControlRadiusClass("close", activeControlKeys),
                )}
                aria-label={resolvedCloseLabel}
                title={resolvedCloseLabel}
              >
                <IconifyComponent
                  icon="material-symbols:close-rounded"
                  size={16}
                />
              </ButtonComponent>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
});

export function NavSurfaceHeader() {
  return null;
}

export interface NavSurfaceShellProps {
  ref?: React.Ref<HTMLElement>;
  title?: string;
  onClose?: (() => void) | null;
  onBack?: (() => void) | null;
  allowSwipeDismiss?: boolean;
  closeLabel?: string;
  backLabel?: string;
  showControls?: boolean;
  className?: string;
  contentClassName?: string;
  children?: ReactNode;
  onAnimationComplete?: any;
  isActive?: boolean;
  surfaceId?: any;
  surfacePhase?: string;
  surfaceWidth?: any;
}

export function NavSurfaceShell({
  ref,
  title = "",
  onClose = null,
  onBack = null,
  allowSwipeDismiss = true,
  closeLabel = "Close surface",
  backLabel = "Previous step",
  showControls = false,
  className = "",
  contentClassName = "",
  children,
  onAnimationComplete = null,
  isActive = true,
  surfaceId = null,
  surfacePhase = NAV_SURFACE_PHASE.OPEN,
  surfaceWidth = null,
}: NavSurfaceShellProps) {
  const surfaceElementRef = useRef<HTMLElement | null>(null);
  const patchHeader = useCallback(() => {}, []);

  const setSurfaceElementRef = useCallback(
    (node: HTMLElement | null) => {
      surfaceElementRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as any).current = node;
    },
    [ref],
  );

  const isFullyOpen = surfacePhase === NAV_SURFACE_PHASE.OPEN;
  const titleId =
    surfaceId == null ? undefined : `nav-surface-title-${surfaceId}`;

  const dragY = useMotionValue(0);
  const dragOpacity = useTransform(
    dragY,
    NAV_SURFACE_DRAG_INTERPOLATION.DRAG_RANGE as any,
    NAV_SURFACE_DRAG_INTERPOLATION.OPACITY_RANGE as any,
  );
  const dragScale = useTransform(
    dragY,
    NAV_SURFACE_DRAG_INTERPOLATION.DRAG_RANGE as any,
    NAV_SURFACE_DRAG_INTERPOLATION.SCALE_RANGE as any,
  );

  useNavigationFocusTrap({
    containerRef: surfaceElementRef,
    enabled: isActive && isFullyOpen,
    onDismiss: typeof onClose === "function" ? onClose : null,
  });

  const handleDragEnd = (_e: any, info: any) => {
    if (
      !isActive ||
      !allowSwipeDismiss ||
      typeof onClose !== "function" ||
      !isFullyOpen
    )
      return;
    if (
      info.offset.y > NAV_SURFACE_DRAG_THRESHOLDS.DISMISS_OFFSET_Y ||
      info.velocity.y > NAV_SURFACE_DRAG_THRESHOLDS.DISMISS_VELOCITY_Y
    ) {
      onClose();
    }
  };

  const isBodyVisible =
    surfacePhase === NAV_SURFACE_PHASE.EXPANDING_BODY ||
    surfacePhase === NAV_SURFACE_PHASE.OPEN;
  const resolvedSurfaceId = surfaceId || "active";

  const dimensionsValue = useMemo(
    () => ({ width: surfaceWidth }),
    [surfaceWidth],
  );

  return (
    <SurfaceIdContext value={resolvedSurfaceId}>
      <SurfaceDimensionsContext value={dimensionsValue}>
        <SurfaceHeaderContext value={patchHeader}>
          <motion.section
            ref={setSurfaceElementRef as any}
            role="dialog"
            aria-modal="true"
            aria-hidden={isActive ? undefined : true}
            aria-labelledby={titleId}
            inert={isActive ? undefined : true}
            tabIndex={-1}
            className={cn(
              "@container relative flex flex-col overflow-hidden rounded-[20px]",
              !isActive && "hidden",
              className,
            )}
            style={{
              WebkitBackfaceVisibility:
                NAV_COMPOSITOR_STYLE.WebkitBackfaceVisibility,
              backfaceVisibility: NAV_COMPOSITOR_STYLE.backfaceVisibility,
              WebkitFontSmoothing: NAV_COMPOSITOR_STYLE.WebkitFontSmoothing,
              y: dragY as any,
              opacity: dragOpacity as any,
              scale: dragScale as any,
            }}
            transformTemplate={navSurfaceDragTransformTemplate as any}
            drag={
              isActive &&
              allowSwipeDismiss &&
              typeof onClose === "function" &&
              isFullyOpen
                ? "y"
                : false
            }
            dragConstraints={NAV_SURFACE_DRAG_CONSTRAINTS}
            dragElastic={NAV_SURFACE_DRAG_ELASTIC}
            onDragEnd={handleDragEnd}
            onAnimationComplete={onAnimationComplete}
          >
            {title && (
              <h2 id={titleId} className="sr-only">
                {title}
              </h2>
            )}
            <AnimatePresence>
              {showControls && isBodyVisible && (
                <NavSurfaceControls
                  onClose={onClose}
                  onBack={onBack}
                  closeLabel={closeLabel}
                  backLabel={backLabel}
                />
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait" initial={false}>
              {isBodyVisible && (
                <motion.div
                  key="surface-body-motion"
                  variants={navSurfaceBodyVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={
                    (surfacePhase as any) === NAV_SURFACE_PHASE.COLLAPSING_BODY
                      ? NAV_SURFACE_BODY_EXIT_TRANSITION
                      : surfacePhase === NAV_SURFACE_PHASE.OPEN
                        ? NAV_SURFACE_BODY_STEP_TRANSITION
                        : NAV_SURFACE_BODY_ENTER_TRANSITION
                  }
                  style={{ ...NAV_COMPOSITOR_STYLE }}
                  className={cn(
                    "@container w-full overflow-hidden rounded-[20px]",
                    contentClassName,
                  )}
                >
                  {children}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </SurfaceHeaderContext>
      </SurfaceDimensionsContext>
    </SurfaceIdContext>
  );
}
