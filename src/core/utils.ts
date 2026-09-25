import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const isBrowser: boolean = typeof window !== "undefined";

export function getSiteUrl(): string {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  );
}

export function getCurrentPath(): string {
  if (!isBrowser) return "/";
  return `${window.location.pathname}${window.location.search}`;
}

export function trimToNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function stripTrailingSlash(url: unknown): string {
  if (typeof url !== "string") return "";
  return url.replace(/\/+$/, "");
}

export function normalizePath(path: unknown): string {
  const trimmed = trimToNull(path);
  if (!trimmed) return "";
  if (trimmed === "/") return "/";
  return stripTrailingSlash(trimmed);
}

export function isImageIconSource(icon: unknown): boolean {
  return (
    typeof icon === "string" &&
    (icon.startsWith("http://") ||
      icon.startsWith("https://") ||
      icon.startsWith("/") ||
      icon.startsWith("data:image/"))
  );
}

export function clamp(value: unknown, min: number, max: number): number {
  const num = Number(value);
  const finite = Number.isFinite(num) ? num : min;
  return Math.min(Math.max(finite, min), max);
}

export function toFiniteNumber(value: unknown, fallback: number = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function randomBetween(min: number, max: number): number {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

export function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isPlainObject(value: unknown): value is Record<string, any> {
  if (!isObject(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" || Array.isArray(value))
    return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  return false;
}

export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  ) {
    return false;
  }

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !Object.is((a as any)[key], (b as any)[key])
    ) {
      return false;
    }
  }

  return true;
}

