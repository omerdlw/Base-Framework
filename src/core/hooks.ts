"use client";

import {
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type Context,
  type RefObject,
} from "react";
import {
  EVENT_TYPES,
  globalEvents,
  type FrameworkEventMap,
} from "@/core/events";
import { err as resultErr, isErr, isResult, type Result } from "@/core/result";
import { isBrowser, type ExternalStore } from "./utils";

export function useRequiredContext<T>(
  context: Context<T | null>,
  hookName: string,
  providerName: string,
): T {
  const value = use(context);
  if (value === null) {
    throw new Error(`${hookName} must be used within ${providerName}`);
  }
  return value;
}

export function useStore<TState, TSlice = TState>(
  store: ExternalStore<TState>,
  selector: (state: TState) => TSlice = (state: TState) =>
    state as unknown as TSlice,
  isEqual: (a: TSlice, b: TSlice) => boolean = Object.is,
): TSlice {
  const cacheRef = useRef<{
    isEqual: ((a: TSlice, b: TSlice) => boolean) | null;
    selected: TSlice | undefined;
    selector: ((state: TState) => TSlice) | null;
    snapshot: TState | null;
  }>({
    isEqual: null,
    selected: undefined,
    selector: null,
    snapshot: null,
  });

  const getSelectedSnapshot = useCallback(() => {
    const snapshot = store.getSnapshot();
    const cache = cacheRef.current;
    if (
      cache.snapshot === snapshot &&
      cache.selector === selector &&
      cache.isEqual === isEqual
    ) {
      return cache.selected as TSlice;
    }

    const selected = selector(snapshot);
    if (
      cache.snapshot !== null &&
      cache.isEqual === isEqual &&
      isEqual(cache.selected as TSlice, selected)
    ) {
      cache.snapshot = snapshot;
      cache.selector = selector;
      return cache.selected as TSlice;
    }

    cacheRef.current = {
      isEqual,
      selected,
      selector,
      snapshot,
    };
    return selected;
  }, [isEqual, selector, store]);

  return useSyncExternalStore(
    store.subscribe,
    getSelectedSnapshot,
    getSelectedSnapshot,
  );
}

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

export function useMediaQuery(
  query: string,
  serverFallback: boolean = false,
): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!isBrowser || !query || typeof window.matchMedia !== "function") {
        return () => {};
      }
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onStoreChange);
      return () => mediaQueryList.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (!isBrowser || !query || typeof window.matchMedia !== "function") {
      return serverFallback;
    }
    return window.matchMedia(query).matches;
  }, [query, serverFallback]);

  const getServerSnapshot = useCallback(
    () => serverFallback,
    [serverFallback],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export interface UseControllableStateOptions<T> {
  defaultValue: T;
  onChange?: (nextValue: T) => void;
  value?: T;
}

export function useControllableState<T>({
  defaultValue,
  onChange,
  value,
}: UseControllableStateOptions<T>): [
  T,
  (next: T | ((prev: T) => T)) => void,
] {
  const [uncontrolledValue, setUncontrolledValue] = useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? (value as T) : uncontrolledValue;
  const valueRef = useRef<T>(currentValue);
  const onChangeRef = useRef(onChange);

  useIsomorphicLayoutEffect(() => {
    valueRef.current = currentValue;
    onChangeRef.current = onChange;
  });

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolvedNext =
        typeof next === "function"
          ? (next as (prev: T) => T)(valueRef.current)
          : next;
      if (!Object.is(valueRef.current, resolvedNext)) {
        if (!isControlled) {
          setUncontrolledValue(resolvedNext);
        }
        onChangeRef.current?.(resolvedNext);
      }
    },
    [isControlled],
  );

  return [currentValue, setValue];
}

export interface UseHotkeyOptions {
  enabled?: boolean;
  enableOnFormTags?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).tagName !== "string") {
    return false;
  }
  const element = target as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }
  return Boolean(element.isContentEditable);
}

