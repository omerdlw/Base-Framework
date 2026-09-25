export type EventListener<T = unknown> = (payload: T) => void;

export const EVENT_TYPES = Object.freeze({
  API_UNAUTHORIZED: "API_UNAUTHORIZED",
  API_FORBIDDEN: "API_FORBIDDEN",
  API_ERROR: "API_ERROR",
  API_RETRY: "API_RETRY",
  APP_ERROR: "APP_ERROR",
  MODULE_INIT: "MODULE_INIT",
  MODULE_READY: "MODULE_READY",
  MODULE_ERROR: "MODULE_ERROR",
  MODULE_CLEANUP: "MODULE_CLEANUP",
  STATE_CHANGE: "STATE_CHANGE",
  STATUS_SET: "STATUS_SET",
  STATUS_CLEAR: "STATUS_CLEAR",
  REGISTRY_UPDATE: "REGISTRY_UPDATE",
  DOCK_EXPAND: "DOCK_EXPAND",
  DOCK_COLLAPSE: "DOCK_COLLAPSE",
  DOCK_NAVIGATE: "DOCK_NAVIGATE",
  DOCK_NOT_FOUND: "DOCK_NOT_FOUND",
  DOCK_GUARD: "DOCK_GUARD",
  MODAL_OPEN: "MODAL_OPEN",
  MODAL_CLOSE: "MODAL_CLOSE",
  LOADING_START: "LOADING_START",
  LOADING_END: "LOADING_END",
  TRANSITION_START: "TRANSITION_START",
  TRANSITION_END: "TRANSITION_END",
  NOTIFICATION_VISIBILITY_CHANGE: "NOTIFICATION_VISIBILITY_CHANGE",
} as const);

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

/**
 * Extensible event map for Base Framework.
 * Domain modules can augment this interface via:
 * `declare module "@/core/events" { interface FrameworkEventMap { ... } }`
 */
