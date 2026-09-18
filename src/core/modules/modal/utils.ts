import { isValidElement, type ReactNode } from "react";
import { isPlainObject } from "@/core/utils";
import {
  FOCUSABLE_SELECTOR,
  HEIGHT_CONSTRAINT_PATTERN,
  MODAL_BREAKPOINTS,
  MODAL_CHROME,
  MODAL_POSITIONS,
  SMOOTH_SCROLL_LOCK_EVENT,
} from "./constants";
import type {
  ModalEntry,
  ModalPosition,
  ModalState,
  ResponsiveModalPosition,
} from "./types";

export function resolveModalHeader(
  configOrModalType: Record<string, unknown> = {},
  legacyConfig: Record<string, unknown> = {},
) {
  const config =
    configOrModalType &&
    typeof configOrModalType === "object" &&
    !Array.isArray(configOrModalType)
      ? configOrModalType
      : legacyConfig;
  const header =
    config?.header && typeof config.header === "object"
      ? (config.header as Record<string, unknown>)
      : {};
  return {
    actions: (header.actions ?? config?.actions ?? null) as ReactNode,
    showClose: (header.showClose ?? config?.showClose) as boolean | undefined,
    title: (header.title ?? config?.title ?? null) as ReactNode,
  };
}

export function hasHeightConstraint(className?: string): boolean {
  return (
    typeof className === "string" && HEIGHT_CONSTRAINT_PATTERN.test(className)
  );
}

export function isSidePosition(
  position: ModalPosition | null | undefined,
): boolean {
  return (
    position === MODAL_POSITIONS.LEFT || position === MODAL_POSITIONS.RIGHT
  );
}

export const isSideModal = isSidePosition;

export function isVerticalEdgePosition(
  position: ModalPosition | null | undefined,
): boolean {
  return (
    position === MODAL_POSITIONS.TOP || position === MODAL_POSITIONS.BOTTOM
  );
}

export function hasSlotContent(value: unknown): boolean {
  return (
    value !== null && value !== undefined && value !== false && value !== ""
  );
}

export function isHeaderConfig(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !isValidElement(value),
  );
}

export function resolveHeaderActions(
  actions:
    | ReactNode
    | ((props: { close?: (result?: unknown) => void }) => ReactNode)
    | undefined,
  close?: (result?: unknown) => void,
): ReactNode {
  return typeof actions === "function" ? actions({ close }) : actions || null;
}

export function getPanelBorderRadiusClass(
  position: ModalPosition,
  isMobile: boolean,
): string {
  if (position === MODAL_POSITIONS.CENTER) return "rounded-[30px]";
  if (position === MODAL_POSITIONS.BOTTOM) return "rounded-t-[30px]";
  if (position === MODAL_POSITIONS.TOP) return "rounded-b-[30px]";
  if (position === MODAL_POSITIONS.LEFT)
    return isMobile ? "rounded-none" : "rounded-r-[30px]";
  if (position === MODAL_POSITIONS.RIGHT)
    return isMobile ? "rounded-none" : "rounded-l-[30px]";
  return "rounded-[30px]";
}

export function dispatchSmoothScrollLock(locked: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SMOOTH_SCROLL_LOCK_EVENT, {
      detail: { locked, source: "modal" },
    }),
  );
}

export function getViewportIsMobile(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia(
    `(max-width: ${MODAL_BREAKPOINTS.MOBILE_MAX_WIDTH}px)`,
  ).matches;
}

export function resolveActivePosition(
  position: ModalPosition,
  responsivePosition: ResponsiveModalPosition | null | undefined,
  isMobileViewport: boolean,
): ModalPosition {
  if (!isPlainObject(responsivePosition)) return position;
  const responsive = isMobileViewport
    ? responsivePosition.mobile
    : responsivePosition.desktop;
  return (responsive || position) as ModalPosition;
}

function getResponsivePosition(
  position: ModalPosition,
  responsivePosition: ResponsiveModalPosition | null | undefined,
): ModalPosition {
  if (
    !isPlainObject(responsivePosition) ||
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return position;
  }
  return resolveActivePosition(
    position,
    responsivePosition,
    getViewportIsMobile(),
  );
}

export function normalizePositionConfig(
  positionInput: unknown,
  config: Record<string, unknown> = {},
): {
  position: ModalPosition;
  responsivePosition: ResponsiveModalPosition | null;
} {
  const basePosition: ModalPosition =
    typeof positionInput === "string"
      ? (positionInput as ModalPosition)
      : MODAL_POSITIONS.CENTER;
  const responsivePosition = isPlainObject(config.responsivePosition)
    ? (config.responsivePosition as ResponsiveModalPosition)
    : isPlainObject(positionInput)
      ? (positionInput as ResponsiveModalPosition)
      : null;

  return {
    position: getResponsivePosition(basePosition, responsivePosition),
    responsivePosition,
  };
}

export function createModalState(modalStack: ModalEntry[] = []): ModalState {
  const activeModal = modalStack[modalStack.length - 1] || null;
  return {
    activeModalId: activeModal?.id || null,
    chrome: activeModal?.chrome || MODAL_CHROME.PANEL,
    headerActions: activeModal?.headerActions || null,
    isOpen: modalStack.length > 0,
    modalStack,
    modalType: activeModal?.modalType || null,
    position: activeModal?.position || MODAL_POSITIONS.CENTER,
    props: activeModal?.props || {},
    responsivePosition: activeModal?.responsivePosition || null,
    showClose: activeModal?.showClose ?? true,
    title: activeModal?.title || null,
  };
}

export function getFocusableElements(
  container: HTMLElement | null,
): HTMLElement[] {
  if (!container || typeof container.querySelectorAll !== "function") return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true",
  );
}

export function trapFocus(
  event: KeyboardEvent,
  container: HTMLElement | null,
): void {
  if (event.key !== "Tab" || !container) return;
  const elements = getFocusableElements(container);
  if (elements.length === 0) return;

  const firstElement = elements[0];
  const lastElement = elements[elements.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
    }
  } else {
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
    }
  }
}

export function getModalLabel(modalType?: string | null): string {
  if (typeof modalType !== "string" || !modalType.trim()) return "Modal";
  return modalType
    .trim()
    .toLowerCase()
    .split(/[_-]+/)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function finalizeModalClose(
  modalId: number,
  result: unknown,
  {
    logCloseErrors = false,
    onCloseMapRef,
    resolveMapRef,
  }: {
    logCloseErrors?: boolean;
    onCloseMapRef: {
      current: Map<number, ((result?: unknown) => unknown) | null>;
    };
    resolveMapRef: { current: Map<number, (result?: unknown) => void> };
  },
): void {
  const onClose = onCloseMapRef.current.get(modalId);
  const resolvePromise = resolveMapRef.current.get(modalId);

  onCloseMapRef.current.delete(modalId);
  resolveMapRef.current.delete(modalId);

  if (typeof onClose === "function") {
    const handleCloseError = (error: unknown) => {
      if (logCloseErrors)
        console.error("[Modal] onClose handler failed:", error);
    };

    try {
      const callbackResult = onClose(result);
      if (
        callbackResult &&
        typeof (callbackResult as Promise<unknown>).then === "function"
      ) {
        (callbackResult as Promise<unknown>).catch(handleCloseError);
      }
    } catch (error) {
      handleCloseError(error);
    }
  }

  if (typeof resolvePromise === "function") {
    resolvePromise(result);
  }
}
