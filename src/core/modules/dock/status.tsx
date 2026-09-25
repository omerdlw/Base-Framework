"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ACTION_TONE_CLASS } from "@/core/tokens";
import { EVENT_TYPES, globalEvents } from "@/core/events";
import { cn } from "@/core/utils";
import { Spinner } from "@/core/primitives/spinner";
import { Button, Icon } from "@/core/primitives";

import {
  API_ERROR_BATCH_DELAY,
  ERROR_STATUS_TYPES,
  DOCK_ACTION_STYLES,
  OVERLAY_STATUS_CLEAR_DURATION,
  OVERLAY_STATUS_STORAGE_KEY,
  SURFACE_CLASSES,
  STATUS_CLEAR_DURATION,
  STATUS_PRIORITY,
} from "./constants";
import {
  getDockActionClass,
  normalizeLower,
  normalizeUpper,
} from "./utils";
import { DOCK_FADE_TRANSITION, textCrossfadeVariants } from "./motion";

export { normalizeLower, normalizeUpper };

let cachedSessionStorage: Storage | null | undefined;

function readSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  if (cachedSessionStorage !== undefined) return cachedSessionStorage;

  try {
    const storage = window.sessionStorage;
    if (!storage) {
      cachedSessionStorage = null;
      return null;
    }

    const probeKey = "__bf_storage_probe__";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    cachedSessionStorage = storage;
    return storage;
  } catch {
    cachedSessionStorage = null;
    return null;
  }
}

function clearPersistedOverlayStatus(): void {
  try {
    readSessionStorage()?.removeItem(OVERLAY_STATUS_STORAGE_KEY);
  } catch {}
}

function persistOverlayStatus(status: any, duration: number): void {
  const storage = readSessionStorage();
  if (!isPersistableOverlayStatus(status) || !storage) return;
  try {
    storage.setItem(
      OVERLAY_STATUS_STORAGE_KEY,
      JSON.stringify({
        description: status.description || "",
        expiresAt: Date.now() + Math.max(0, Number(duration) || 0),
        flow: status.flow || null,
        icon: typeof status.icon === "string" ? status.icon : null,
        priority: resolveStatusPriority(status),
        title: status.title || "",
        type: status.type,
      }),
    );
  } catch {}
}

function restorePersistedOverlayStatus(): {
  remainingMs: number;
  status: any;
} | null {
  const storage = readSessionStorage();
  if (!storage) return null;
  try {
    const rawValue = storage.getItem(OVERLAY_STATUS_STORAGE_KEY);
    if (!rawValue) return null;

    const payload = JSON.parse(rawValue);
    const type = normalizeUpper(payload?.type);
    const expiresAt = Number(payload?.expiresAt || 0);

    if (
      !type ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      clearPersistedOverlayStatus();
      return null;
    }

    return {
      remainingMs: expiresAt - Date.now(),
      status: createOverlayStatus({
        type,
        flow: payload?.flow || null,
        priority: Number.isFinite(Number(payload?.priority))
          ? Number(payload.priority)
          : null,
        title: payload?.title || "Status",
        description: payload?.description || "",
        icon: payload?.icon || null,
        style: getStatusTheme(type),
      }),
    };
  } catch {
    clearPersistedOverlayStatus();
    return null;
  }
}

function isErrorStatus(type: string): boolean {
  return ERROR_STATUS_TYPES.has(type);
}

function getStatusPriority(type: string): number {
  return STATUS_PRIORITY[type] ?? 0;
}

function resolveStatusPriority(status: any): number {
  if (!status) return 0;
  const explicitPriority = Number(status.priority);
  return Number.isFinite(explicitPriority)
    ? explicitPriority
    : getStatusPriority(status.type);
}

export function getStatusTheme(_type?: string) {
  return {
    card: { className: SURFACE_CLASSES.surface },
    icon: { className: SURFACE_CLASSES.icon },
    title: { className: SURFACE_CLASSES.title },
    description: { className: SURFACE_CLASSES.description, opacity: 1 },
  };
}

function isPersistableOverlayStatus(status: any): boolean {
  return (
    Boolean(status) &&
    Boolean(status.type) &&
    !isErrorStatus(status.type) &&
    (typeof status.icon === "string" || status.icon == null)
  );
}

