"use client";

import {
  useEffect,
  useRef,
  useState,
  memo,
  useCallback,
  type ReactNode,
  type MouseEvent,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

import {
  Container,
  MODAL_LIST_ITEM_VARIANTS,
  MODAL_LIST_VARIANTS,
} from "@/core/modules/modal";
import { useAuth } from "@/features/auth";
import { useToast } from "@/core/modules/notification";
import {
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  markAllAsRead,
  markAsRead,
} from "../../client/notifications";
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from "../../../utils";
import {
  DESTRUCTIVE_ACTION_TONE_CLASS,
  INFO_ACTION_TONE_CLASS,
} from "@/core/tokens";
import { SOCIAL_EVENTS } from "@/features/account/constants";
import { globalEvents } from "@/core/events";
import { useGlobalEvent } from "@/core/hooks";
import { cn } from "@/core/utils";
import AdaptiveImage from "@/core/primitives/adaptive-image";
import { Button, Icon } from "@/core/primitives";

export const FOLLOW_STATUSES = Object.freeze({
  ACCEPTED: "accepted",
  PENDING: "pending",
  REJECTED: "rejected",
});

export const NOTIFICATION_TYPES = Object.freeze({
  FOLLOW_REQUEST: "FOLLOW_REQUEST",
  FOLLOW_ACCEPTED: "FOLLOW_ACCEPTED",
  NEW_FOLLOWER: "NEW_FOLLOWER",
  SYSTEM_ANNOUNCEMENT: "SYSTEM_ANNOUNCEMENT",
  MENTION: "MENTION",
});

export const NOTIFICATION_TYPE_SET = new Set(Object.values(NOTIFICATION_TYPES));

export function NotificationListSkeleton({ count = 12 }) {
  return Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className="flex animate-pulse items-center gap-3 border-b border-white/10 p-3 last:border-b-0 lg:p-4"
    >
      <div className="skeleton-block size-10 shrink-0 rounded-[14px]" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="skeleton-block h-3 w-3/5 rounded-full" />
        <div className="skeleton-block h-2.5 w-2/5 rounded-full" />
      </div>
    </div>
  ));
}
const FALLBACK_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const TOOL_BUTTON_CLASS = "size-7 center rounded-lg cursor-pointer";
const CLEAR_BUTTON_CLASS =
  "center h-9 shrink-0 cursor-pointer rounded-xl px-4 text-xs font-semibold whitespace-nowrap text-white/70 uppercase ring-1 ring-white/10 ring-inset hover:bg-white hover:text-black hover:ring-transparent";
const MARK_READ_BUTTON_CLASS = cn(
  "center h-9 shrink-0 cursor-pointer rounded-xl px-4 text-xs font-semibold whitespace-nowrap uppercase disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/50 disabled:ring-white/5",
  INFO_ACTION_TONE_CLASS,
);

const NOTIFICATION_ICONS = {
  [NOTIFICATION_TYPES.FOLLOW_REQUEST]: "solar:user-plus-bold",
  [NOTIFICATION_TYPES.FOLLOW_ACCEPTED]: "solar:user-check-bold",
  [NOTIFICATION_TYPES.NEW_FOLLOWER]: "solar:user-plus-bold",
  [NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT]: "solar:info-circle-bold",
  [NOTIFICATION_TYPES.MENTION]: "solar:mention-circle-bold",
};
const DEFAULT_ICON = "solar:bell-bold";

function formatRelativeTime(dateValue?: any): string {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return FALLBACK_DATE_FORMATTER.format(date);
}

function getNotificationIcon(type?: string): string {
  return (
    (NOTIFICATION_ICONS as Record<string, string>)[type || ""] || DEFAULT_ICON
  );
}

function getNotificationSubject(payload: any) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.subject && typeof payload.subject === "object") {
    return payload.subject;
  }
  if (payload.href || payload.title) {
    return {
      href: payload.href || null,
      title: payload.title || null,
    };
  }
  return null;
}

interface InlineEntityProps {
  href?: string | null;
  children: ReactNode;
  muted?: boolean;
  onClick?: () => void;
}