export interface FrameworkEventMap {
  [EVENT_TYPES.API_UNAUTHORIZED]: {
    error?: unknown;
    status?: number;
    [key: string]: unknown;
  };
  [EVENT_TYPES.API_FORBIDDEN]: {
    error?: unknown;
    status?: number;
    [key: string]: unknown;
  };
  [EVENT_TYPES.API_ERROR]: {
    error: unknown;
    message?: string;
    status?: number;
    [key: string]: unknown;
  };
  [EVENT_TYPES.API_RETRY]: {
    attempt?: number;
    delayMs?: number;
    [key: string]: unknown;
  };
  [EVENT_TYPES.APP_ERROR]: {
    error?: unknown;
    message?: string;
    source?: string;
    [key: string]: unknown;
  };
  [EVENT_TYPES.MODULE_INIT]: { module: string; [key: string]: unknown };
  [EVENT_TYPES.MODULE_READY]: { module: string; [key: string]: unknown };
  [EVENT_TYPES.MODULE_ERROR]: {
    error: unknown;
    module: string;
    [key: string]: unknown;
  };
  [EVENT_TYPES.MODULE_CLEANUP]: { module: string; [key: string]: unknown };
  [EVENT_TYPES.STATE_CHANGE]: {
    message?: string;
    status?: "success" | "warning" | "info" | "error" | string;
    [key: string]: unknown;
  };
  [EVENT_TYPES.STATUS_SET]: {
    description?: string;
    title?: string;
    type?: string;
    [key: string]: unknown;
  };
  [EVENT_TYPES.STATUS_CLEAR]: { type?: string; [key: string]: unknown };
  [EVENT_TYPES.REGISTRY_UPDATE]: {
    key?: string;
    type: string;
    [key: string]: unknown;
  };
  [EVENT_TYPES.DOCK_EXPAND]: { cardId?: string; [key: string]: unknown };
  [EVENT_TYPES.DOCK_COLLAPSE]: void | undefined | Record<string, unknown>;
  [EVENT_TYPES.DOCK_NAVIGATE]: { path: string; [key: string]: unknown };
  [EVENT_TYPES.DOCK_NOT_FOUND]: { path: string; [key: string]: unknown };
  [EVENT_TYPES.DOCK_GUARD]: {
    message?: string;
    when?: boolean;
    [key: string]: unknown;
  };
  [EVENT_TYPES.MODAL_OPEN]: {
    modalType: string;
    props?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [EVENT_TYPES.MODAL_CLOSE]: {
    modalType?: string;
    result?: unknown;
    [key: string]: unknown;
  };
  [EVENT_TYPES.LOADING_START]: { message?: string; [key: string]: unknown };
  [EVENT_TYPES.LOADING_END]: void | undefined | Record<string, unknown>;
  [EVENT_TYPES.TRANSITION_START]: {
    from?: string;
    to?: string;
    [key: string]: unknown;
  };
  [EVENT_TYPES.TRANSITION_END]: {
    from?: string;
    to?: string;
    [key: string]: unknown;
  };
  [EVENT_TYPES.NOTIFICATION_VISIBILITY_CHANGE]: {
    count: number;
    visible: boolean;
    [key: string]: unknown;
  };
}

export class EventEmitter<
  TEvents extends Record<string, any> = FrameworkEventMap,
> {
  private events: Map<string, Set<EventListener<any>>> = new Map();
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> =
    new Map();

  subscribe<K extends keyof TEvents>(
    event: K,
    callback: EventListener<TEvents[K]>,
  ): () => void;
  subscribe<T = unknown>(event: string, callback: EventListener<T>): () => void;
  subscribe(event: string, callback: EventListener<any>): () => void {
    if (typeof event !== "string" || !event || typeof callback !== "function") {
      return () => {};
    }
    const listeners = this.events.get(event) || new Set<EventListener<any>>();
    listeners.add(callback);
    this.events.set(event, listeners);

    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) this.events.delete(event);
    };
  }

  emit<K extends keyof TEvents>(
    event: K,
    ...args: TEvents[K] extends void | undefined
      ? [payload?: TEvents[K]]
      : [payload: TEvents[K]]
  ): void;
  emit<T = unknown>(event: string, payload?: T): void;
  emit(event: string, payload?: any): void {
    const listeners = this.events.get(event);
    if (!listeners || listeners.size === 0) return;
    const snapshot = Array.from(listeners);
    for (const callback of snapshot) {
      try {
        callback(payload);
      } catch (error) {
        console.error(`[Events] Listener failed for ${event}`, error);
      }
    }
  }

  emitDebounced<K extends keyof TEvents>(
    event: K,
    payload: TEvents[K],
    waitMs?: number,
  ): void;
  emitDebounced<T = unknown>(event: string, payload?: T, waitMs?: number): void;
  emitDebounced(event: string, payload?: any, waitMs: number = 100): void {
    const existing = this.debounceTimers.get(event);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.debounceTimers.delete(event);
      this.emit(event, payload);
    }, waitMs);

    this.debounceTimers.set(event, timer);
  }

  cancelDebounced(event?: string): void {
    if (event) {
      const timer = this.debounceTimers.get(event);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(event);
      }
    } else {
      for (const timer of this.debounceTimers.values()) {
        clearTimeout(timer);
      }
      this.debounceTimers.clear();
    }
  }

  unsubscribeAll(event?: string): void {
    this.cancelDebounced(event);
    if (event) this.events.delete(event);
    else this.events.clear();
  }

  hasListeners(event: string): boolean {
    return Boolean(this.events.get(event)?.size);
  }

  getListenerCount(event: string): number {
    return this.events.get(event)?.size || 0;
  }

  getAllEvents(): string[] {
    return [...this.events.keys()];
  }
}

const GLOBAL_EVENTS_KEY = Symbol.for("__base_framework_global_events__");
type GlobalWithEvents = typeof globalThis & {
  [GLOBAL_EVENTS_KEY]?: EventEmitter<FrameworkEventMap>;
};

const _global = globalThis as GlobalWithEvents;
export const globalEvents: EventEmitter<FrameworkEventMap> =
  _global[GLOBAL_EVENTS_KEY] ??
  (_global[GLOBAL_EVENTS_KEY] = new EventEmitter<FrameworkEventMap>());