function isEquivalentOverlayStatus(
  currentStatus: any,
  nextStatus: any,
): boolean {
  return (
    Boolean(currentStatus) &&
    Boolean(nextStatus?.type) &&
    currentStatus.type === nextStatus.type &&
    currentStatus.flow === nextStatus.flow &&
    currentStatus.title === nextStatus.title &&
    currentStatus.description === nextStatus.description &&
    currentStatus.icon === nextStatus.icon &&
    currentStatus.isOverlay === nextStatus.isOverlay
  );
}

function createOverlayStatus({
  type,
  title,
  description,
  icon,
  style,
  isOverlay = true,
  action = null,
  actions = null,
  flow = null,
  priority = null,
}: {
  type: string;
  title: string;
  description: string;
  icon?: any;
  style?: any;
  isOverlay?: boolean;
  action?: any;
  actions?: any;
  flow?: string | null;
  priority?: number | null;
}) {
  return {
    type,
    flow,
    isOverlay,
    priority,
    title,
    description,
    icon,
    style,
    action,
    actions,
    hideScroll: true,
  };
}

export function ErrorActions({
  onRetry,
  onRefresh,
  retryLabel = "Retry",
  refreshLabel = "Refresh",
  retryText,
  refreshText,
  className = "",
}: {
  onRetry?: () => void;
  onRefresh?: () => void;
  retryLabel?: string;
  refreshLabel?: string;
  retryText?: string;
  refreshText?: string;
  className?: string;
}) {
  const effectiveRetry = retryLabel || retryText || "Retry";
  const effectiveRefresh = refreshLabel || refreshText || "Refresh";
  return (
    <motion.div
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={DOCK_FADE_TRANSITION}
      className={cn(DOCK_ACTION_STYLES.row, className)}
    >
      <Button
        type="button"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onRefresh?.();
        }}
        className={getDockActionClass({
          variant: DOCK_ACTION_STYLES.muted,
          className: "min-w-0 flex-1 justify-center whitespace-nowrap",
        })}
      >
        <span className="truncate">{effectiveRefresh}</span>
      </Button>
      <Button
        type="button"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onRetry?.();
        }}
        className={getDockActionClass({
          variant: ACTION_TONE_CLASS,
          className: "min-w-0 flex-1 justify-center whitespace-nowrap",
        })}
      >
        <span className="truncate">{effectiveRetry}</span>
      </Button>
    </motion.div>
  );
}
export const ErrorAction = ErrorActions;

export function GuardActions({
  onCancel,
  onConfirm,
  cancelLabel = "Stay",
  confirmLabel = "Leave",
  cancelText,
  confirmText,
  className = "",
}: {
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  cancelText?: string;
  confirmText?: string;
  className?: string;
}) {
  const effectiveCancel = cancelLabel || cancelText || "Stay";
  const effectiveConfirm = confirmLabel || confirmText || "Leave";
  return (
    <motion.div
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={DOCK_FADE_TRANSITION}
      className={cn(DOCK_ACTION_STYLES.row, className)}
    >
      <Button
        type="button"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onCancel?.();
        }}
        className={getDockActionClass({
          variant: DOCK_ACTION_STYLES.muted,
          className: "min-w-0 flex-1 justify-center whitespace-nowrap",
        })}
      >
        <span className="truncate">{effectiveCancel}</span>
      </Button>
      <Button
        type="button"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onConfirm?.();
        }}
        className={getDockActionClass({
          variant: ACTION_TONE_CLASS,
          className: "min-w-0 flex-1 justify-center whitespace-nowrap",
        })}
      >
        <span className="truncate">{effectiveConfirm}</span>
      </Button>
    </motion.div>
  );
}
export const GuardAction = GuardActions;

export function createErrorStatus({
  type,
  title,
  description,
  icon,
  style,
  onRetry,
  clearStatus,
  action,
  errorAction,
  retryLabel,
  refreshLabel,
  retryText,
  refreshText,
}: {
  type: string;
  title: string;
  description: string;
  icon?: any;
  style?: any;
  onRetry?: () => void;
  clearStatus?: () => void;
  action?: any;
  errorAction?: any;
  retryLabel?: string;
  refreshLabel?: string;
  retryText?: string;
  refreshText?: string;
}) {
  const retryHandler =
    typeof onRetry === "function"
      ? () => {
          clearStatus?.();
          onRetry();
        }
      : () => {
          window.location.reload();
        };
  const ActionComponent = action || errorAction || ErrorActions;
  return createOverlayStatus({
    type,
    title,
    description,
    icon,
    style,
    isOverlay: true,
    action: () => (
      <ActionComponent
        onRetry={retryHandler}
        onRefresh={() => window.location.reload()}
        retryLabel={retryLabel}
        refreshLabel={refreshLabel}
        retryText={retryText}
        refreshText={refreshText}
      />
    ),
  });
}