const InlineEntity = memo(function InlineEntity({
  href,
  children,
  muted = false,
  onClick,
}: InlineEntityProps) {
  const className = muted ? "font-semibold text-white/70" : "font-semibold";
  return href ? (
    <Link href={href} onClick={onClick} className={className}>
      {children}
    </Link>
  ) : (
    <span className={className}>{children}</span>
  );
});

interface NotificationContentProps {
  type: string;
  actor: any;
  payload: any;
  onLinkClick?: () => void;
}

const NotificationContent = memo(function NotificationContent({
  type,
  actor,
  payload,
  onLinkClick,
}: NotificationContentProps) {
  const actorName = actor?.displayName || actor?.username || "Someone";
  const actorHref = actor?.username ? `/account/${actor.username}` : null;
  const subject = getNotificationSubject(payload);

  const actorLink = actor ? (
    <InlineEntity href={actorHref} onClick={onLinkClick}>
      {actorName}
    </InlineEntity>
  ) : null;

  switch (type) {
    case NOTIFICATION_TYPES.FOLLOW_REQUEST:
      return <p className="text-sm">{actorLink} requested to follow you</p>;
    case NOTIFICATION_TYPES.FOLLOW_ACCEPTED:
      return (
        <p className="text-sm">{actorLink} accepted your follow request</p>
      );
    case NOTIFICATION_TYPES.NEW_FOLLOWER:
      return <p className="text-sm">{actorLink} started following you</p>;
    case NOTIFICATION_TYPES.MENTION:
      return (
        <p className="text-sm">
          {actorLink} mentioned you
          {subject?.title && (
            <>
              {" "}
              in{" "}
              <InlineEntity href={subject.href} onClick={onLinkClick}>
                {subject.title}
              </InlineEntity>
            </>
          )}
        </p>
      );
    case NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT:
      return (
        <p className="text-sm text-white/90">
          {payload?.message || payload?.title || "System announcement"}
        </p>
      );
    default: {
      const customMessage = payload?.message || "interacted with you";
      return (
        <p className="text-sm text-white/80">
          {actorLink ? <>{actorLink} </> : null}
          {customMessage}
          {subject?.title && (
            <>
              {" "}
              <InlineEntity href={subject.href} onClick={onLinkClick}>
                {subject.title}
              </InlineEntity>
            </>
          )}
        </p>
      );
    }
  }
});

interface NotificationRowProps {
  notification: any;
  onMarkRead: (
    notificationId: string,
    event: MouseEvent<HTMLButtonElement>,
  ) => Promise<void>;
  onDelete: (
    notificationId: string,
    event: MouseEvent<HTMLButtonElement>,
  ) => Promise<void>;
  onLinkClick?: () => void;
  index: number;
}

const NotificationRow = memo(function NotificationRow({
  notification,
  onMarkRead,
  onDelete,
  onLinkClick,
  index,
}: NotificationRowProps) {
  const isUnread = !notification.read;
  const actorHref = notification.actor?.username
    ? `/account/${notification.actor.username}`
    : null;

  const AvatarImage = (
    <AdaptiveImage
      mode="img"
      src={getUserAvatarUrl(notification.actor)}
      alt={notification.actor?.displayName || "Avatar"}
      className="size-full object-cover"
      loading="lazy"
      decoding="async"
      onError={(event) =>
        applyAvatarFallback(event, getUserAvatarFallbackUrl(notification.actor))
      }
      wrapperClassName="size-full"
    />
  );

  return (
    <motion.div
      variants={MODAL_LIST_ITEM_VARIANTS}
      custom={index}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        "grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-white/10 p-3 last:border-b-0 lg:p-4",
        isUnread ? "bg-black" : "hover:bg-black",
      )}
    >
      <div className="center size-10 shrink-0 overflow-hidden rounded-[14px] bg-white/5 ring-1 ring-white/5 ring-inset">
        {notification.actor ? (
          actorHref ? (
            <Link href={actorHref} onClick={onLinkClick} className="size-full">
              {AvatarImage}
            </Link>
          ) : (
            AvatarImage
          )
        ) : (
          <Icon
            icon={getNotificationIcon(notification.type)}
            size={20}
            className="text-white/70"
          />
        )}
      </div>

      <div className="flex w-full flex-col">
        <NotificationContent
          type={notification.type}
          actor={notification.actor}
          payload={notification.payload}
          onLinkClick={onLinkClick}
        />
        <span className="text-xs text-white/50 uppercase">
          {formatRelativeTime(
            notification.createdAt || notification.created_at,
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {isUnread && (
          <Button
            onClick={(e) => onMarkRead(notification.id, e)}
            title="Mark as read"
            className={cn(TOOL_BUTTON_CLASS, INFO_ACTION_TONE_CLASS)}
          >
            <Icon icon="material-symbols:check-rounded" size={16} />
          </Button>
        )}
        <Button
          onClick={(e) => onDelete(notification.id, e)}
          title="Delete notification"
          className={cn(TOOL_BUTTON_CLASS, DESTRUCTIVE_ACTION_TONE_CLASS)}
        >
          <Icon icon="solar:trash-bin-trash-linear" size={16} />
        </Button>
      </div>
    </motion.div>
  );
});

