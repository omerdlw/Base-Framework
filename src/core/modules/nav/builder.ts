"use client";

import { useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  useNavContextActions,
  useNavHud,
  useNavigationActions,
  useNavigationSelector,
} from "./provider";
import { useRegisterBreadcrumbOverride } from "./breadcrumbs";
import { NAV_HUD_PRIORITY } from "./constants";
import { defineSurface as defineSurfaceCore } from "./surface";
import type {
  BreadcrumbOverride,
  NavActionDefinition,
  NavActionDescriptor,
  NavHudDefinition,
  NavHudDescriptor,
  SurfaceDescriptor,
  SurfaceStep,
} from "./types";

export { useNav, useNavBanner } from "@/core/orchestration";

const EMPTY_SURFACE_STACK = Object.freeze([]) as readonly any[];

export interface DefineHudOptions {
  autoDismissMs?: number | null;
  component?: any;
  defaultProps?: Record<string, any>;
  description?: string;
  dismissOnEscape?: boolean;
  dismissOnNavigate?: boolean;
  icon?: any;
  id?: string;
  priority?: number;
  title?: string;
  [key: string]: any;
}

export function defineHud(definition: DefineHudOptions = {}): NavHudDefinition {
  const {
    autoDismissMs = null,
    component = null,
    defaultProps = {},
    dismissOnEscape = true,
    dismissOnNavigate = true,
    id = "hud",
    priority = NAV_HUD_PRIORITY.DEFAULT,
    ...extraConfig
  } = definition;

  const createDescriptor = (
    props: Record<string, any> = {},
    overrides: Record<string, any> = {},
  ): NavHudDescriptor => {
    const mergedProps = { ...defaultProps, ...props };
    return {
      id: overrides.id ?? id,
      component,
      props: mergedProps,
      priority: overrides.priority ?? priority,
      autoDismissMs: overrides.autoDismissMs ?? autoDismissMs,
      dismissOnEscape: overrides.dismissOnEscape ?? dismissOnEscape,
      dismissOnNavigate: overrides.dismissOnNavigate ?? dismissOnNavigate,
      ...extraConfig,
      ...overrides,
    };
  };

  return Object.freeze({
    create: createDescriptor,
    hide: (clearHudFn: (id?: string) => void, targetId?: string) => {
      if (typeof clearHudFn === "function") {
        clearHudFn(targetId || id);
      }
    },
    id,
    show: (
      setHudFn: (descriptor: NavHudDescriptor) => void,
      props: Record<string, any> = {},
      overrides: Record<string, any> = {},
    ) => {
      const descriptor = createDescriptor(props, overrides);
      if (typeof setHudFn === "function") {
        setHudFn(descriptor);
      }
      return {
        dismiss: (clearHudFn: (id?: string) => void) => {
          if (typeof clearHudFn === "function") {
            clearHudFn(descriptor.id);
          }
        },
        id: descriptor.id,
        update: (nextProps: Record<string, any> = {}) => {
          if (typeof setHudFn === "function") {
            setHudFn(createDescriptor({ ...props, ...nextProps }, overrides));
          }
        },
      };
    },
    use: function useDefinedHud(
      props: Record<string, any> = {},
      overrides: Record<string, any> = {},
    ) {
      const descriptor = createDescriptor(props, overrides);
      useNavHud(descriptor);
    },
    useTrigger: function useTriggerHud() {
      return useHud(this) as any;
    },
  });
}

export function useHud(hudDefinition: any = null) {
  const { clearHud, setHud } = useNavigationActions();

  return useMemo(() => {
    if (!hudDefinition) {
      return { clearHud, setHud };
    }

    const show = (
      props: Record<string, any> = {},
      overrides: Record<string, any> = {},
    ) => {
      if (typeof hudDefinition.show === "function") {
        return hudDefinition.show(setHud, props, overrides);
      }
      return null;
    };

    const hide = (targetId?: string) => {
      if (typeof hudDefinition.hide === "function") {
        hudDefinition.hide(clearHud, targetId);
      } else {
        clearHud(targetId || hudDefinition.id);
      }
    };

    return {
      clear: clearHud,
      hide,
      show,
    };
  }, [clearHud, hudDefinition, setHud]);
}

