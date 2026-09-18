"use client";

import { isValidElement, memo, useCallback, useEffect, useRef } from "react";
import {
  NAV_HUD_PRIORITY,
  NAV_HUD_RENDER_MODE,
  NAVIGATION_OPERATION_STATUS,
} from "./constants";
import {
  areShallowCollectionsEqual,
  isHudDescriptor,
  isObject,
  isValidComponentType,
  resolveComponentType,
  resolveRenderableContent,
  toArray,
} from "./utils";

export { isHudDescriptor };

function normalizePriority(value: any): number {
  const priority = Number(value);
  return Number.isFinite(priority) ? priority : NAV_HUD_PRIORITY.DEFAULT;
}

function normalizeAutoDismiss(value: any): number | null {
  const ms = Number(value);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

export function createHudDefinition(
  input: any,
  config: Record<string, any> = {},
) {
  if (input == null || input === false) return null;
  const descriptor = isHudDescriptor(input) ? input : null;
  const component = resolveComponentType(descriptor?.component, input);
  const content = resolveRenderableContent(
    descriptor?.content,
    descriptor?.node,
    descriptor?.element,
  );
  const directContent =
    content ??
    (isValidElement(input) ||
    typeof input === "string" ||
    typeof input === "number"
      ? input
      : null);
  if (!component && directContent == null) return null;
  const id =
    descriptor?.id ??
    config?.id ??
    (component
      ? component.displayName || component.name || "component-hud"
      : "hud");
  return {
    autoDismissMs: normalizeAutoDismiss(
      descriptor?.autoDismissMs ?? config?.autoDismissMs,
    ),
    component,
    content: component ? null : directContent,
    dismissOnEscape:
      descriptor?.dismissOnEscape ?? config?.dismissOnEscape ?? true,
    dismissOnNavigate:
      descriptor?.dismissOnNavigate ?? config?.dismissOnNavigate ?? true,
    id: String(id),
    isActive: Boolean(descriptor?.isActive ?? config?.isActive ?? true),
    onDismiss:
      typeof descriptor?.onDismiss === "function"
        ? descriptor.onDismiss
        : typeof descriptor?.onCancel === "function"
          ? descriptor.onCancel
          : typeof config?.onDismiss === "function"
            ? config.onDismiss
            : typeof config?.onCancel === "function"
              ? config.onCancel
              : null,
    priority: normalizePriority(descriptor?.priority ?? config?.priority),
    props: component && isObject(descriptor?.props) ? descriptor.props : {},
    renderMode: component
      ? NAV_HUD_RENDER_MODE.COMPONENT
      : NAV_HUD_RENDER_MODE.NODE,
  };
}

function arePropsEqual(left: any, right: any): boolean {
  if (Object.is(left, right)) return true;
  if (!isObject(left) || !isObject(right)) return false;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every((key) => {
    if (!Object.hasOwn(right, key)) return false;
    if (Object.is(left[key], right[key])) return true;
    if (typeof left[key] === "function" && typeof right[key] === "function") {
      return true;
    }
    return (
      isObject(left[key]) &&
      isObject(right[key]) &&
      areShallowCollectionsEqual(left[key], right[key])
    );
  });
}

export function areHudDefinitionsEqual(current: any, next: any): boolean {
  if (Object.is(current, next)) return true;
  if (
    !current ||
    !next ||
    Object.keys(current).length !== Object.keys(next).length
  ) {
    return false;
  }
  return Object.keys(next).every((key) => {
    if (Object.is(current[key], next[key])) return true;
    if (key === "props") return arePropsEqual(current[key], next[key]);
    return (
      typeof current[key] === "function" && typeof next[key] === "function"
    );
  });
}

export function upsertHudEntry(
  entries: Record<string, any>,
  definition: any,
): Record<string, any> {
  if (
    !definition ||
    areHudDefinitionsEqual(entries[definition?.id], definition)
  ) {
    return entries;
  }
  return {
    ...entries,
    [definition.id]: definition,
  };
}

export function removeHudEntries(
  entries: Record<string, any>,
  id: string | null = null,
): Record<string, any> {
  if (!id) return Object.keys(entries).length === 0 ? entries : {};
  if (!entries[id]) return entries;
  const next = {
    ...entries,
  };
  delete next[id];
  return next;
}

export function resolveActiveHud(entries: any) {
  return toArray(entries).reduce((active: any, hud: any) => {
    if (!hud?.isActive) return active;
    return !active ||
      normalizePriority(hud.priority) > normalizePriority(active.priority)
      ? hud
      : active;
  }, null);
}

export function createSelectionModeState(config: any) {
  return config
    ? createHudDefinition(config, {
        id: config.id || "selection-mode",
        priority: NAV_HUD_PRIORITY.SELECTION,
      })
    : null;
}

export function areSelectionModeStatesEqual(current: any, next: any): boolean {
  return areHudDefinitionsEqual(current, next);
}

export function getActiveNavigationHud(
  entries: Record<string, any>,
  selectionMode: any,
) {
  return resolveActiveHud([...Object.values(entries), selectionMode]);
}

export function createNavigationOperationHud(
  operation: any,
  {
    onCancel = null,
    pendingCount = 1,
  }: { onCancel?: ((id: string) => void) | null; pendingCount?: number } = {},
) {
  if (
    !operation?.id ||
    operation.status !== NAVIGATION_OPERATION_STATUS.PENDING ||
    operation.hud == null
  ) {
    return null;
  }
  const hudInput = isHudDescriptor(operation.hud)
    ? {
        ...operation.hud,
        props: {
          ...(isObject(operation.hud.props) ? operation.hud.props : {}),
          operation,
          pendingCount,
        },
      }
    : typeof operation.hud === "function"
      ? {
          component: operation.hud,
          props: {
            operation,
            pendingCount,
          },
        }
      : {
          content: operation.hud,
        };
  return createHudDefinition({
    ...hudInput,
    dismissOnEscape: false,
    dismissOnNavigate: false,
    id: "navigation-operation:" + operation.id,
    isActive: true,
    onDismiss:
      operation.cancellable !== false && typeof onCancel === "function"
        ? () => onCancel(operation.id)
        : null,
    priority: NAV_HUD_PRIORITY.TASK_PROGRESS + Number(operation.priority || 0),
  });
}

export const NavHudView = memo(function NavHudView({
  clearHud,
  hud,
  pathname,
}: {
  clearHud?: ((id?: string) => void) | null;
  hud: any;
  pathname?: string | null;
}) {
  const previousPathRef = useRef(pathname);
  const dismiss = useCallback(() => {
    hud?.onDismiss?.();
    if (hud?.id) clearHud?.(hud.id);
  }, [clearHud, hud]);

  useEffect(() => {
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;
    if (hud?.isActive && hud.dismissOnNavigate && hud.id) clearHud?.(hud.id);
  }, [clearHud, hud?.dismissOnNavigate, hud?.id, hud?.isActive, pathname]);

  useEffect(() => {
    if (!hud?.isActive || !hud?.dismissOnEscape) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      dismiss();
    };
    window.addEventListener("keydown", onKeyDown, {
      capture: true,
    });
    return () =>
      window.removeEventListener("keydown", onKeyDown, {
        capture: true,
      });
  }, [dismiss, hud?.dismissOnEscape, hud?.isActive]);

  useEffect(() => {
    if (!hud?.isActive || !hud?.autoDismissMs) return;
    const timer = setTimeout(dismiss, hud.autoDismissMs);
    return () => clearTimeout(timer);
  }, [dismiss, hud?.autoDismissMs, hud?.isActive]);

  if (!hud?.isActive) return null;
  if (
    hud.renderMode === NAV_HUD_RENDER_MODE.COMPONENT &&
    isValidComponentType(hud.component)
  ) {
    const Component = hud.component;
    return <Component {...hud.props} onDismiss={dismiss} />;
  }
  return hud.content ?? null;
});

export function useNavHudLifecycle({
  clearHud,
  descriptor,
  setHud,
}: {
  clearHud: (id?: string) => void;
  descriptor: any;
  setHud: (descriptor: any) => void;
}) {
  const activeRef = useRef<string | null>(null);
  const previousRef = useRef<any>(null);

  useEffect(() => {
    const definition = createHudDefinition(descriptor);
    if (!definition?.isActive) {
      if (activeRef.current) clearHud(activeRef.current);
      activeRef.current = null;
      previousRef.current = null;
      return;
    }
    if (areHudDefinitionsEqual(previousRef.current, definition)) return;
    activeRef.current = definition.id;
    previousRef.current = definition;
    setHud(definition);
  }, [clearHud, descriptor, setHud]);

  useEffect(
    () => () => {
      if (activeRef.current) clearHud(activeRef.current);
    },
    [clearHud],
  );
}