export function createGuardStatus({
  action,
  guardAction,
  title = "Navigation Blocked",
  description = "You have unsaved changes. Are you sure you want to leave?",
  icon = "solar:danger-triangle-bold",
  style,
  onConfirm,
  onCancel,
  cancelLabel,
  confirmLabel,
  cancelText = "Stay",
  confirmText = "Leave",
  clearStatus,
}: {
  action?: any;
  guardAction?: any;
  title?: string;
  description?: string;
  icon?: any;
  style?: any;
  onConfirm?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  cancelText?: string;
  confirmText?: string;
  clearStatus?: () => void;
}) {
  const cancelHandler = () => {
    clearStatus?.();
    onCancel?.();
  };
  const confirmHandler = () => {
    clearStatus?.();
    onConfirm?.();
  };
  const effectiveCancel = cancelLabel || cancelText;
  const effectiveConfirm = confirmLabel || confirmText;
  const GuardActionComponent = action || guardAction || GuardActions;
  return createOverlayStatus({
    type: "GUARD",
    priority: STATUS_PRIORITY.GUARD,
    title,
    description,
    icon,
    style: style || getStatusTheme("GUARD"),
    isOverlay: true,
    action: () => (
      <GuardActionComponent
        onCancel={cancelHandler}
        onConfirm={confirmHandler}
        cancelLabel={effectiveCancel}
        confirmLabel={effectiveConfirm}
        cancelText={effectiveCancel}
        confirmText={effectiveConfirm}
      />
    ),
  });
}

function createConnectionStatus(type: string) {
  if (type === "OFFLINE") {
    return createOverlayStatus({
      type,
      title: "Connection Lost",
      description: "You are currently offline",
      icon: <Icon icon="lucide:wifi-off" size={24} />,
      style: getStatusTheme(type),
    });
  }
  return createOverlayStatus({
    type: "ONLINE",
    title: "Connection Restored",
    description: "You are back online",
    icon: <Icon icon="lucide:wifi" size={24} />,
    style: getStatusTheme("ONLINE"),
    isOverlay: false,
  });
}

function subscribeToApiErrorStatusEvents({
  apiErrorQueueRef,
  batchTimerRef,
  clearStatus,
  clearTimer,
  updateStatus,
}: {
  apiErrorQueueRef: React.MutableRefObject<any[]>;
  batchTimerRef: React.MutableRefObject<any>;
  clearStatus: () => void;
  clearTimer: (ref: React.MutableRefObject<any>) => void;
  updateStatus: (status: any) => void;
}) {
  return globalEvents.subscribe(EVENT_TYPES.API_ERROR, (eventData: any) => {
    const { status: errorStatus, message, isCritical, retry } = eventData || {};
    if (!isCritical) return;

    apiErrorQueueRef.current.push({ status: errorStatus, message, retry });
    clearTimer(batchTimerRef);

    batchTimerRef.current = setTimeout(() => {
      const errors = [...apiErrorQueueRef.current];
      apiErrorQueueRef.current = [];
      if (errors.length === 0) return;

      const isBatch = errors.length > 1;
      const title = isBatch
        ? "Multiple API Errors"
        : `API Error (${errors[0].status || "Network"})`;
      const description = isBatch
        ? `${errors.length} requests failed`
        : errors[0].message || "An error occurred during the request";

      updateStatus(
        createErrorStatus({
          type: "API_ERROR",
          title,
          description,
          icon: "solar:danger-triangle-bold",
          onRetry: () => errors.forEach((e) => e.retry?.()),
          style: getStatusTheme("API_ERROR"),
          clearStatus,
        }),
      );
    }, API_ERROR_BATCH_DELAY);
  });
}

function subscribeToApplicationErrorStatusEvents({
  clearStatus,
  dispatchOfflineEvent,
  updateStatus,
}: {
  clearStatus: () => void;
  dispatchOfflineEvent: () => void;
  updateStatus: (status: any) => void;
}) {
  return globalEvents.subscribe(EVENT_TYPES.APP_ERROR, (eventData: any) => {
    const { message, error, resetError } = eventData || {};
    updateStatus(
      createErrorStatus({
        type: "APP_ERROR",
        title: error?.name || "Application Error",
        description:
          error?.message || message || "An unexpected error occurred",
        icon: "solar:danger-triangle-bold",
        onRetry: resetError
          ? () => {
              resetError();
              if (typeof navigator !== "undefined" && !navigator.onLine)
                dispatchOfflineEvent();
            }
          : undefined,
        style: getStatusTheme("APP_ERROR"),
        clearStatus,
      }),
    );
  });
}

