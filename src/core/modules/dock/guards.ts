"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EVENT_TYPES, globalEvents } from "@/core/events";

const IS_DEV = process.env.NODE_ENV !== "production";

export interface DockGuard {
  message?: string;
  onBlock?: (info: {
    to: string;
    from: string;
    guardId: number;
    message: string;
  }) => void;
  when: boolean | ((to: string, from: string) => boolean | Promise<boolean>);
}

const guardRegistry = new Map<number, DockGuard>();
let guardIdCounter = 0;

export function clearDockGuards(): void {
  guardRegistry.clear();
  guardIdCounter = 0;
}

export function getDockGuardCount(): number {
  return guardRegistry.size;
}

export function registerGuard(guard: DockGuard): () => void {
  const id = ++guardIdCounter;
  guardRegistry.set(id, guard);
  return () => {
    guardRegistry.delete(id);
  };
}

export interface GuardCheckResult {
  blocked: boolean;
  guardId?: number;
  message?: string;
}

export async function checkGuards(
  to: string,
  from: string,
): Promise<GuardCheckResult> {
  for (const [id, guard] of guardRegistry) {
    let shouldBlock = false;
    try {
      shouldBlock = await Promise.resolve(
        typeof guard.when === "function" ? guard.when(to, from) : guard.when,
      );
    } catch (error) {
      if (IS_DEV)
        console.error("[Dock Guard] Guard evaluation failed:", error);
    }

    if (shouldBlock) {
      const message =
        guard.message || "Are you sure you want to leave this page?";
      try {
        guard.onBlock?.({ to, from, guardId: id, message });
      } catch (error) {
        if (IS_DEV)
          console.error("[Dock Guard] Block handler failed:", error);
      }
      return { message, blocked: true, guardId: id };
    }
  }
  return { blocked: false };
}

export interface UseDockGuardOptions {
  message?: string;
  when?: boolean | ((to?: string, from?: string) => boolean | Promise<boolean>);
  onBlock?: (info: any) => void;
}

export function useDockGuard(options: UseDockGuardOptions = {}) {
  const {
    message = "You have unsaved changes. Are you sure you want to leave?",
    when = false,
    onBlock,
  } = options;

  const whenRef = useRef(when);
  const [isActive, setIsActive] = useState(Boolean(when));

  useEffect(() => {
    whenRef.current = when;
    setIsActive(Boolean(when));
    if (!when) globalEvents.emit(EVENT_TYPES.DOCK_GUARD, { clear: true });
  }, [when]);

  useEffect(() => {
    const unregister = registerGuard({
      when: () =>
        typeof whenRef.current === "function"
          ? (whenRef.current as any)()
          : Boolean(whenRef.current),
      message,
      onBlock,
    });
    return () => {
      unregister();
      globalEvents.emit(EVENT_TYPES.DOCK_GUARD, { clear: true });
    };
  }, [message, onBlock]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const isBlocked =
        typeof whenRef.current === "function"
          ? (whenRef.current as any)()
          : Boolean(whenRef.current);
      if (isBlocked) {
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [message]);

  const setGuard = useCallback(
    (
      active:
        boolean | ((to?: string, from?: string) => boolean | Promise<boolean>),
    ) => {
      whenRef.current = active;
      setIsActive(Boolean(active));
      if (!active) globalEvents.emit(EVENT_TYPES.DOCK_GUARD, { clear: true });
    },
    [],
  );

  const clearGuard = useCallback(() => {
    whenRef.current = false;
    setIsActive(false);
    globalEvents.emit(EVENT_TYPES.DOCK_GUARD, { clear: true });
  }, []);

  return { isActive, clearGuard, setGuard };
}
