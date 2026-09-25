"use client";

import { useCallback, useEffect, useRef } from "react";
import { EVENT_TYPES, globalEvents } from "@/core/events";
import { DEFAULT_ERROR_MSG, ERROR_LISTENER_CONFIG } from "./constants";
import { getErrorReporter } from "./reporter";
import { getErrorMessage, shouldIgnoreError } from "./utils";

const IS_DEV = process.env.NODE_ENV === "development";

export function GlobalErrorListener(): null {
  const lastError = useRef<number>(0);
  const count = useRef<number>(0);
  const shown = useRef<Set<string>>(new Set());

  const handleError = useCallback((error: unknown, source = "runtime") => {
    if (shouldIgnoreError(error)) return;

    const now = Date.now();

    if (count.current >= ERROR_LISTENER_CONFIG.maxErrors) return;
    if (now - lastError.current < ERROR_LISTENER_CONFIG.throttle) return;

    const message = getErrorMessage(error);
    const key = message || String(error);

    if (shown.current.has(key)) return;
    shown.current.add(key);

    lastError.current = now;
    count.current += 1;

    try {
      const reporter = getErrorReporter();
      reporter?.captureError?.(error, {
        globalListener: true,
        source,
      });
    } catch (reportingError) {
      if (IS_DEV) {
        console.warn("[GlobalError] Error reporting failed:", reportingError);
      }
    }

    globalEvents.emit(EVENT_TYPES.APP_ERROR, {
      error,
      message: message || DEFAULT_ERROR_MSG,
    });

    if (IS_DEV) {
      console.error(`[GlobalError][${source}]`, error);
    }
  }, []);

  useEffect(() => {
    const onError = (event: ErrorEvent) =>
      handleError(event.error || event.message, "window.onerror");
    const onRejection = (event: PromiseRejectionEvent) =>
      handleError(event.reason, "unhandledrejection");

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [handleError]);

  return null;
}
