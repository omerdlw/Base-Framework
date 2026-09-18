"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLoadingValue } from "@/core/orchestration";

import { DEFAULT_LOADING_STATE } from "./constants";
import type {
  LoadingActions,
  LoadingOptions,
  LoadingProviderProps,
  LoadingState,
  LoadingStateWithPage,
  SkeletonValue,
} from "./types";
import { normalizeLoadingOptions } from "./utils";

const LoadingActionsContext = createContext<LoadingActions | null>(null);
const LoadingStateContext = createContext<LoadingStateWithPage | null>(null);

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>(
    DEFAULT_LOADING_STATE,
  );

  const startTimeRef = useRef<number | null>(null);
  const minDurationRef = useRef<number>(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRenderRef = useRef<boolean>(true);

  const registryLoading = useLoadingValue() as LoadingOptions | null;

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current !== null) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    clearStopTimer();
    minDurationRef.current = 0;
    startTimeRef.current = null;
    setLoadingState(DEFAULT_LOADING_STATE);
  }, [clearStopTimer]);

  const startLoading = useCallback(
    (options: LoadingOptions = {}) => {
      clearStopTimer();
      const nextState = normalizeLoadingOptions(options);

      startTimeRef.current = Date.now();
      minDurationRef.current = nextState.minDuration;

      setLoadingState({
        ...nextState,
        isLoading: true,
      });
    },
    [clearStopTimer],
  );

  const stopLoading = useCallback(() => {
    const startTime = startTimeRef.current;
    const activeMinDuration = minDurationRef.current;

    if (startTime === null || activeMinDuration === 0) {
      resetState();
      return;
    }

    const elapsed = Date.now() - startTime;
    const remaining = activeMinDuration - elapsed;

    if (remaining <= 0) {
      resetState();
      return;
    }

    clearStopTimer();
    stopTimerRef.current = setTimeout(resetState, remaining);
  }, [clearStopTimer, resetState]);

  const setLoading = useCallback(
    (value: boolean) => {
      if (value) startLoading();
      else stopLoading();
    },
    [startLoading, stopLoading],
  );

  const setSkeleton = useCallback((nextSkeleton: SkeletonValue) => {
    setLoadingState((currentState) => {
      const skeleton =
        typeof nextSkeleton === "function"
          ? nextSkeleton(currentState.skeleton)
          : nextSkeleton;

      return currentState.skeleton === skeleton
        ? currentState
        : { ...currentState, skeleton };
    });
  }, []);

  useEffect(() => {
    return () => clearStopTimer();
  }, [clearStopTimer]);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      if (!registryLoading) return;
    }

    if (!registryLoading) {
      resetState();
      return;
    }

    if (registryLoading.isLoading) {
      startLoading(registryLoading);
    } else {
      stopLoading();
    }
  }, [registryLoading, resetState, startLoading, stopLoading]);

  const stateValue = useMemo<LoadingStateWithPage>(
    () => ({
      ...loadingState,
      isPageLoading: loadingState.isLoading,
    }),
    [loadingState],
  );

  const actionsValue = useMemo<LoadingActions>(
    () => ({
      hideLoading: stopLoading,
      setIsLoading: setLoading,
      setLoading,
      setSkeleton,
      showLoading: startLoading,
      startLoading,
      stopLoading,
    }),
    [setLoading, setSkeleton, startLoading, stopLoading],
  );

  return (
    <LoadingActionsContext value={actionsValue}>
      <LoadingStateContext value={stateValue}>{children}</LoadingStateContext>
    </LoadingActionsContext>
  );
}

export function useLoadingState(): LoadingStateWithPage {
  const context = use(LoadingStateContext);
  if (!context) {
    throw new Error("useLoadingState must be within LoadingProvider");
  }
  return context;
}

export function useLoadingActions(): LoadingActions {
  const context = use(LoadingActionsContext);
  if (!context) {
    throw new Error("useLoadingActions must be within LoadingProvider");
  }
  return context;
}
