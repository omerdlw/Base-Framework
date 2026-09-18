"use client";

import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { SEMANTIC_SURFACE_CLASSES, Z_INDEX } from "@/core/tokens";
import { EVENT_TYPES } from "@/core/events";
import { useGlobalEvent } from "@/core/hooks";
import { cn } from "@/core/utils";
import { Button, Icon } from "@/core/primitives";
import {
  CRITICAL_TYPES,
  DRAG_DISMISS_THRESHOLD,
  DRAG_VELOCITY_THRESHOLD,
  NOTIFICATION_CONFIG,
  NOTIFICATION_STYLES,
  SESSION_EXPIRED_MESSAGE,
} from "./constants";
import { useNotificationActions, useNotificationState } from "./provider";
import type { NotificationActionItem, NotificationEntry } from "./types";
import { resolveNotificationCopy, sortNotificationsByTimestamp } from "./utils";
import {
  NOTIFICATION_DRAG_CONSTRAINTS,
  NOTIFICATION_DRAG_ELASTIC,
  NOTIFICATION_WHILE_DRAG,
  toastVariants,
} from "./motion";

const ButtonComponent = Button as any;
const IconComponent = Icon as any;

const emptySubscribe = () => () => {};

export function NotificationOverlay({
  notification,
  onDismiss,
}: {
  notification: NotificationEntry;
  onDismiss: () => void;
}) {
  const config = {
    ...(NOTIFICATION_CONFIG[notification.type] || {}),
    ...notification,
  };

  const theme =
    config.theme ||
    (SEMANTIC_SURFACE_CLASSES as Record<string, any>)[config.tone] ||
    (typeof config.colorClass === "object" ? config.colorClass : null) ||
    SEMANTIC_SURFACE_CLASSES.info;

  const actions: NotificationActionItem[] = Array.isArray(config.actions)
    ? config.actions.filter(Boolean)
    : [];
  const resolvedIcon = notification.icon || config.icon || null;
  const { description: resolvedDescription, title: resolvedTitle } =
    resolveNotificationCopy(notification, config);

  if (!resolvedTitle && !resolvedDescription) return null;

  return (
    <section
      role="alert"
      aria-atomic="true"
      aria-keyshortcuts="Escape"
      tabIndex={0}
      onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onDismiss();
        }
      }}
      className={cn(NOTIFICATION_STYLES.CONTAINER, theme?.surface)}
      style={{
        WebkitBackdropFilter: "blur(16px)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="relative flex h-auto w-full flex-col gap-2.5">
        <div className="relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5">
          {resolvedIcon ? (
            <div className="center relative shrink-0">
              <div className={cn(NOTIFICATION_STYLES.ICON_BOX, theme?.icon)}>
                {typeof resolvedIcon === "string" ? (
                  <IconComponent icon={resolvedIcon} size={24} />
                ) : (
                  resolvedIcon
                )}
              </div>
            </div>
          ) : (
            <div className="size-12 shrink-0" />
          )}

          <div className="relative flex min-w-0 flex-1 flex-col justify-center -space-y-0.5 overflow-hidden">
            {resolvedTitle && (
              <div className="relative overflow-hidden">
                <h3 className={cn(NOTIFICATION_STYLES.TITLE, theme?.title)}>
                  {resolvedTitle}
                </h3>
              </div>
            )}

            {resolvedDescription && (
              <div className="relative min-h-[1.25rem] w-full overflow-hidden text-sm">
                <p
                  className={cn(
                    NOTIFICATION_STYLES.DESCRIPTION,
                    theme?.description,
                  )}
                >
                  {resolvedDescription}
                </p>
              </div>
            )}
          </div>
        </div>

        {actions.length > 0 && (
          <div className="flex w-full flex-wrap items-center gap-2.5">
            {actions.map((action, index) => (
              <ButtonComponent
                key={action.label || index}
                type="button"
                onPointerDown={(e: PointerEvent<HTMLButtonElement>) =>
                  e.stopPropagation()
                }
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  action.onClick?.();
                  if (action.dismiss !== false) onDismiss();
                }}
                className={cn(
                  NOTIFICATION_STYLES.ACTION_BUTTON,
                  action.className || config.actionToneClass,
                )}
              >
                {action.label}
              </ButtonComponent>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function NotificationContainer() {
  const { notifications } = useNotificationState();
  const { dismissNotification } = useNotificationActions();
  const portalTarget = useSyncExternalStore(
    emptySubscribe,
    () => (typeof document !== "undefined" ? document.body : null),
    () => null,
  );

  const sortedNotifications = useMemo(
    () => sortNotificationsByTimestamp(notifications),
    [notifications],
  );

  if (!portalTarget) return null;

  return createPortal(
    <div
      aria-atomic="true"
      aria-live="polite"
      className={NOTIFICATION_STYLES.PORTAL_CONTAINER}
      style={{ zIndex: Z_INDEX.NOTIFICATION }}
    >
      <AnimatePresence initial={false}>
        {sortedNotifications.map(([id, notification]) => (
          <motion.div
            key={id}
            layout
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag="x"
            dragDirectionLock
            dragConstraints={NOTIFICATION_DRAG_CONSTRAINTS}
            dragElastic={NOTIFICATION_DRAG_ELASTIC}
            onDragEnd={(_, info) => {
              if (
                info.offset.x > DRAG_DISMISS_THRESHOLD ||
                info.velocity.x > DRAG_VELOCITY_THRESHOLD
              ) {
                dismissNotification(id);
              }
            }}
            whileDrag={NOTIFICATION_WHILE_DRAG}
            className={NOTIFICATION_STYLES.MOTION_WRAPPER}
          >
            <NotificationOverlay
              notification={notification}
              onDismiss={() => dismissNotification(id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    portalTarget,
  );
}

export function NotificationListener(): null {
  const { showNotification } = useNotificationActions();

  useGlobalEvent(EVENT_TYPES.API_UNAUTHORIZED, (data?: { source?: string }) => {
    if (data?.source && data.source !== "app") return;

    showNotification(CRITICAL_TYPES.SESSION_EXPIRED, {
      message: SESSION_EXPIRED_MESSAGE,
    });
  });

  return null;
}

export function NotificationBadgeListener(): null {
  return null;
}
