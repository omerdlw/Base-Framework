"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRequiredContext } from "@/core/hooks";
import {
  useLoadingRegistration,
  useLoadingValue,
} from "@/core/orchestration";

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

interface LoadingContextValue {
  actions: LoadingActions;
  state: LoadingStateWithPage;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [manualState, setManualState] = useState<LoadingState>(
    DEFAULT_LOADING_STATE,
  );

  const startTimeRef = useRef<number | null>(null);
  const minDurationRef = useRef<number>(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setManualState(DEFAULT_LOADING_STATE);
  }, [clearStopTimer]);

  const startLoading = useCallback(
    (options: LoadingOptions = {}) => {
      clearStopTimer();
      const nextState = normalizeLoadingOptions(options);
      startTimeRef.current = Date.now();
      minDurationRef.current = nextState.minDuration;
      setManualState({
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
    setManualState((currentState) => {
      const skeleton =
        typeof nextSkeleton === "function"
          ? nextSkeleton(currentState.skeleton)
          : nextSkeleton;

      return currentState.skeleton === skeleton
        ? currentState
        : { ...currentState, skeleton };
    });
  }, []);

  const withLoading = useCallback(
    async <T,>(
      task: Promise<T> | (() => Promise<T>),
      options: LoadingOptions | string = {},
    ): Promise<T> => {
      const normalizedOpts =
        typeof options === "string" ? { message: options } : options;
      startLoading(normalizedOpts);
      try {
        return typeof task === "function" ? await task() : await task;
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading],
  );

  useEffect(() => {
    return () => clearStopTimer();
  }, [clearStopTimer]);

  const state = useMemo<LoadingStateWithPage>(() => {
    if (registryLoading?.isLoading) {
      const normalized = normalizeLoadingOptions(registryLoading);
      return {
        ...normalized,
        isLoading: true,
        isPageLoading: true,
      };
    }
    return {
      ...manualState,
      isPageLoading: manualState.isLoading,
    };
  }, [manualState, registryLoading]);

  const actions = useMemo<LoadingActions>(
    () => ({
      setLoading,
      setSkeleton,
      startLoading,
      stopLoading,
      withLoading,
    }),
    [setLoading, setSkeleton, startLoading, stopLoading, withLoading],
  );

  const value = useMemo<LoadingContextValue>(
    () => ({ actions, state }),
    [actions, state],
  );

  return <LoadingContext value={value}>{children}</LoadingContext>;
}

export function useLoadingState(): LoadingStateWithPage {
  return useRequiredContext(
    LoadingContext,
    "useLoadingState",
    "LoadingProvider",
  ).state;
}

export function useLoadingActions(): LoadingActions {
  return useRequiredContext(
    LoadingContext,
    "useLoadingActions",
    "LoadingProvider",
  ).actions;
}

export function useLoading(
  config?: boolean | string | LoadingOptions | null,
  options?: Record<string, unknown>,
): LoadingStateWithPage & LoadingActions {
  const normalizedConfig = useMemo(() => {
    if (config === undefined || config === null) return null;
    if (typeof config === "boolean") return { isLoading: config };
    if (typeof config === "string") return { isLoading: true, message: config };
    return config;
  }, [config]);

  useLoadingRegistration(normalizedConfig, options);

  const { actions, state } = useRequiredContext(
    LoadingContext,
    "useLoading",
    "LoadingProvider",
  );

  return useMemo(() => ({ ...state, ...actions }), [actions, state]);
}

