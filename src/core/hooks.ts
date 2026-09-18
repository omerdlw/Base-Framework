"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { EVENT_TYPES, globalEvents } from "@/core/events";
import { isBrowser } from "./utils";

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null> | null | undefined,
  callback?: (event: PointerEvent) => void,
): void {
  const handlePointer = useCallback(
    (event: PointerEvent) => {
      if (ref?.current && !ref.current.contains(event.target as Node)) {
        callback?.(event);
      }
    },
    [callback, ref],
  );

  useEffect(() => {
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [handlePointer]);
}

export const useIsomorphicLayoutEffect = isBrowser
  ? useLayoutEffect
  : useEffect;

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

const emptySubscribe = () => () => {};

export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export interface UseGlobalEventOptions {
  debounceMs?: number;
  throttleMs?: number;
}

export function useGlobalEvent<T = any>(
  event: string | string[] | null | undefined,
  callback: (payload: T) => void,
  options?: UseGlobalEventOptions,
): void {
  const callbackRef = useRef(callback);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastThrottleTimeRef = useRef<number>(0);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useIsomorphicLayoutEffect(() => {
    callbackRef.current = callback;
  });

  const debounceMs = options?.debounceMs;
  const throttleMs = options?.throttleMs;

  useEffect(() => {
    if (!event) return;
    const events = Array.isArray(event) ? event.filter(Boolean) : [event];
    if (events.length === 0) return;

    const handler = (payload: T) => {
      if (debounceMs != null && debounceMs > 0) {
        if (debounceTimerRef.current !== null) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          debounceTimerRef.current = null;
          callbackRef.current?.(payload);
        }, debounceMs);
        return;
      }

      if (throttleMs != null && throttleMs > 0) {
        const now = Date.now();
        const remaining = throttleMs - (now - lastThrottleTimeRef.current);
        if (remaining <= 0) {
          if (throttleTimerRef.current !== null) {
            clearTimeout(throttleTimerRef.current);
            throttleTimerRef.current = null;
          }
          lastThrottleTimeRef.current = now;
          callbackRef.current?.(payload);
        } else if (throttleTimerRef.current === null) {
          throttleTimerRef.current = setTimeout(() => {
            lastThrottleTimeRef.current = Date.now();
            throttleTimerRef.current = null;
            callbackRef.current?.(payload);
          }, remaining);
        }
        return;
      }

      callbackRef.current?.(payload);
    };

    const unsubs = events.map((ev) => globalEvents.subscribe<T>(ev, handler));

    return () => {
      unsubs.forEach((unsub) => unsub());
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (throttleTimerRef.current !== null) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, [event, debounceMs, throttleMs]);
}

/**
 * A concurrent-safe hook that subscribes to a global event and derives state.
 * Uses useSyncExternalStore internally to eliminate tearing during concurrent transitions.
 */
export function useEventState<T, P = any>(
  event: string | null | undefined,
  initialValue: T,
  reducer: (prevState: T, payload: P) => T,
): T {
  const storeRef = useRef<{
    value: T;
    listeners: Set<() => void>;
    reducer: (prevState: T, payload: P) => T;
  } | null>(null);

  if (storeRef.current == null) {
    storeRef.current = {
      value: initialValue,
      listeners: new Set(),
      reducer,
    };
  }

  useIsomorphicLayoutEffect(() => {
    if (storeRef.current != null) {
      storeRef.current.reducer = reducer;
    }
  });

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!event || !storeRef.current) return () => {};
      storeRef.current.listeners.add(onStoreChange);

      const unsub = globalEvents.subscribe<P>(event, (payload) => {
        if (!storeRef.current) return;
        const next = storeRef.current.reducer(storeRef.current.value, payload);
        if (!Object.is(storeRef.current.value, next)) {
          storeRef.current.value = next;
          storeRef.current.listeners.forEach((listener) => listener());
        }
      });

      return () => {
        storeRef.current?.listeners.delete(onStoreChange);
        unsub();
      };
    },
    [event],
  );

  const getSnapshot = useCallback(() => {
    return storeRef.current?.value ?? initialValue;
  }, [initialValue]);

  const getServerSnapshot = useCallback(() => {
    return initialValue;
  }, [initialValue]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export interface UseAsyncActionOptions<TResult = any> {
  errorMessage?: string | null;
  onError?: ((err: unknown) => void | Promise<void>) | null;
  onSuccess?: ((result: TResult) => void | Promise<void>) | null;
  successMessage?: string | null;
  toast?: {
    error?: (msg: string) => void;
    success?: (msg: string) => void;
  } | null;
}

export interface UseAsyncActionResult<TArgs extends any[], TResult> {
  error: unknown;
  execute: (...args: TArgs) => Promise<TResult>;
  isPending: boolean;
}

export function useAsyncAction<TArgs extends any[] = any[], TResult = any>(
  actionFn: (...args: TArgs) => Promise<TResult>,
  options: UseAsyncActionOptions<TResult> = {},
): UseAsyncActionResult<TArgs, TResult> {
  const {
    errorMessage = null,
    onError = null,
    onSuccess = null,
    successMessage = null,
    toast = null,
  } = options;

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult> => {
      setIsPending(true);
      setError(null);
      try {
        const result = await actionFn(...args);
        if (successMessage) {
          if (toast?.success) toast.success(successMessage);
          globalEvents.emit(EVENT_TYPES.STATE_CHANGE, {
            message: successMessage,
            status: "success",
          });
        }
        await onSuccess?.(result);
        return result;
      } catch (err: any) {
        setError(err);
        const resolvedMessage =
          errorMessage || err?.message || "Operation failed";
        if (toast?.error) toast.error(resolvedMessage);
        globalEvents.emit(EVENT_TYPES.APP_ERROR, {
          error: err,
          message: resolvedMessage,
        });
        await onError?.(err);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [actionFn, errorMessage, onError, onSuccess, successMessage, toast],
  );

  return { error, execute, isPending };
}
