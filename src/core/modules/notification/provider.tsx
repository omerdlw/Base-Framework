"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { EVENT_TYPES, globalEvents } from "@/core/events";
import { useRequiredContext } from "@/core/hooks";
import { TOAST_DURATIONS } from "./constants";
import type {
  NotificationActions,
  NotificationData,
  NotificationEntry,
  NotificationProviderProps,
  NotificationState,
  ToastOptionsInput,
} from "./types";
import {
  isNotificationDataObject,
  normalizeFeedbackText,
  normalizeToastOptions,
} from "./utils";

export interface NotificationContextValue {
  actions: NotificationActions;
  state: NotificationState;
}

export const NotificationContext =
  createContext<NotificationContextValue | null>(null);

let notificationIdCounter = 0;

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
  if (value === null) return null;
  if (value === undefined) return TOAST_DURATIONS.DEFAULT;
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

export const NotificationProvider = ({
  children,
}: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<
    Record<string, NotificationEntry>
  >({});
  const timersRef = useRef<Map<string, NodeJS.Timeout | number>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
      globalEvents.emit(EVENT_TYPES.NOTIFICATION_VISIBILITY_CHANGE, {
        count: 0,
        visible: false,
      });
    };
  }, []);

  useEffect(() => {
    const count = Object.keys(notifications).length;
    globalEvents.emit(EVENT_TYPES.NOTIFICATION_VISIBILITY_CHANGE, {
      count,
      visible: count > 0,
    });
  }, [notifications]);

  const dismissNotification = useCallback((id: string) => {
    clearNotificationTimer(id, timersRef.current);

    setNotifications((prev) => {
      if (!Object.hasOwn(prev, id)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const dismissAllNotifications = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
    setNotifications({});
  }, []);

  const showNotification = useCallback(
    (
      messageOrData: ReactNode | NotificationData,
      options?: ToastOptionsInput,
    ): string | null => {
      const normalizedOptions = normalizeToastOptions(options);
      const payload: NotificationData = isNotificationDataObject(messageOrData)
        ? { ...normalizedOptions, ...messageOrData }
        : { ...normalizedOptions, message: messageOrData };

      const normalizedMessage = normalizeFeedbackText(payload.message);
      if (
        normalizedMessage === null ||
        normalizedMessage === undefined ||
        normalizedMessage === ""
      ) {
        return null;
      }

      const id =
        payload.dedupeKey ||
        payload.id ||
        (typeof normalizedMessage === "string"
          ? normalizedMessage.slice(0, 64)
          : `notification-${++notificationIdCounter}`);

      timersRef.current.forEach(clearTimeout);
      timersRef.current.clear();

      const entry: NotificationEntry = {
        dedupeKey: payload.dedupeKey,
        duration: payload.duration,
        id,
        message: normalizedMessage,
        timestamp: Date.now(),
      };

      setNotifications({
        [id]: entry,
      });

      const duration = normalizeDuration(payload.duration);
      if (duration) {
        const timer = setTimeout(() => {
          dismissNotification(id);
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismissNotification],
  );

  const actions = useMemo<NotificationActions>(
    () => ({
      dismissAllNotifications,
      dismissNotification,
      showNotification,
    }),
    [dismissAllNotifications, dismissNotification, showNotification],
  );

  const state = useMemo<NotificationState>(
    () => ({
      notifications,
    }),
    [notifications],
  );

  const value = useMemo<NotificationContextValue>(
    () => ({ actions, state }),
    [actions, state],
  );

  return <NotificationContext value={value}>{children}</NotificationContext>;
};

export function useNotificationActions(): NotificationActions {
  return useRequiredContext(
    NotificationContext,
    "useNotificationActions",
    "NotificationProvider",
  ).actions;
}

export function useNotificationState(): NotificationState {
  return useRequiredContext(
    NotificationContext,
    "useNotificationState",
    "NotificationProvider",
  ).state;
}

export function useNotification(): NotificationState & NotificationActions {
  const { actions, state } = useRequiredContext(
    NotificationContext,
    "useNotification",
    "NotificationProvider",
  );
  return useMemo(() => ({ ...actions, ...state }), [actions, state]);
}
