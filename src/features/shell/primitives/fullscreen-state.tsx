"use client";

import { useEffect, useId, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { useTheme } from "@omerdlw/base-framework/theme";
import { acquireGlobalScrollLock, cn } from "@omerdlw/base-framework/utils";
import { primitivesTheme } from "./theme";
import { FullscreenStateProps } from "./types";

const listeners = new Set<() => void>();
const activeFullscreenStateIds = new Set<string>();

const ACTIVE_FULLSCREEN_ROOT_SELECTOR =
  '[data-fullscreen-state-root="true"][data-affect-global-state="true"]';

let domObserver: MutationObserver | null = null;
let lastSnapshot = false;

function getDomSnapshot(): boolean {
  if (typeof document === "undefined") {
    return activeFullscreenStateIds.size > 0;
  }

  return document.querySelector(ACTIVE_FULLSCREEN_ROOT_SELECTOR) !== null;
}

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function emitIfSnapshotChanged(): void {
  const nextSnapshot = getDomSnapshot();

  if (nextSnapshot === lastSnapshot) {
    return;
  }

  lastSnapshot = nextSnapshot;
  emitChange();
}

function ensureDomObserver(): void {
  if (typeof document === "undefined" || domObserver || listeners.size === 0) {
    return;
  }

  domObserver = new MutationObserver(() => {
    emitIfSnapshotChanged();
  });

  domObserver.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: [
      "data-fullscreen-state",
      "data-fullscreen-state-root",
      "data-affect-global-state",
    ],
  });
}

function releaseDomObserver(): void {
  if (listeners.size > 0 || !domObserver) {
    return;
  }

  domObserver.disconnect();
  domObserver = null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  ensureDomObserver();
  emitIfSnapshotChanged();

  return () => {
    listeners.delete(listener);
    releaseDomObserver();
  };
}

function getSnapshot(): boolean {
  return getDomSnapshot();
}

function registerFullscreenState(id: string): void {
  activeFullscreenStateIds.add(id);
  emitIfSnapshotChanged();
}

function unregisterFullscreenState(id: string): void {
  activeFullscreenStateIds.delete(id);
  emitIfSnapshotChanged();
}

const subscribeToNothing = () => () => {};
const getDocumentBody = () => document.body;
const getNoPortalTarget = (): HTMLElement | null => null;

export function useIsFullscreenStateActive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

function FullscreenState({
  id,
  children,
  className,
  contentClassName,
  lockScroll = true,
  affectGlobalState = true,
}: FullscreenStateProps) {
  const theme = useTheme(primitivesTheme);
  const generatedId = useId();
  const stateId = id || `fullscreen-state-${generatedId}`;
  const portalTarget = useSyncExternalStore(
    subscribeToNothing,
    getDocumentBody,
    getNoPortalTarget,
  );

  useEffect(() => {
    if (affectGlobalState) {
      registerFullscreenState(stateId);
    }

    if (!lockScroll || typeof document === "undefined") {
      return () => {
        if (affectGlobalState) {
          unregisterFullscreenState(stateId);
        }
      };
    }

    const { documentElement } = document;
    const previousFullscreenState = documentElement.dataset.fullscreenState;
    const releaseScrollLock = acquireGlobalScrollLock();
    documentElement.dataset.fullscreenState = "true";

    return () => {
      releaseScrollLock();

      if (previousFullscreenState) {
        documentElement.dataset.fullscreenState = previousFullscreenState;
      } else {
        delete documentElement.dataset.fullscreenState;
      }

      if (affectGlobalState) {
        unregisterFullscreenState(stateId);
      }
    };
  }, [affectGlobalState, lockScroll, stateId]);

  const content = (
    <div
      data-affect-global-state={affectGlobalState ? "true" : "false"}
      data-fullscreen-state-root="true"
      data-fullscreen-state-id={stateId}
      className={cn(theme.slots.fullscreen, className)}
    >
      <div className={cn(theme.slots.fullscreenContent, contentClassName)}>
        {children}
      </div>
    </div>
  );

  if (!portalTarget) {
    return content;
  }

  return createPortal(content, portalTarget);
}

FullscreenState.displayName = "FullscreenState";
export { FullscreenState };