function matchesKeyCombo(event: KeyboardEvent, combo: string): boolean {
  const parts = combo
    .toLowerCase()
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return false;

  const keyPart = parts[parts.length - 1];
  const modifiers = new Set(parts.slice(0, -1));

  const wantsMod = modifiers.has("mod") || modifiers.has("cmd") || modifiers.has("meta");
  const wantsCtrl = modifiers.has("ctrl") || modifiers.has("control");
  const wantsAlt = modifiers.has("alt") || modifiers.has("option");
  const wantsShift = modifiers.has("shift");

  const isModPressed = event.metaKey || event.ctrlKey;
  if (wantsMod && !isModPressed) return false;
  if (!wantsMod && !wantsCtrl && (event.metaKey || event.ctrlKey)) return false;
  if (wantsCtrl && !event.ctrlKey) return false;
  if (wantsAlt !== event.altKey) return false;
  if (wantsShift !== event.shiftKey) return false;

  const pressedKey = event.key.toLowerCase();
  if (keyPart === "esc" || keyPart === "escape") {
    return pressedKey === "escape" || pressedKey === "esc";
  }
  if (keyPart === "space") {
    return pressedKey === " " || pressedKey === "spacebar";
  }
  return pressedKey === keyPart;
}

export function useHotkey(
  combo: string | string[] | null | undefined,
  callback: (event: KeyboardEvent) => void,
  options?: UseHotkeyOptions,
): void {
  const callbackRef = useRef(callback);
  useIsomorphicLayoutEffect(() => {
    callbackRef.current = callback;
  });

  const enabled = options?.enabled ?? true;
  const enableOnFormTags = options?.enableOnFormTags ?? false;
  const preventDefault = options?.preventDefault ?? true;
  const stopPropagation = options?.stopPropagation ?? false;

  useEffect(() => {
    if (!isBrowser || !enabled || !combo) return;
    const combos = (Array.isArray(combo) ? combo : [combo]).filter(Boolean);
    if (combos.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enableOnFormTags && isEditableElement(event.target)) return;
      const matched = combos.some((c) => matchesKeyCombo(event, c));
      if (!matched) return;
      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();
      callbackRef.current?.(event);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [combo, enabled, enableOnFormTags, preventDefault, stopPropagation]);
}

export function useEscapeKey(
  callback: (event: KeyboardEvent) => void,
  enabled: boolean = true,
): void {
  useHotkey("escape", callback, {
    enabled,
    enableOnFormTags: true,
    preventDefault: false,
  });
}


export interface UseGlobalEventOptions {
  debounceMs?: number;
  throttleMs?: number;
}

export function useGlobalEvent<K extends keyof FrameworkEventMap>(
  event: K | K[] | null | undefined,
  callback: (payload: FrameworkEventMap[K]) => void,
  options?: UseGlobalEventOptions,
): void;
export function useGlobalEvent<T = unknown>(
  event: string | string[] | null | undefined,
  callback: (payload: T) => void,
  options?: UseGlobalEventOptions,
): void;
export function useGlobalEvent(
  event: string | string[] | null | undefined,
  callback: (payload: any) => void,
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

    const handler = (payload: any) => {
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

    const unsubs = events.map((ev) => globalEvents.subscribe(ev, handler));

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

export function useEventState<T, K extends keyof FrameworkEventMap>(
  event: K | null | undefined,
  initialValue: T,
  reducer: (prevState: T, payload: FrameworkEventMap[K]) => T,
): T;
export function useEventState<T, P = unknown>(
  event: string | null | undefined,
  initialValue: T,
  reducer: (prevState: T, payload: P) => T,
): T;
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

export type ActionToastOption =
  | boolean
  | ((msg: string) => void)
  | null;

export interface UseAsyncActionOptions<TResult = any> {
  errorMessage?: string | null;
  onError?: ((err: unknown) => void | Promise<void>) | null;
  onSuccess?: ((result: TResult) => void | Promise<void>) | null;
  successMessage?: string | null;
  toast?: ActionToastOption;
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

        if (isResult(result) && isErr(result)) {
          setError(result.error);
          const resolvedMessage =
            errorMessage ||
            (typeof result.error === "string"
              ? result.error
              : "Operation failed");
          if (typeof toast === "function") {
            toast(resolvedMessage);
          }
          globalEvents.emit(EVENT_TYPES.APP_ERROR, {
            error: result.error,
            message: resolvedMessage,
            notify: toast === true,
          });
          await onError?.(result.error);
          return result;
        }

        if (successMessage) {
          if (typeof toast === "function") {
            toast(successMessage);
          }
          globalEvents.emit(EVENT_TYPES.STATE_CHANGE, {
            message: successMessage,
            notify: toast === true,
            status: "success",
          });
        }
        await onSuccess?.(result);
        return result;
      } catch (err: any) {
        setError(err);
        const resolvedMessage =
          errorMessage || err?.message || "Operation failed";
        if (typeof toast === "function") {
          toast(resolvedMessage);
        }
        globalEvents.emit(EVENT_TYPES.APP_ERROR, {
          error: err,
          message: resolvedMessage,
          notify: toast === true,
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

export interface UseServerActionOptions<T, E = string> {
  errorMessage?: string | null;
  onError?: ((err: E) => void | Promise<void>) | null;
  onSuccess?: ((data: T) => void | Promise<void>) | null;
  successMessage?: string | null;
  toast?: ActionToastOption;
}

export interface UseServerActionResult<TArgs extends unknown[], T, E = string> {
  data: T | null;
  error: E | null;
  execute: (...args: TArgs) => Promise<Result<T, E>>;
  isPending: boolean;
  reset: () => void;
}

export function useServerAction<
  TArgs extends unknown[] = unknown[],
  T = unknown,
  E = string,
>(
  actionFn: (...args: TArgs) => Promise<Result<T, E>>,
  options: UseServerActionOptions<T, E> = {},
): UseServerActionResult<TArgs, T, E> {
  const {
    errorMessage = null,
    onError = null,
    onSuccess = null,
    successMessage = null,
    toast = null,
  } = options;

  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<E | null>(null);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  const execute = useCallback(
    (...args: TArgs): Promise<Result<T, E>> => {
      return new Promise((resolve) => {
        startTransition(async () => {
          setError(null);
          try {
            const result = await actionFn(...args);
            if (isErr(result)) {
              setError(result.error);
              const resolvedMessage =
                errorMessage ||
                (typeof result.error === "string"
                  ? result.error
                  : "Operation failed");
              if (typeof toast === "function") {
                toast(resolvedMessage);
              }
              globalEvents.emit(EVENT_TYPES.APP_ERROR, {
                error: result.error,
                message: resolvedMessage,
                notify: toast === true,
              });
              await onError?.(result.error);
              resolve(result);
              return;
            }

            setData(result.data);
            if (successMessage) {
              if (typeof toast === "function") {
                toast(successMessage);
              }
              globalEvents.emit(EVENT_TYPES.STATE_CHANGE, {
                message: successMessage,
                notify: toast === true,
                status: "success",
              });
            }
            await onSuccess?.(result.data);
            resolve(result);
          } catch (err: any) {
            const mappedError = (err?.message ||
              "Operation failed") as unknown as E;
            setError(mappedError);
            const resolvedMessage =
              errorMessage || err?.message || "Operation failed";
            if (typeof toast === "function") {
              toast(resolvedMessage);
            }
            globalEvents.emit(EVENT_TYPES.APP_ERROR, {
              error: err,
              message: resolvedMessage,
              notify: toast === true,
            });
            await onError?.(mappedError);
            resolve(resultErr(mappedError));
          }
        });
      });
    },
    [actionFn, errorMessage, onError, onSuccess, successMessage, toast],
  );

  return { data, error, execute, isPending, reset };
}

export interface UseStorageStateOptions<T> {
  deserialize?: (raw: string) => T;
  serialize?: (value: T) => string;
  storage?: "local" | "session";
}

function getStorageInstance(type: "local" | "session"): Storage | null {
  if (!isBrowser) return null;
  try {
    return type === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

const STORAGE_SYNC_EVENT = "base-framework:storage-sync";

export function useStorageState<T>(
  key: string,
  initialValue: T,
  options: UseStorageStateOptions<T> = {},
): [T, (next: T | ((prev: T) => T)) => void, () => void] {
  const storageType = options.storage ?? "local";
  const serialize = options.serialize ?? JSON.stringify;
  const deserialize = options.deserialize ?? JSON.parse;

  const cacheRef = useRef<{ parsed: T; raw: string | null }>({
    parsed: initialValue,
    raw: null,
  });

  const getSnapshot = useCallback((): T => {
    const storage = getStorageInstance(storageType);
    if (!storage) return initialValue;
    try {
      const raw = storage.getItem(key);
      if (raw === null) {
        cacheRef.current = { parsed: initialValue, raw: null };
        return initialValue;
      }
      if (cacheRef.current.raw === raw) {
        return cacheRef.current.parsed;
      }
      const parsed = deserialize(raw);
      cacheRef.current = { parsed, raw };
      return parsed;
    } catch {
      return initialValue;
    }
  }, [deserialize, initialValue, key, storageType]);

  const getServerSnapshot = useCallback((): T => initialValue, [initialValue]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!isBrowser) return () => {};

      const handleStorage = (event: StorageEvent) => {
        if (
          event.key === key &&
          event.storageArea === getStorageInstance(storageType)
        ) {
          onStoreChange();
        }
      };

      const handleCustomSync = (event: Event) => {
        const detail = (
          event as CustomEvent<{ key: string; storageType: string }>
        ).detail;
        if (detail?.key === key && detail?.storageType === storageType) {
          onStoreChange();
        }
      };

      window.addEventListener("storage", handleStorage);
      window.addEventListener(STORAGE_SYNC_EVENT, handleCustomSync);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(STORAGE_SYNC_EVENT, handleCustomSync);
      };
    },
    [key, storageType],
  );

  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const stateRef = useRef<T>(state);

  useIsomorphicLayoutEffect(() => {
    stateRef.current = state;
  });

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolvedNext =
        typeof next === "function"
          ? (next as (prev: T) => T)(stateRef.current)
          : next;
      stateRef.current = resolvedNext;

      const storage = getStorageInstance(storageType);
      if (!storage) return;
      try {
        const raw = serialize(resolvedNext);
        cacheRef.current = { parsed: resolvedNext, raw };
        storage.setItem(key, raw);
        window.dispatchEvent(
          new CustomEvent(STORAGE_SYNC_EVENT, {
            detail: { key, storageType },
          }),
        );
      } catch {
        // Ignore quota or private mode errors
      }
    },
    [key, serialize, storageType],
  );

  const removeValue = useCallback(() => {
    stateRef.current = initialValue;
    cacheRef.current = { parsed: initialValue, raw: null };

    const storage = getStorageInstance(storageType);
    if (!storage) return;
    try {
      storage.removeItem(key);
      window.dispatchEvent(
        new CustomEvent(STORAGE_SYNC_EVENT, {
          detail: { key, storageType },
        }),
      );
    } catch {
      // Ignore storage errors
    }
  }, [initialValue, key, storageType]);

  return [state, setValue, removeValue];
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: Omit<UseStorageStateOptions<T>, "storage">,
): [T, (next: T | ((prev: T) => T)) => void, () => void] {
  return useStorageState(key, initialValue, { ...options, storage: "local" });
}

export function useSessionStorage<T>(
  key: string,
  initialValue: T,
  options?: Omit<UseStorageStateOptions<T>, "storage">,
): [T, (next: T | ((prev: T) => T)) => void, () => void] {
  return useStorageState(key, initialValue, { ...options, storage: "session" });
}

export interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  enabled?: boolean;
  freezeOnceVisible?: boolean;
  onChange?: (entry: IntersectionObserverEntry) => void;
}

export interface UseIntersectionObserverResult {
  entry: IntersectionObserverEntry | null;
  isIntersecting: boolean;
}

export function useIntersectionObserver<T extends Element = Element>(
  targetRef: RefObject<T | null> | null | undefined,
  options: UseIntersectionObserverOptions = {},
): UseIntersectionObserverResult {
  const {
    enabled = true,
    freezeOnceVisible = false,
    onChange,
    root = null,
    rootMargin = "0px",
    threshold = 0,
  } = options;

  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const onChangeRef = useRef(onChange);

  useIsomorphicLayoutEffect(() => {
    onChangeRef.current = onChange;
  });

  const frozen = Boolean(entry?.isIntersecting && freezeOnceVisible);

  useEffect(() => {
    if (
      !isBrowser ||
      !enabled ||
      frozen ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const node = targetRef?.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([nextEntry]) => {
        if (!nextEntry) return;
        setEntry(nextEntry);
        onChangeRef.current?.(nextEntry);
      },
      { root, rootMargin, threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, frozen, root, rootMargin, targetRef, threshold]);

  return {
    entry,
    isIntersecting: Boolean(entry?.isIntersecting),
  };
}