function subscribeToGenericStatusEvents({
  clearTimer,
  scheduleStatusClear,
  setStatus,
  statusClearTimerRef,
  updateStatus,
}: {
  clearTimer: (ref: React.MutableRefObject<any>) => void;
  scheduleStatusClear: (options?: any) => void;
  setStatus: React.Dispatch<React.SetStateAction<any>>;
  statusClearTimerRef: React.MutableRefObject<any>;
  updateStatus: (status: any) => void;
}) {
  const unsubscribeSet = globalEvents.subscribe(
    EVENT_TYPES.STATUS_SET,
    (eventData: any) => {
      if (!eventData) return;
      const type = normalizeUpper(eventData.type || "STATUS");
      const priority = Number.isFinite(Number(eventData.priority))
        ? Number(eventData.priority)
        : null;

      const nextStatus = createOverlayStatus({
        type,
        flow: eventData.flow || null,
        priority,
        title: eventData.title || "",
        description: eventData.description || "",
        icon: eventData.icon ?? null,
        style: eventData.style || getStatusTheme(eventData.themeType || type),
        isOverlay: eventData.isOverlay !== false,
        action: eventData.action || null,
        actions: eventData.actions || null,
      });

      updateStatus(nextStatus);

      const duration =
        Number(eventData.duration) > 0
          ? Number(eventData.duration)
          : eventData.duration === null || eventData.duration === 0
            ? 0
            : OVERLAY_STATUS_CLEAR_DURATION;

      if (duration > 0) {
        scheduleStatusClear({
          duration,
          clearWhen: [type],
        });
        if (eventData.persist !== false) {
          persistOverlayStatus(nextStatus, duration);
        }
      } else {
        clearTimer(statusClearTimerRef);
      }
    },
  );

  const unsubscribeClear = globalEvents.subscribe(
    EVENT_TYPES.STATUS_CLEAR,
    (eventData: any) => {
      clearTimer(statusClearTimerRef);
      clearPersistedOverlayStatus();
      if (!eventData || (!eventData.type && !eventData.flow)) {
        setStatus(null);
        return;
      }
      setStatus((currentStatus: any) => {
        if (!currentStatus) return null;
        if (eventData.flow && currentStatus.flow === eventData.flow) return null;
        if (eventData.type && currentStatus.type === normalizeUpper(eventData.type))
          return null;
        return currentStatus;
      });
    },
  );

  return () => {
    unsubscribeSet();
    unsubscribeClear();
  };
}


function subscribeToNotFoundStatusEvents({
  notFoundActionRef,
  setStatus,
  updateStatus,
}: {
  notFoundActionRef: React.RefObject<ComponentType<any> | null>;
  setStatus: React.Dispatch<React.SetStateAction<any>>;
  updateStatus: (status: any) => void;
}) {
  return globalEvents.subscribe(EVENT_TYPES.DOCK_NOT_FOUND, (eventData: any) => {
    if (eventData?.clear) {
      setStatus((currentStatus: any) =>
        currentStatus?.type === "NOT_FOUND" ? null : currentStatus,
      );
      return;
    }
    const currentNotFoundAction = notFoundActionRef.current;
    updateStatus({
      type: "NOT_FOUND",
      path: "not-found",
      isOverlay: true,
      title: eventData?.title || "404",
      description:
        eventData?.description ||
        "The page you are looking for does not exist or is no longer available",
      icon: eventData?.icon || "solar:forbidden-circle-bold",
      style: getStatusTheme("NOT_FOUND"),
      action: currentNotFoundAction
        ? () => {
            const NotFoundAction = currentNotFoundAction;
            return <NotFoundAction />;
          }
        : null,
      hideScroll: true,
    });
  });
}

function subscribeToGuardStatusEvents({
  clearStatus,
  setStatus,
  updateStatus,
}: {
  clearStatus: () => void;
  setStatus: React.Dispatch<React.SetStateAction<any>>;
  updateStatus: (status: any) => void;
}) {
  return globalEvents.subscribe(EVENT_TYPES.DOCK_GUARD, (eventData: any) => {
    if (eventData?.clear) {
      setStatus((currentStatus: any) =>
        currentStatus?.type === "GUARD" ? null : currentStatus,
      );
      return;
    }
    updateStatus(createGuardStatus({ ...eventData, clearStatus }));
  });
}

