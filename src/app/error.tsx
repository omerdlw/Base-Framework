"use client";

import { useEffect } from "react";
import { EVENT_TYPES, globalEvents } from "@omerdlw/base-framework/events";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";

export interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({
  error,
  reset,
}: ErrorBoundaryProps): null {
  useEffect(() => {
    report("App", error);
    // The dock subscribes in an effect that runs after this one in the same
    // commit, so emit on the next tick.
    const timer = setTimeout(
      () =>
        globalEvents.emit(EVENT_TYPES.APP_ERROR, {
          error,
          message: toUserMessage(error),
          resetError: reset,
          source: "app-error-boundary",
        }),
      0,
    );
    return () => clearTimeout(timer);
  }, [error, reset]);

  return null;
}