export function useSurface(surfaceDefinition: any = null): any {
  const { closeAllSurfaces, closeSurface, openSurface } =
    useNavigationActions();
  const rawSurfaceStack = useNavigationSelector((s) => s.surfaceStack);
  const surfaceStack = rawSurfaceStack || EMPTY_SURFACE_STACK;

  const specificSurface = useMemo(() => {
    if (!surfaceDefinition) return null;

    const targetId =
      typeof surfaceDefinition === "string"
        ? surfaceDefinition
        : surfaceDefinition.id || null;

    const targetComponent =
      typeof surfaceDefinition === "function"
        ? surfaceDefinition.component || surfaceDefinition
        : surfaceDefinition.component || null;

    const isThisSurfaceOpen = surfaceStack.some(
      (entry: any) =>
        (targetId && entry.id === targetId) ||
        (targetComponent && entry.component === targetComponent),
    );

    const open = (props?: any, overrides?: any) => {
      const entry =
        typeof surfaceDefinition === "function"
          ? surfaceDefinition(props, overrides)
          : {
              ...surfaceDefinition,
              props: { ...(surfaceDefinition.props || {}), ...props },
              ...overrides,
            };
      return openSurface(entry);
    };

    const result: any = [
      open,
      {
        close: (res?: any) => closeSurface(res, targetId),
        closeAll: closeAllSurfaces,
        isOpen: isThisSurfaceOpen,
        surfaceStack,
      },
    ];
    result.open = open;
    result.close = (res?: any) => closeSurface(res, targetId);
    result.closeAll = closeAllSurfaces;
    result.isOpen = isThisSurfaceOpen;
    result.surfaceStack = surfaceStack;
    return result;
  }, [
    closeAllSurfaces,
    closeSurface,
    openSurface,
    surfaceDefinition,
    surfaceStack,
  ]);

  const generalSurface = useMemo(
    () => ({
      closeAllSurfaces,
      closeSurface,
      openSurface,
      surfaceStack,
    }),
    [closeAllSurfaces, closeSurface, openSurface, surfaceStack],
  );

  return surfaceDefinition ? specificSurface : generalSurface;
}

export function defineSurface(definition: any = {}): any {
  const factory = defineSurfaceCore(definition) as any;
  factory.use = function useDefinedSurface() {
    return useSurface(factory);
  };
  return factory;
}

export interface DefineNavActionOptions {
  badge?: any;
  className?: string | null;
  disabled?: boolean;
  icon?: any;
  key?: string;
  onClick?: (event?: any) => void;
  order?: number;
  tone?: string | null;
  tooltip?: string | null;
  visible?: boolean;
  [key: string]: any;
}

export function defineNavAction(
  definition: DefineNavActionOptions = {},
): NavActionDefinition {
  const {
    badge = null,
    className = null,
    disabled = false,
    icon = null,
    key = "nav-action",
    onClick = null,
    order = 0,
    tone = null,
    tooltip = null,
    visible = true,
    ...extraConfig
  } = definition;

  const createAction = (overrides: any = {}): NavActionDescriptor => {
    const resolvedOverrides =
      typeof overrides === "function" ? { onClick: overrides } : overrides;
    return {
      key,
      icon,
      tooltip,
      order,
      disabled,
      visible,
      badge,
      className,
      tone,
      onClick,
      ...extraConfig,
      ...resolvedOverrides,
    };
  };

  return Object.freeze({
    bind: createAction,
    create: createAction,
    key,
    use: function useDefinedNavAction(overrides: any = {}) {
      const action = createAction(overrides);
      useNavContextActions([action]);
    },
  });
}