function subscribeToConnectionStatusEvents({
  handleOffline,
  handleOnline,
}: {
  handleOffline: () => void;
  handleOnline: () => void;
}) {
  window.addEventListener("offline", handleOffline);
  window.addEventListener("online", handleOnline);
  if (typeof navigator !== "undefined" && !navigator.onLine) handleOffline();

  return () => {
    window.removeEventListener("offline", handleOffline);
    window.removeEventListener("online", handleOnline);
  };
}

function usePersistedOverlayStatusRestoration({
  scheduleStatusClear,
  setStatus,
  skipPersistedStatusCleanupRef,
}: {
  scheduleStatusClear: (options?: any) => void;
  setStatus: React.Dispatch<React.SetStateAction<any>>;
  skipPersistedStatusCleanupRef: React.MutableRefObject<boolean>;
}) {
  useEffect(() => {
    const persistedStatus = restorePersistedOverlayStatus();
    if (!persistedStatus) return;
    skipPersistedStatusCleanupRef.current = true;
    setStatus((currentStatus: any) => currentStatus || persistedStatus.status);
    scheduleStatusClear({
      duration: persistedStatus.remainingMs,
      clearWhen: [persistedStatus.status.type],
    });
  }, [scheduleStatusClear, setStatus, skipPersistedStatusCleanupRef]);
}

function usePersistedOverlayStatusCleanup({
  skipPersistedStatusCleanupRef,
  status,
}: {
  skipPersistedStatusCleanupRef: React.MutableRefObject<boolean>;
  status: any;
}) {
  useEffect(() => {
    if (skipPersistedStatusCleanupRef.current) {
      skipPersistedStatusCleanupRef.current = false;
      return;
    }
    if (!isPersistableOverlayStatus(status)) clearPersistedOverlayStatus();
  }, [status, skipPersistedStatusCleanupRef]);
}

function useRouteErrorStatusCleanup({
  dispatchOfflineEvent,
  pathname,
  previousPathRef,
  setStatus,
}: {
  dispatchOfflineEvent: () => void;
  pathname: string | null;
  previousPathRef: React.MutableRefObject<string | null>;
  setStatus: React.Dispatch<React.SetStateAction<any>>;
}) {
  useEffect(() => {
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;

    setStatus((currentStatus: any) => {
      if (
        currentStatus &&
        isErrorStatus(currentStatus.type) &&
        currentStatus.type !== "ACCOUNT_DELETE"
      ) {
        if (typeof navigator !== "undefined" && !navigator.onLine)
          dispatchOfflineEvent();
        return null;
      }
      return currentStatus;
    });
  }, [pathname, dispatchOfflineEvent, setStatus, previousPathRef]);
}

function useDockStatusTimerCleanup(clearAllTimers: () => void) {
  useEffect(() => () => clearAllTimers(), [clearAllTimers]);
}

