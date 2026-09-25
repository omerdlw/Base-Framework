"use client";

import {
  createContext,
  isValidElement,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import {
  DOCK_SURFACE_FLOW_STATUS,
  DOCK_SURFACE_PHASE,
  DOCK_SURFACE_RENDER_MODE,
} from "./constants";
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
import type {
  SurfaceFlowDefinition,
  SurfaceFlowSession,
} from "./types";

export function createSurfaceError(
  code: string,
  message: string,
): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

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
    status: DOCK_SURFACE_FLOW_STATUS.OPEN as string,
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
            "DOCK_SURFACE_FLOW_UNAVAILABLE",
            "Dock surface flow is unavailable",
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
      isOpen: activeFlow?.status === DOCK_SURFACE_FLOW_STATUS.OPEN,
      open,
      snapshot: activeFlow?.snapshot ?? definition?.initialSnapshot ?? null,
      update: (snapshot: any) => context?.updateSurfaceFlow?.(flowId, snapshot),
    }),
    [activeFlow, context, definition?.initialSnapshot, flowId, open],
  );
}

export function normalizeSurfaceDefinition(
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
      ? DOCK_SURFACE_RENDER_MODE.COMPONENT
      : DOCK_SURFACE_RENDER_MODE.NODE,
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

export function createSurfaceFlowBuilder(definition: Record<string, any> = {}) {
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

export interface SurfaceViewModelOptions {
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
}

export function resolveSurfaceViewModel(
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
    surfacePhase = DOCK_SURFACE_PHASE.OPEN,
  }: SurfaceViewModelOptions = {},
) {
  const createSurfacePresentation = (entry: any, stack: any[]) => {
    const surfaceEntry = resolveActiveStepDefinition(entry);
    const surfaceComponent = surfaceEntry?.component ?? null;
    const surfaceContent = surfaceEntry?.content ?? null;
    if (!surfaceComponent && !surfaceContent) return null;

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
  const activeSurface =
    surfaceStackEntries[surfaceStackEntries.length - 1] || null;

  if (!activeSurface) return null;

  return Object.freeze({
    activeSurface,
    rawStepDefinition: resolveActiveStepDefinition(rawSurfaceEntry),
    surfacePhase,
    surfaceStackEntries,
  });
}

export function applySurfaceToDockItem(
  item: any,
  rawSurfaceEntry: any,
  options: SurfaceViewModelOptions = {},
) {
  if (!item) return item;
  const viewModel = resolveSurfaceViewModel(rawSurfaceEntry, options);
  if (!viewModel) return item;

  const { activeSurface, rawStepDefinition, surfacePhase, surfaceStackEntries } =
    viewModel;

  return Object.freeze({
    ...item,
    isSurface: true,
    isOverlay: true,
    ...activeSurface,
    surfacePhase,
    actions: null,
    action: resolveSurfaceAction(item, rawStepDefinition),
    surfaceStackEntries,
    surfaceExtensions:
      activeSurface.surfaceExtensions || activeSurface.extensions || [],
    extensions: activeSurface.extensions || [],
  });
}