export function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function dedupe<T>(
  array: T[],
  keyFn: ((item: T) => unknown) | null = null,
): T[] {
  if (!Array.isArray(array)) return [];
  if (!keyFn) return [...new Set(array)];
  const seen = new Set();
  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function truncate(
  text: unknown,
  maxLength: number = 100,
  suffix: string = "...",
): string {
  if (typeof text !== "string") return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}${suffix}`;
}

export function capitalize(str: unknown): string {
  if (typeof str !== "string" || !str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(str: unknown): string {
  if (typeof str !== "string" || !str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sleep(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number = 300,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  function debounced(...args: Parameters<T>): void {
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      func(...args);
    }, wait);
  }
  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  return debounced;
}

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number = 300,
): (...args: Parameters<T>) => void {
  let lastRan = 0;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  return function throttled(...args: Parameters<T>): void {
    const now = Date.now();
    if (now - lastRan >= limit) {
      lastRan = now;
      func(...args);
    } else if (!timerId) {
      timerId = setTimeout(
        () => {
          lastRan = Date.now();
          timerId = null;
          func(...args);
        },
        limit - (now - lastRan),
      );
    }
  };
}

export function safeJsonParse<T = unknown>(
  text: unknown,
  fallback: T | null = null,
): T | null {
  if (typeof text !== "string") return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function safeJsonStringify(
  value: unknown,
  fallback: string = "",
): string {
  try {
    return JSON.stringify(value) ?? fallback;
  } catch {
    return fallback;
  }
}

export interface ExternalStore<TState = any> {
  readonly getSnapshot: () => TState;
  readonly publish: (
    nextState: TState | ((currentState: TState) => TState),
  ) => boolean;
  readonly setState: (
    updater: Partial<TState> | ((currentState: TState) => TState),
  ) => boolean;
  readonly subscribe: (listener: () => void) => () => void;
}

export function createStore<TState = Record<string, any>>(
  initialState: TState,
): ExternalStore<TState> {
  const listeners = new Set<() => void>();
  let snapshot = initialState;

  const publish = (
    nextStateOrUpdater: TState | ((currentState: TState) => TState),
  ): boolean => {
    const nextState =
      typeof nextStateOrUpdater === "function"
        ? (nextStateOrUpdater as (currentState: TState) => TState)(snapshot)
        : nextStateOrUpdater;
    if (Object.is(snapshot, nextState)) return false;
    snapshot = nextState;

    for (const listener of listeners) {
      try {
        listener();
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[CoreStore] Subscriber failed:", error);
        }
      }
    }
    return true;
  };

  const setState = (
    updater: Partial<TState> | ((currentState: TState) => TState),
  ): boolean => {
    if (typeof updater === "function") {
      return publish(updater as (currentState: TState) => TState);
    }
    if (
      snapshot &&
      typeof snapshot === "object" &&
      updater &&
      typeof updater === "object"
    ) {
      return publish({ ...snapshot, ...updater });
    }
    return publish(updater as TState);
  };

  return Object.freeze({
    getSnapshot() {
      return snapshot;
    },
    publish,
    setState,
    subscribe(listener: () => void) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}

const DEFAULT_SCHEDULER_FRAME_MS = 16;
const EMPTY_SCHEDULER_TASKS: readonly ScheduledTaskSnapshot[] = Object.freeze(
  [],
);

function getDefaultSchedulerNow(): number {
  return typeof performance !== "undefined" &&
    typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

export interface ScheduledTaskSnapshot {
  readonly createdAt: number;
  readonly dueAt: number;
  readonly id: number;
  readonly kind: "timer" | "frame";
  readonly label: string;
}

export interface SchedulerSnapshot {
  readonly pendingCount: number;
  readonly tasks: readonly ScheduledTaskSnapshot[];
}

export interface CoreSchedulerOptions {
  cancelFrame?: (id: any) => void;
  clearTimer?: (id: any) => void;
  defaultLabel?: string;
  now?: () => number;
  requestFrame?: (cb: (time: number) => void) => any;
  scheduleTimer?: (cb: () => void, delayMs?: number) => any;
}

export function createScheduler({
  cancelFrame = typeof window !== "undefined" &&
  typeof window.cancelAnimationFrame === "function"
    ? (id: number) => window.cancelAnimationFrame(id)
    : (id: any) => clearTimeout(id),
  clearTimer = (id: any) => clearTimeout(id),
  defaultLabel = "scheduled-task",
  now = getDefaultSchedulerNow,
  requestFrame = typeof window !== "undefined" &&
  typeof window.requestAnimationFrame === "function"
    ? (cb: FrameRequestCallback) => window.requestAnimationFrame(cb)
    : (cb: FrameRequestCallback) =>
        setTimeout(cb, DEFAULT_SCHEDULER_FRAME_MS) as unknown as number,
  scheduleTimer = (cb: () => void, delayMs?: number) => setTimeout(cb, delayMs),
}: CoreSchedulerOptions = {}) {
  const listeners = new Set<() => void>();
  const tasks = new Map<
    number,
    {
      cancel: (id: any) => void;
      createdAt: number;
      dueAt: number;
      id: number;
      kind: "timer" | "frame";
      label: string;
      nativeId: any;
    }
  >();
  let nextTaskId = 0;
  let snapshot: SchedulerSnapshot = {
    pendingCount: 0,
    tasks: EMPTY_SCHEDULER_TASKS,
  };

  const publish = () => {
    const currentTasks: ScheduledTaskSnapshot[] = [];
    for (const task of tasks.values()) {
      currentTasks.push({
        createdAt: task.createdAt,
        dueAt: task.dueAt,
        id: task.id,
        kind: task.kind,
        label: task.label,
      });
    }

    snapshot = {
      pendingCount: tasks.size,
      tasks: currentTasks,
    };

    for (const listener of listeners) {
      try {
        listener();
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Scheduler] Subscriber failed:", error);
        }
      }
    }
  };

  const scheduleInternal = (
    kind: "timer" | "frame",
    callback: (timestamp: number) => void,
    delayMs: number,
    options: { label?: string } = {},
  ): number | null => {
    if (typeof callback !== "function") return null;

    const safeDelay = Math.max(0, Number(delayMs) || 0);
    const taskId = ++nextTaskId;
    const createdAt = now();

    const invoke = (timestamp = now()) => {
      if (!tasks.has(taskId)) return;
      tasks.delete(taskId);
      publish();
      callback(timestamp);
    };

    const nativeId =
      kind === "frame"
        ? requestFrame(invoke)
        : scheduleTimer(invoke, safeDelay);

    tasks.set(taskId, {
      cancel: kind === "frame" ? cancelFrame : clearTimer,
      createdAt,
      dueAt:
        createdAt + (kind === "frame" ? DEFAULT_SCHEDULER_FRAME_MS : safeDelay),
      id: taskId,
      kind,
      label:
        typeof options.label === "string" && options.label
          ? options.label
          : defaultLabel,
      nativeId,
    });

    publish();
    return taskId;
  };

  const cancel = (taskId: number): boolean => {
    const task = tasks.get(taskId);
    if (!task) return false;

    tasks.delete(taskId);
    try {
      task.cancel(task.nativeId);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Scheduler] Cancellation failed:", error);
      }
    }

    publish();
    return true;
  };

  return Object.freeze({
    cancel,
    cancelAll(): number[] {
      if (tasks.size === 0) return [];

      const taskIds: number[] = [];
      for (const [taskId, task] of tasks) {
        taskIds.push(taskId);
        try {
          task.cancel(task.nativeId);
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[Scheduler] Cancellation failed:", error);
          }
        }
      }

      tasks.clear();
      publish();
      return taskIds;
    },
    getSnapshot(): SchedulerSnapshot {
      return snapshot;
    },
    now,
    schedule(
      callback: (timestamp: number) => void,
      delayMs = 0,
      options: { label?: string } = {},
    ): number | null {
      return scheduleInternal("timer", callback, delayMs, options);
    },
    scheduleFrame(
      callback: (timestamp: number) => void,
      options: { label?: string } = {},
    ): number | null {
      return scheduleInternal(
        "frame",
        callback,
        DEFAULT_SCHEDULER_FRAME_MS,
        options,
      );
    },
    subscribe(listener: () => void): () => void {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}