export function useDockStatus(
  options: { notFoundAction?: ComponentType<any> | null } = {},
) {
  const pathname = usePathname();
  const notFoundAction = options?.notFoundAction || null;
  const notFoundActionRef = useRef(notFoundAction);
  useEffect(() => {
    notFoundActionRef.current = notFoundAction;
  }, [notFoundAction]);
  const [status, setStatus] = useState<any>(null);

  const previousPathRef = useRef(pathname);
  const apiErrorQueueRef = useRef<any[]>([]);
  const skipPersistedStatusCleanupRef = useRef(false);
  const batchTimerRef = useRef<any>(null);
  const statusClearTimerRef = useRef<any>(null);
  const onlineResetTimerRef = useRef<any>(null);
  const offlineDispatchTimerRef = useRef<any>(null);

  const clearTimer = useCallback((timerRef: React.MutableRefObject<any>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearTransientTimers = useCallback(() => {
    clearTimer(batchTimerRef);
    clearTimer(onlineResetTimerRef);
    clearTimer(offlineDispatchTimerRef);
  }, [clearTimer]);

  const clearAllTimers = useCallback(() => {
    clearTransientTimers();
    clearTimer(statusClearTimerRef);
  }, [clearTimer, clearTransientTimers]);

  const clearStatus = useCallback(() => {
    clearPersistedOverlayStatus();
    setStatus(null);
  }, []);

  const updateStatus = useCallback((nextStatusOrFn: any) => {
    setStatus((currentStatus: any) => {
      const nextStatus =
        typeof nextStatusOrFn === "function"
          ? nextStatusOrFn(currentStatus)
          : nextStatusOrFn;
      if (!nextStatus) return null;
      if (isEquivalentOverlayStatus(currentStatus, nextStatus))
        return currentStatus;
      if (!currentStatus) return nextStatus;
      return resolveStatusPriority(nextStatus) >=
        resolveStatusPriority(currentStatus)
        ? nextStatus
        : currentStatus;
    });
  }, []);

  const scheduleStatusClear = useCallback(
    ({
      duration = STATUS_CLEAR_DURATION,
      clearWhen = [],
    }: { duration?: number; clearWhen?: string[] } = {}) => {
      clearTimer(statusClearTimerRef);
      const clearTypes = Array.isArray(clearWhen)
        ? clearWhen.filter(Boolean)
        : [];

      statusClearTimerRef.current = setTimeout(() => {
        statusClearTimerRef.current = null;
        setStatus((currentStatus: any) => {
          if (!currentStatus) return currentStatus;
          if (
            clearTypes.length === 0 ||
            clearTypes.includes(currentStatus.type)
          ) {
            clearPersistedOverlayStatus();
            return null;
          }
          return currentStatus;
        });
      }, duration);
    },
    [clearTimer],
  );

  const dispatchOfflineEvent = useCallback(() => {
    clearTimer(offlineDispatchTimerRef);
    offlineDispatchTimerRef.current = setTimeout(() => {
      offlineDispatchTimerRef.current = null;
      window.dispatchEvent(new Event("offline"));
    }, 0);
  }, [clearTimer]);

  const handleOffline = useCallback(() => {
    updateStatus(createConnectionStatus("OFFLINE"));
  }, [updateStatus]);

  const handleOnline = useCallback(() => {
    setStatus((currentStatus: any) => {
      if (currentStatus?.type !== "OFFLINE") return null;
      clearTimer(onlineResetTimerRef);
      onlineResetTimerRef.current = setTimeout(() => {
        onlineResetTimerRef.current = null;
        setStatus((nextStatus: any) =>
          nextStatus?.type === "ONLINE" ? null : nextStatus,
        );
      }, STATUS_CLEAR_DURATION);
      return createConnectionStatus("ONLINE");
    });
  }, [clearTimer]);

  usePersistedOverlayStatusRestoration({
    scheduleStatusClear,
    setStatus,
    skipPersistedStatusCleanupRef,
  });
  usePersistedOverlayStatusCleanup({ skipPersistedStatusCleanupRef, status });
  useRouteErrorStatusCleanup({
    dispatchOfflineEvent,
    pathname,
    previousPathRef,
    setStatus,
  });

  useEffect(() => {
    const unsubscribes = [
      subscribeToApiErrorStatusEvents({
        apiErrorQueueRef,
        batchTimerRef,
        clearStatus,
        clearTimer,
        updateStatus,
      }),
      subscribeToApplicationErrorStatusEvents({
        clearStatus,
        dispatchOfflineEvent,
        updateStatus,
      }),
      subscribeToGenericStatusEvents({
        clearTimer,
        scheduleStatusClear,
        setStatus,
        statusClearTimerRef,
        updateStatus,
      }),
      subscribeToNotFoundStatusEvents({
        notFoundActionRef,
        setStatus,
        updateStatus,
      }),
      subscribeToGuardStatusEvents({ clearStatus, setStatus, updateStatus }),
      subscribeToConnectionStatusEvents({ handleOffline, handleOnline }),
    ];
    return () => {
      unsubscribes.forEach((fn) => fn());
      clearTransientTimers();
    };
  }, [
    apiErrorQueueRef,
    batchTimerRef,
    clearStatus,
    clearTimer,
    clearTransientTimers,
    dispatchOfflineEvent,
    handleOffline,
    handleOnline,
    notFoundActionRef,
    scheduleStatusClear,
    updateStatus,
  ]);

  useDockStatusTimerCleanup(clearAllTimers);

  return status;
}

export function applyStatusOverlay(item: any, statusState: any) {
  if (!item || !statusState) return item;
  const showStatusActions =
    statusState.type === "APP_ERROR" ||
    statusState.type === "API_ERROR" ||
    statusState.type === "GUARD" ||
    Boolean(statusState.action);
  return {
    ...item,
    ...statusState,
    activeChild: null,
    children: null,
    hasActiveChild: false,
    isExpanded: false,
    isParent: false,
    isStatus: true,
    badge: null,
    iconOverlay: null,
    action: showStatusActions ? statusState.action : null,
    actions: showStatusActions ? statusState.actions : null,
  };
}
