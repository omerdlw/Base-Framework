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
import {
  FALLBACK_NOTIFICATION_ACTIONS,
  FALLBACK_NOTIFICATION_STATE,
  STORAGE_KEY,
} from "./constants";
import type {
  NotificationActions,
  NotificationData,
  NotificationEntry,
  NotificationProviderProps,
  NotificationState,
  NotificationType,
} from "./types";
import {
  filterCriticalNotifications,
  getStorageItem,
  isObjectRecord,
  removeStorageItem,
  setStorageItem,
} from "./utils";

export const NotificationActionsContext = createContext<NotificationActions>(
  FALLBACK_NOTIFICATION_ACTIONS,
);
export const NotificationStateContext = createContext<NotificationState>(
  FALLBACK_NOTIFICATION_STATE,
);

function readStoredCriticalNotifications(): Record<string, NotificationEntry> {
  try {
    const stored =
      getStorageItem<Record<string, NotificationEntry>>(STORAGE_KEY);

    if (!stored || !isObjectRecord(stored)) {
      if (stored !== null && stored !== undefined)
        removeStorageItem(STORAGE_KEY);
      return {};
    }

    const filtered = filterCriticalNotifications(stored);

    if (Object.keys(filtered).length === 0) {
      removeStorageItem(STORAGE_KEY);
    }

    return filtered;
  } catch (error) {
    console.warn(
      "[NotificationProvider] Failed to read stored notifications",
      error,
    );
    return {};
  }
}

function clearNotificationTimer(
  id: string,
  timers: Map<string, NodeJS.Timeout | number>,
) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

function normalizeDuration(value: unknown): number | null {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

function createNotificationEntry(
  id: string,
  type: NotificationType,
  data: NotificationData = {},
): NotificationEntry {
  return {
    ...data,
    id,
    timestamp: Date.now(),
    type,
  };
}

export const NotificationProvider = ({
  children,
}: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<
    Record<string, NotificationEntry>
  >({});
  const [isHydrated, setIsHydrated] = useState(false);
  const timersRef = useRef<Map<string, NodeJS.Timeout | number>>(new Map());

  useEffect(() => {
    const storedNotifications = readStoredCriticalNotifications();
    if (Object.keys(storedNotifications).length > 0) {
      setNotifications(storedNotifications);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    try {
      const critical = filterCriticalNotifications(notifications);
      if (Object.keys(critical).length > 0) {
        setStorageItem(STORAGE_KEY, critical);
      } else {
        removeStorageItem(STORAGE_KEY);
      }
    } catch {}
  }, [isHydrated, notifications]);

  const dismissNotification = useCallback((id: string) => {
    clearNotificationTimer(id, timersRef.current);

    setNotifications((prev) => {
      if (!Object.hasOwn(prev, id)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const showNotification = useCallback(
    (type: NotificationType, data: NotificationData = {}) => {
      const safeData = isObjectRecord(data) ? data : {};
      const id = safeData.id || type;

      clearNotificationTimer(id, timersRef.current);

      setNotifications((prev) => ({
        ...prev,
        [id]: createNotificationEntry(id, type, safeData),
      }));

      const duration = normalizeDuration(safeData.duration);
      if (duration) {
        const timer = setTimeout(() => {
          dismissNotification(id);
        }, duration);
        timersRef.current.set(id, timer);
      }
    },
    [dismissNotification],
  );

  const actions = useMemo<NotificationActions>(
    () => ({
      dismissNotification,
      showNotification,
    }),
    [dismissNotification, showNotification],
  );

  const state = useMemo<NotificationState>(
    () => ({
      notifications,
    }),
    [notifications],
  );

  return (
    <NotificationActionsContext value={actions}>
      <NotificationStateContext value={state}>
        {children}
      </NotificationStateContext>
    </NotificationActionsContext>
  );
};

export function useNotificationActions(): NotificationActions {
  const context = use(NotificationActionsContext);
  if (!context)
    throw new Error(
      "useNotificationActions must be used within NotificationProvider",
    );
  return context;
}

export function useNotificationState(): NotificationState {
  const context = use(NotificationStateContext);
  if (!context)
    throw new Error(
      "useNotificationState must be used within NotificationProvider",
    );
  return context;
}

export function useNotification(): NotificationState & NotificationActions {
  const actions = useNotificationActions();
  const state = useNotificationState();
  return useMemo(() => ({ ...actions, ...state }), [actions, state]);
}
