import { isValidElement, type ReactNode } from "react";
import {
  isBrowser,
  isImageIconSource,
  isObject,
  toArray,
  toFiniteNumber,
} from "@/core/utils";
import { CONTEXT_MENU_VISIBILITY_EVENT, INITIAL_POSITION } from "./constants";
import type {
  ContextMenuContextValue,
  ContextMenuPageMeta,
  ContextMenuState,
} from "./types";

export { isImageIconSource, isObject, toArray };

export function joinClassNames(
  ...classes: (string | boolean | null | undefined)[]
): string {
  return classes.filter(Boolean).join(" ");
}

export function isScrollLockKey(event: { key: string }): boolean {
  return (
    event.key === "ArrowDown" ||
    event.key === "ArrowUp" ||
    event.key === "PageDown" ||
    event.key === "PageUp" ||
    event.key === "Home" ||
    event.key === "End" ||
    event.key === " " ||
    event.key === "Spacebar"
  );
}

export function extractNodeText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) {
    return value
      .map(extractNodeText)
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (isValidElement(value))
    return extractNodeText((value.props as { children?: ReactNode })?.children);
  return "";
}

export function resolveAsBoolean(
  value: unknown,
  context?: unknown,
  defaultValue = true,
): boolean {
  if (typeof value === "function") {
    try {
      return Boolean(value(context));
    } catch {
      return false;
    }
  }
  if (value === undefined) {
    return defaultValue;
  }
  return Boolean(value);
}

export function resolveAsValue<T = unknown>(
  value: unknown,
  context?: unknown,
  fallback?: T,
): T {
  if (typeof value === "function") {
    try {
      const resolved = value(context);
      return resolved === undefined ? (fallback as T) : resolved;
    } catch {
      return fallback as T;
    }
  }
  return value === undefined ? (fallback as T) : (value as T);
}

export function emitContextMenuVisibility(isOpen: boolean): void {
  if (!isBrowser) return;
  window.dispatchEvent(
    new CustomEvent(CONTEXT_MENU_VISIBILITY_EVENT, {
      detail: { isOpen: Boolean(isOpen) },
    }),
  );
}

export function createInitialMenuState(): ContextMenuState {
  return {
    config: null,
    context: null,
    isOpen: false,
    items: [],
    position: INITIAL_POSITION,
  };
}

export function resolveNextOpenState(
  configOrState: any,
  x?: number,
  y?: number,
): ContextMenuState | null {
  if (isObject(configOrState)) {
    const config = configOrState.config;
    if (config) {
      return {
        config,
        context: (configOrState.context ||
          null) as ContextMenuContextValue | null,
        isOpen: true,
        items: Array.isArray(configOrState.items) ? configOrState.items : [],
        position: isObject(configOrState.position)
          ? {
              x: Math.round(toFiniteNumber(configOrState.position.x, 0)),
              y: Math.round(toFiniteNumber(configOrState.position.y, 0)),
            }
          : {
              x: Math.round(toFiniteNumber(x, 0)),
              y: Math.round(toFiniteNumber(y, 0)),
            },
      };
    }
  }
  return null;
}

export function safeInvoke<T = unknown>(
  handler: unknown,
  ...args: unknown[]
): T | undefined {
  if (typeof handler !== "function") return undefined;
  try {
    const result = handler(...args);
    if (result && typeof result.then === "function") {
      result.catch((err: unknown) =>
        console.error(`[ContextMenu] Async callback error:`, err),
      );
    }
    return result as T;
  } catch (error) {
    console.error(`[ContextMenu] Sync callback error:`, error);
    return undefined;
  }
}

export function resolveContextMenuPageMeta(
  dockItem: any,
  pathname = "",
): ContextMenuPageMeta | null {
  if (!isObject(dockItem)) return null;
  const title = (dockItem.contextMenuTitle ??
    dockItem.title ??
    null) as ReactNode;
  const description = (dockItem.contextMenuDescription ??
    dockItem.description ??
    null) as ReactNode;
  const eyebrow = (dockItem.contextMenuEyebrow ??
    dockItem.eyebrow ??
    null) as ReactNode;
  const icon = dockItem.contextMenuIcon ?? dockItem.icon ?? null;

  if (!title && !description && !icon && !eyebrow) return null;

  return {
    description,
    descriptionText: extractNodeText(description),
    eyebrow,
    icon,
    path:
      typeof dockItem.path === "string" && dockItem.path
        ? dockItem.path
        : pathname,
    title,
    titleText:
      extractNodeText(title) ||
      (typeof dockItem.name === "string" ? dockItem.name : "") ||
      "",
  };
}
