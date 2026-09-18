"use client";

import React, { type ErrorInfo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { EVENT_TYPES, globalEvents } from "@/core/events";
import { Button } from "@/core/primitives";
import { ERROR_BOUNDARY_STYLES, ERROR_MESSAGES } from "./constants";
import { getErrorReporter } from "./reporter";
import type {
  ComponentErrorProps,
  ErrorBoundaryCoreProps,
  ErrorBoundaryCoreState,
  GlobalErrorProps,
  ModuleErrorProps,
} from "./types";
import { createErrorContext, isDevelopment } from "./utils";

const ActionButton = Button as React.ComponentType<{
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}>;

function DefaultErrorFallback({
  error,
  message,
  resetError,
  title,
}: {
  error: Error | null;
  message?: string;
  resetError: () => void;
  title?: string;
}) {
  return (
    <div className={ERROR_BOUNDARY_STYLES.CONTAINER}>
      <div className={ERROR_BOUNDARY_STYLES.ICON_BOX}>!</div>
      <h3 className={ERROR_BOUNDARY_STYLES.TITLE}>
        {title || ERROR_MESSAGES.FALLBACK_TITLE}
      </h3>
      <p className={ERROR_BOUNDARY_STYLES.DESC}>
        {message || error?.message || ERROR_MESSAGES.FALLBACK_MSG}
      </p>
      <ActionButton
        className={ERROR_BOUNDARY_STYLES.BUTTON}
        onClick={resetError}
        type="button"
      >
        Try Again
      </ActionButton>
    </div>
  );
}

export class ErrorBoundaryCore extends React.Component<
  ErrorBoundaryCoreProps,
  ErrorBoundaryCoreState
> {
  constructor(props: ErrorBoundaryCoreProps) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
      hasError: false,
      lastResetKey: props.resetKey,
    };
  }

  static getDerivedStateFromError(
    error: Error,
  ): Partial<ErrorBoundaryCoreState> {
    return { error, hasError: true };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryCoreProps,
    state: ErrorBoundaryCoreState,
  ): Partial<ErrorBoundaryCoreState> | null {
    if (props.resetKey !== state.lastResetKey) {
      return {
        error: null,
        errorInfo: null,
        hasError: false,
        lastResetKey: props.resetKey,
      };
    }
    return null;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    const { message, name, onError, silent, title, variant } = this.props;
    const context = createErrorContext({ errorInfo, name, title, variant });

    try {
      onError?.(error, errorInfo, context);
    } catch (callbackError) {
      if (isDevelopment())
        console.warn("[ErrorBoundary] onError callback failed:", callbackError);
    }

    if (!silent) {
      globalEvents.emit(EVENT_TYPES.APP_ERROR, {
        error,
        errorInfo,
        message: message || error?.message || "An unexpected error occurred",
        resetError: this.resetError,
      });
    }

    try {
      const reporter = getErrorReporter();
      reporter?.captureError?.(error, context);
    } catch (reportingError) {
      if (isDevelopment())
        console.warn("[ErrorBoundary] Error reporting failed:", reportingError);
    }

    if (isDevelopment()) {
      console.error("[ErrorBoundary]", error, context);
    }
  }

  resetError = () => {
    this.setState({
      error: null,
      errorInfo: null,
      hasError: false,
    });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    const { fallback, message, title } = this.props;
    const { error } = this.state;

    if (typeof fallback === "function") {
      return fallback({ error, resetError: this.resetError });
    }

    if (fallback) {
      return fallback;
    }

    return (
      <DefaultErrorFallback
        error={error}
        message={message}
        resetError={this.resetError}
        title={title}
      />
    );
  }
}

export function GlobalError({ children, fallback, onReset }: GlobalErrorProps) {
  const pathname = usePathname();

  return (
    <ErrorBoundaryCore
      fallback={fallback}
      message={ERROR_MESSAGES.GLOBAL_MSG}
      onReset={onReset}
      resetKey={pathname}
      title={ERROR_MESSAGES.GLOBAL_TITLE}
      variant="full"
    >
      {children}
    </ErrorBoundaryCore>
  );
}

export function ModuleError({
  children,
  fallback,
  name,
  onReset,
}: ModuleErrorProps) {
  return (
    <ErrorBoundaryCore
      fallback={fallback}
      message={ERROR_MESSAGES.MODULE_MSG}
      name={name}
      onReset={onReset}
      title={name ? `${name} Error` : ERROR_MESSAGES.MODULE_TITLE}
      variant="module"
    >
      {children}
    </ErrorBoundaryCore>
  );
}

export function ComponentError({
  children,
  fallback,
  message,
  onReset,
}: ComponentErrorProps) {
  return (
    <ErrorBoundaryCore
      fallback={fallback}
      message={message || ERROR_MESSAGES.COMPONENT_MSG}
      onReset={onReset}
      variant="inline"
    >
      {children}
    </ErrorBoundaryCore>
  );
}