export interface NotificationsModalProps {
  close: () => void;
  header?: any;
  data?: {
    userId?: string | null;
    [key: string]: unknown;
  };
}

export default function NotificationsModal({
  close,
  header,
  data,
}: NotificationsModalProps) {
  const auth = useAuth();
  const toast = useToast();
  const userId = data?.userId || auth.user?.id || null;

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  const optimisticStateRef = useRef<{
    deletedIds: Set<string>;
    forceReadIds: Set<string>;
  }>({
    deletedIds: new Set(),
    forceReadIds: new Set(),
  });
  const inFlightRef = useRef(false);

  const isSidePosition =
    header?.position === "left" || header?.position === "right";
  const unreadCount = notifications.filter((item) => !item.read).length;
  const hasUnread = unreadCount > 0;

  const loadNotifications = useCallback(
    async (activeFlag: { value: boolean }) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const result = await fetchNotifications({ limitCount: 50 });
        if (!activeFlag.value) return;

        const { deletedIds, forceReadIds } = optimisticStateRef.current;
        const normalized = (Array.isArray(result) ? result : [])
          .filter((item) => item?.id && !deletedIds.has(item.id))
          .map((item: any) => ({
            ...item,
            actor: item.actor || item.metadata?.actor || null,
            payload: item.payload || item.metadata?.payload || null,
            type: item.type || item.event_type,
            read: forceReadIds.has(item.id) ? true : Boolean(item.read),
          }));

        setNotifications(normalized);
        setLoadError(null);
      } catch (err: any) {
        if (activeFlag.value) setLoadError(err);
      } finally {
        inFlightRef.current = false;
        if (activeFlag.value) setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const active = { value: true };
    if (auth.isReady && auth.isAuthenticated && userId) {
      loadNotifications(active);
    }
    return () => {
      active.value = false;
    };
  }, [auth.isAuthenticated, auth.isReady, userId, loadNotifications]);

  useGlobalEvent(
    SOCIAL_EVENTS.NOTIFICATION_CHANGE,
    () => {
      if (auth.isAuthenticated && userId) {
        loadNotifications({ value: true });
      }
    },
    { debounceMs: 150 },
  );

  const handleMarkAllRead = async () => {
    if (!userId || !hasUnread) return;

    const previous = [...notifications];
    const unreadIds = notifications
      .filter((item) => !item.read)
      .map((item) => item.id);

    unreadIds.forEach((id) => optimisticStateRef.current.forceReadIds.add(id));
    setNotifications((curr) =>
      curr.map((item: any) => ({ ...item, read: true })),
    );
    globalEvents.emit(SOCIAL_EVENTS.NOTIFICATION_CHANGE);

    try {
      await markAllAsRead();
    } catch (error: any) {
      unreadIds.forEach((id) =>
        optimisticStateRef.current.forceReadIds.delete(id),
      );
      setNotifications(previous);
      globalEvents.emit(SOCIAL_EVENTS.NOTIFICATION_CHANGE);
      toast.error(error?.message || "Notifications could not be updated");
    }
  };

  const handleMarkRead = useCallback(
    async (notificationId: string, event: MouseEvent<HTMLButtonElement>) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (!userId || !notificationId) return;

      optimisticStateRef.current.forceReadIds.add(notificationId);
      setNotifications((curr) =>
        curr.map((item) =>
          item.id === notificationId ? { ...item, read: true } : item,
        ),
      );
      globalEvents.emit(SOCIAL_EVENTS.NOTIFICATION_CHANGE);

      try {
        await markAsRead(notificationId);
      } catch (error: any) {
        optimisticStateRef.current.forceReadIds.delete(notificationId);
        setNotifications((curr) =>
          curr.map((item) =>
            item.id === notificationId ? { ...item, read: false } : item,
          ),
        );
        globalEvents.emit(SOCIAL_EVENTS.NOTIFICATION_CHANGE);
        toast.error(error?.message || "Notification could not be updated");
      }
    },
    [toast, userId],
  );

  const handleDelete = useCallback(
    async (notificationId: string, event: MouseEvent<HTMLButtonElement>) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (!userId || !notificationId) return;

      let itemToDelete: any = null;
      setNotifications((curr) => {
        itemToDelete = curr.find((item) => item.id === notificationId);
        return curr.filter((item) => item.id !== notificationId);
      });
      optimisticStateRef.current.deletedIds.add(notificationId);
      globalEvents.emit(SOCIAL_EVENTS.NOTIFICATION_CHANGE);

      try {
        await deleteNotification(notificationId);
      } catch (error: any) {
        optimisticStateRef.current.deletedIds.delete(notificationId);
        if (itemToDelete) {
          setNotifications((curr) =>
            curr.some((item) => item.id === notificationId)
              ? curr
              : [...curr, itemToDelete],
          );
        }
        globalEvents.emit(SOCIAL_EVENTS.NOTIFICATION_CHANGE);
        toast.error(error?.message || "Notification could not be deleted");
      }
    },
    [toast, userId],
  );

  const handleDeleteAll = async () => {
    if (!userId || notifications.length === 0) return;

    const previous = [...notifications];
    const ids = notifications.map((item) => item.id);

    ids.forEach((id) => optimisticStateRef.current.deletedIds.add(id));
    setNotifications([]);
    globalEvents.emit(SOCIAL_EVENTS.NOTIFICATION_CHANGE);

    try {
      await deleteAllNotifications();
    } catch (error: any) {
      ids.forEach((id) => optimisticStateRef.current.deletedIds.delete(id));
      setNotifications(previous);
      globalEvents.emit(SOCIAL_EVENTS.NOTIFICATION_CHANGE);
      toast.error(error?.message || "Notifications could not be deleted");
    }
  };

  return (
    <Container
      className={
        isSidePosition
          ? "h-full max-h-full w-full sm:w-[460px]"
          : "max-h-[78dvh] w-full sm:w-[min(1400px,96vw)]"
      }
      close={close}
      header={header}
      bodyClassName="p-0"
      footer={{
        left: (
          <span className="text-xs text-white/70">
            {hasUnread
              ? `${unreadCount} unread`
              : `${notifications.length} notifications`}
          </span>
        ),
        right:
          notifications.length > 0 ? (
            <>
              <Button
                type="button"
                onClick={handleDeleteAll}
                className={CLEAR_BUTTON_CLASS}
              >
                Clear all
              </Button>
              {hasUnread && (
                <Button
                  type="button"
                  onClick={handleMarkAllRead}
                  className={MARK_READ_BUTTON_CLASS}
                >
                  Mark all as read
                </Button>
              )}
            </>
          ) : null,
      }}
    >
      <div className="min-h-0 overflow-y-auto rounded-[20px]">
        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.div
              key="loading"
              variants={MODAL_LIST_VARIANTS}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <NotificationListSkeleton />
            </motion.div>
          ) : loadError ? (
            <motion.div
              key="error"
              variants={MODAL_LIST_VARIANTS}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="center h-52 px-6 text-center text-sm font-medium text-white/50"
            >
              Notifications could not be loaded
            </motion.div>
          ) : notifications.length === 0 ? (
            <motion.div
              key="empty"
              variants={MODAL_LIST_VARIANTS}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="center h-64 text-sm font-medium text-white/50"
            >
              You have no notifications yet
            </motion.div>
          ) : (
            <motion.div
              key="notifications"
              variants={MODAL_LIST_VARIANTS}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <AnimatePresence initial={false}>
                {notifications.map((notification, index) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                    onLinkClick={close}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Container>
  );
}