export interface DefineBreadcrumbOptions {
  icon?: any;
  path?: string | null;
  title?: any;
  [key: string]: any;
}

export function defineBreadcrumb(definition: DefineBreadcrumbOptions = {}) {
  const { icon = null, path = null, title = null, ...extraConfig } = definition;

  const createOverride = (
    props: any = {},
    overrides: any = {},
  ): BreadcrumbOverride & { path?: string | null; [key: string]: any } => {
    const resolvedTitle = typeof title === "function" ? title(props) : title;
    const resolvedIcon = typeof icon === "function" ? icon(props) : icon;
    return {
      icon: overrides.icon ?? resolvedIcon,
      path: overrides.path ?? path,
      title: overrides.title ?? resolvedTitle,
      ...extraConfig,
      ...overrides,
    };
  };

  const useDefinedBreadcrumb = (props: any = {}, overrides: any = {}) => {
    const pathname = usePathname();
    const activePath = overrides.path || path || pathname;
    const override = createOverride(props, { ...overrides, path: activePath });
    useRegisterBreadcrumbOverride(override as any);
  };

  return Object.freeze({
    create: createOverride,
    use: useDefinedBreadcrumb,
  });
}

export interface DefineStepSurfaceOptions {
  currentStepIndex?: number;
  defaultProps?: Record<string, any>;
  id?: string;
  steps?: any[] | ((props?: any) => any[]);
  title?: any;
  width?: number | string | null;
  [key: string]: any;
}

export function defineStepSurface(definition: DefineStepSurfaceOptions = {}) {
  const {
    currentStepIndex = 0,
    defaultProps = {},
    id = "wizard-surface",
    steps = [],
    title = null,
    width = null,
    ...extraConfig
  } = definition;

  return function stepSurfaceFactory(
    props: Record<string, any> = {},
    overrides: Record<string, any> = {},
  ): SurfaceDescriptor {
    const mergedProps = { ...defaultProps, ...props };
    const resolvedTitle =
      typeof title === "function" ? title(mergedProps) : title;
    const resolvedSteps =
      typeof steps === "function" ? steps(mergedProps) : steps;
    return {
      id: overrides.id ?? id,
      title: overrides.title ?? resolvedTitle,
      steps: resolvedSteps,
      currentStepIndex: overrides.currentStepIndex ?? currentStepIndex,
      props: mergedProps,
      width: overrides.width ?? width,
      ...extraConfig,
      ...overrides,
    };
  };
}

export function useSurfaceStep() {
  const { closeSurface, goToStep, popStep, pushStep } = useNavigationActions();
  const surfaceStack = useNavigationSelector((s) => s.surfaceStack) || [];
  const activeEntry = surfaceStack[surfaceStack.length - 1] || null;
  const steps: SurfaceStep[] = Array.isArray(activeEntry?.steps)
    ? activeEntry.steps
    : [];
  const stepIndex = Number(activeEntry?.currentStepIndex || 0);
  const stepsTotal = steps.length;
  const currentStep = steps[stepIndex] || null;
  const isFirst = stepIndex <= 0;
  const isLast = stepsTotal > 0 && stepIndex >= stepsTotal - 1;

  const next = useCallback(() => {
    if (!isLast) goToStep(stepIndex + 1);
  }, [goToStep, isLast, stepIndex]);

  const prev = useCallback(() => {
    if (!isFirst) popStep();
  }, [isFirst, popStep]);

  const goTo = useCallback(
    (idx: number) => {
      goToStep(idx);
    },
    [goToStep],
  );

  const push = useCallback(
    (step: any) => {
      pushStep(step);
    },
    [pushStep],
  );

  return {
    close: closeSurface,
    currentStep,
    goTo,
    isFirst,
    isLast,
    next,
    prev,
    push,
    stepIndex,
    steps,
    stepsTotal,
  };
}
