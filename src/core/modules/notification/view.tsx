"use client";

import {
  useMemo,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Z_INDEX } from "@/core/tokens";
import { EVENT_TYPES } from "@/core/events";
import { useGlobalEvent } from "@/core/hooks";
import {
  DOCK_STACK_ELEMENT_ID,
  NOTIFICATION_STYLES,
  SESSION_EXPIRED_MESSAGE,
} from "./constants";
import { useNotificationActions, useNotificationState } from "./provider";
import type { NotificationEntry } from "./types";
import { sortNotificationsByTimestamp } from "./utils";
import {
  NOTIFICATION_COMPOSITOR_STYLE,
  NOTIFICATION_TRANSITION,
  toastVariants,
} from "./motion";

const emptySubscribe = () => () => {};

export function NotificationOverlay({
  notification,
}: {
  notification: NotificationEntry;
  onDismiss?: () => void;
}) {
  if (
    notification.message === null ||
    notification.message === undefined ||
    notification.message === ""
  ) {
    return null;
  }

  return (
    <div className={NOTIFICATION_STYLES.MESSAGE}>{notification.message}</div>
  );
}

export function NotificationContainer() {
  const { notifications } = useNotificationState();
  const { dismissNotification } = useNotificationActions();
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const activeEntry = useMemo(() => {
    const sorted = sortNotificationsByTimestamp(notifications);
    return sorted.length > 0 ? sorted[sorted.length - 1][1] : null;
  }, [notifications]);

  if (!isHydrated || typeof document === "undefined") return null;

  const resolvedDockElement = document.getElementById(DOCK_STACK_ELEMENT_ID);

  const handleDismiss = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (activeEntry) {
      dismissNotification(activeEntry.id);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && activeEntry) {
      event.preventDefault();
      event.stopPropagation();
      dismissNotification(activeEntry.id);
    }
  };

  if (resolvedDockElement) {
    return createPortal(
      <AnimatePresence mode="wait">
        {activeEntry && (
          <motion.div
            key={activeEntry.id}
            role="alert"
            aria-atomic="true"
            aria-live="polite"
            aria-keyshortcuts="Escape"
            tabIndex={0}
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={NOTIFICATION_TRANSITION}
            style={NOTIFICATION_COMPOSITOR_STYLE}
            className={NOTIFICATION_STYLES.DOCK_SLOT}
            onClick={handleDismiss}
            onKeyDown={handleKeyDown}
          >
            <NotificationOverlay
              notification={activeEntry}
              onDismiss={() => dismissNotification(activeEntry.id)}
            />
          </motion.div>
        )}
      </AnimatePresence>,
      resolvedDockElement,
    );
  }

  return createPortal(
    <div
      aria-atomic="true"
      aria-live="polite"
      className={NOTIFICATION_STYLES.FALLBACK_PORTAL_CONTAINER}
      style={{ zIndex: Z_INDEX.NOTIFICATION }}
    >
      <AnimatePresence mode="wait">
        {activeEntry && (
          <motion.div
            key={activeEntry.id}
            role="alert"
            aria-atomic="true"
            aria-keyshortcuts="Escape"
            tabIndex={0}
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={NOTIFICATION_TRANSITION}
            style={NOTIFICATION_COMPOSITOR_STYLE}
            className={NOTIFICATION_STYLES.CONTAINER}
            onClick={handleDismiss}
            onKeyDown={handleKeyDown}
          >
            <NotificationOverlay
              notification={activeEntry}
              onDismiss={() => dismissNotification(activeEntry.id)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

export function NotificationListener(): null {
  const { showNotification } = useNotificationActions();

  useGlobalEvent(EVENT_TYPES.API_UNAUTHORIZED, (data?: { source?: string }) => {
    if (data?.source && data.source !== "app") return;
    showNotification(SESSION_EXPIRED_MESSAGE);
  });

  useGlobalEvent(
    EVENT_TYPES.APP_ERROR,
    (data?: { message?: string; notify?: boolean }) => {
      if (!data?.notify || !data.message) return;
      showNotification(data.message);
    },
  );

  useGlobalEvent(
    EVENT_TYPES.STATE_CHANGE,
    (data?: { message?: string; notify?: boolean }) => {
      if (!data?.notify || !data.message) return;
      showNotification(data.message);
    },
  );

  return null;
}

export function NotificationBadgeListener(): null {
  return null;
}
