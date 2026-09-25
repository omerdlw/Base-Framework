"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type WheelEvent,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

import {
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  markAllAsRead,
  markAsRead,
} from "../../social/client/notifications";
import { useAuth } from "@/features/auth/provider";
import { useToast } from "@/core/modules/notification";
import {
  DockSurfaceExtension,
  dockFadeVariants,
  dockListItemVariants,
  isValidBannerUrl,
  type SurfaceEntry,
} from "@/core/modules/dock";
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from "../../utils";
import {
  NOTIFICATIONS_ICON,
  NOTIFICATIONS_TITLE,
  SOCIAL_EVENTS,
} from "../../constants";
import { globalEvents } from "@/core/events";
import { useGlobalEvent } from "@/core/hooks";
import { cn } from "@/core/utils";
import AdaptiveImage from "@/core/primitives/adaptive-image";
import { Button, Icon } from "@/core/primitives";

export const ACCOUNT_NOTIFICATIONS_SURFACE_ID = "account-notifications";

export const NOTIFICATION_TYPES = Object.freeze({
  FOLLOW_REQUEST: "FOLLOW_REQUEST",
  FOLLOW_ACCEPTED: "FOLLOW_ACCEPTED",
  NEW_FOLLOWER: "NEW_FOLLOWER",
  SYSTEM_ANNOUNCEMENT: "SYSTEM_ANNOUNCEMENT",
  MENTION: "MENTION",
});

export const NOTIFICATION_TYPE_SET = new Set(Object.values(NOTIFICATION_TYPES));

const FILTER_TABS = Object.freeze({
  ALL: "all",
  UNREAD: "unread",
} as const);

type FilterTab = (typeof FILTER_TABS)[keyof typeof FILTER_TABS];

const FALLBACK_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const ICON_ACTION_BASE_CLASS =
  "center size-9 shrink-0 cursor-pointer rounded-[14px] select-none transition-colors duration-200 active:scale-98";
const PRIMARY_ICON_BUTTON_CLASS = `${ICON_ACTION_BASE_CLASS} bg-primary/10 text-primary hover:bg-primary hover:text-black focus-visible:bg-primary focus-visible:text-black`;
const SECONDARY_ICON_BUTTON_CLASS = `${ICON_ACTION_BASE_CLASS} bg-white/5 text-white/70 hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white`;

const NOTIFICATION_ICONS: Record<string, string> = {
  [NOTIFICATION_TYPES.FOLLOW_REQUEST]: "solar:user-plus-bold",
  [NOTIFICATION_TYPES.FOLLOW_ACCEPTED]: "solar:user-check-bold",
  [NOTIFICATION_TYPES.NEW_FOLLOWER]: "solar:user-plus-bold",
  [NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT]: "solar:info-circle-bold",
  [NOTIFICATION_TYPES.MENTION]: "solar:mention-circle-bold",
};
const DEFAULT_ICON = "solar:bell-bold";

function handleListWheel(event: WheelEvent<HTMLDivElement>) {
  const listViewport = event.currentTarget;
  if (!listViewport || listViewport.scrollHeight <= listViewport.clientHeight)
    return;
  event.preventDefault();
  event.stopPropagation();
  const maxScrollTop = listViewport.scrollHeight - listViewport.clientHeight;
  listViewport.scrollTop = Math.min(
    maxScrollTop,
    Math.max(0, listViewport.scrollTop + event.deltaY),
  );
}

export function formatRelativeTime(dateInput?: string | number | Date): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSeconds < 60) return "Just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

  return FALLBACK_DATE_FORMATTER.format(date);
}

export function getNotificationIcon(type: string): string {
  return NOTIFICATION_ICONS[type] || DEFAULT_ICON;
}

export function getNotificationSubject(
  payload: any,
): { href: string | null; title: string } | null {
  if (!payload || typeof payload !== "object") return null;

  const title = payload.subjectTitle || payload.targetTitle || payload.title;
  if (!title) return null;

  return {
    href: payload.subjectHref || payload.targetHref || payload.href || null,
    title,
  };
}

export function NotificationListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex h-12 min-h-[48px] w-full animate-pulse items-center justify-between gap-2.5"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="skeleton-block size-12 shrink-0 rounded-[20px]" />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
              <div className="skeleton-block h-3 w-28 rounded-full" />
              <div className="skeleton-block h-2.5 w-16 rounded-full" />
            </div>
          </div>
          <div className="skeleton-block mr-1.5 size-9 shrink-0 rounded-[14px]" />
        </div>
      ))}
    </div>
  );
}

function getNotificationHeadline(notification: any): string {
  const actor = notification?.actor;
  if (actor) {
    return (
      actor.displayName ||
      actor.display_name ||
      actor.username ||
      "Anonymous User"
    );
  }
  if (notification?.type === NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT) {
    return notification?.payload?.title || "System Announcement";
  }
  return notification?.payload?.title || "Notification";
}

function getNotificationSubtitle(notification: any): ReactNode {
  const type = notification?.type;
  const payload = notification?.payload;
  const subject = getNotificationSubject(payload);

  switch (type) {
    case NOTIFICATION_TYPES.FOLLOW_REQUEST:
      return "Requested to follow you";
    case NOTIFICATION_TYPES.FOLLOW_ACCEPTED:
      return "Accepted your follow request";
    case NOTIFICATION_TYPES.NEW_FOLLOWER:
      return "Started following you";
    case NOTIFICATION_TYPES.MENTION:
      return subject?.title
        ? `Mentioned you in ${subject.title}`
        : "Mentioned you";
    case NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT:
      return payload?.message || "System announcement";
    default: {
      const customMessage = payload?.message || "Interacted with you";
      return subject?.title
        ? `${customMessage} in ${subject.title}`
        : customMessage;
    }
  }
}

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
  const actor = notification.actor;
  const actorHref = actor?.username
    ? `/account/${actor.username}`
    : actor?.id
      ? `/account/${actor.id}`
      : null;
  const hasBanner = isValidBannerUrl(actor?.bannerUrl || actor?.banner_url);
  const bannerUrl = actor?.bannerUrl || actor?.banner_url;
  const headline = getNotificationHeadline(notification);
  const subtitle = getNotificationSubtitle(notification);
  const relativeTime = formatRelativeTime(
    notification.createdAt || notification.created_at,
  );

  const AvatarNode = (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-[20px] bg-white/5">
      {actor ? (
        <AdaptiveImage
          mode="img"
          src={getUserAvatarUrl(actor)}
          alt={headline}
          className="size-full rounded-[inherit] object-cover transition-transform duration-300 group-hover/user:scale-105"
          loading="lazy"
          decoding="async"
          onError={(event) =>
            applyAvatarFallback(event, getUserAvatarFallbackUrl(actor))
          }
          wrapperClassName="size-full rounded-[inherit]"
        />
      ) : (
        <div className="center size-full text-white/70">
          <Icon icon={getNotificationIcon(notification.type)} size={22} />
        </div>
      )}
    </div>
  );

  const TextNode = (
    <div className="flex h-full min-w-0 flex-1 flex-col justify-center gap-0.5">
      <span className="truncate text-sm font-semibold text-white leading-tight">
        {headline}
      </span>
      <span className="truncate text-xs text-white/70 leading-tight">
        {subtitle}
        {relativeTime ? ` · ${relativeTime}` : ""}
      </span>
    </div>
  );

  return (
    <motion.div
      variants={dockListItemVariants}
      custom={index}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="group/user relative flex h-12 min-h-[48px] w-full items-center justify-between gap-2.5 overflow-hidden rounded-[20px]"
    >
      {hasBanner && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit] select-none"
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 transition-transform duration-500 ease-out group-hover/user:scale-105"
            style={{
              backgroundImage: `url("${bannerUrl}")`,
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.65) 70%, black 100%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
        </div>
      )}

      {actorHref ? (
        <Link
          href={actorHref}
          onClick={onLinkClick}
          className="relative z-10 flex h-full min-w-0 flex-1 items-center gap-2.5"
        >
          {AvatarNode}
          {TextNode}
        </Link>
      ) : (
        <div className="relative z-10 flex h-full min-w-0 flex-1 items-center gap-2.5">
          {AvatarNode}
          {TextNode}
        </div>
      )}

      <div className="relative z-10 mr-1.5 flex shrink-0 items-center gap-1.5">
        {isUnread && (
          <Button
            type="button"
            onClick={(e) => onMarkRead(notification.id, e)}
            title="Mark as read"
            aria-label="Mark as read"
            className={PRIMARY_ICON_BUTTON_CLASS}
          >
            <Icon icon="solar:check-circle-bold" size={16} />
          </Button>
        )}
        <Button
          type="button"
          onClick={(e) => onDelete(notification.id, e)}
          title="Delete notification"
          aria-label="Delete notification"
          className={SECONDARY_ICON_BUTTON_CLASS}
        >
          <Icon icon="solar:trash-bin-trash-bold" size={16} />
        </Button>
      </div>
    </motion.div>
  );
});

export interface AccountNotificationsData {
  userId?: string | null;
  [key: string]: unknown;
}

export function createAccountNotificationsSurfaceEntry(
  data: AccountNotificationsData = {},
  config: Partial<SurfaceEntry> = {},
): SurfaceEntry {
  return {
    surfaceId: ACCOUNT_NOTIFICATIONS_SURFACE_ID,
    component: AccountNotificationsSurface,
    icon: NOTIFICATIONS_ICON,
    title: NOTIFICATIONS_TITLE,
    description: "Recent activity and alerts",
    props: { data },
    expandHorizontal: false,
    ...config,
  };
}

export interface AccountNotificationsSurfaceProps {
  close?: () => void;
  header?: any;
  data?: AccountNotificationsData;
}

export type NotificationsModalProps = AccountNotificationsSurfaceProps;

export function AccountNotificationsSurface({
  close,
  data,
}: AccountNotificationsSurfaceProps) {
  const auth = useAuth();
  const toast = useToast();
  const userId = data?.userId || auth.user?.id || null;

  const [activeFilter, setActiveFilter] = useState<FilterTab>(FILTER_TABS.ALL);
  const [isLoading, setIsLoading] = useState(
    () => !auth.isReady || Boolean(auth.isAuthenticated && userId),
  );
  const [loadError, setLoadError] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  const optimisticStateRef = useRef<{
    deletedIds: Set<string>;
    forceReadIds: Set<string>;
  }>({
    deletedIds: new Set(),
    forceReadIds: new Set(),
  });

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );
  const hasUnread = unreadCount > 0;

  const visibleNotifications = useMemo(
    () =>
      activeFilter === FILTER_TABS.UNREAD
        ? notifications.filter((item) => !item.read)
        : notifications,
    [activeFilter, notifications],
  );

  const loadNotifications = useCallback(async () => {
    try {
      const result = await fetchNotifications({ limitCount: 50 });
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
      setLoadError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth.isReady || !auth.isAuthenticated || !userId) {
      return undefined;
    }

    let isCancelled = false;

    fetchNotifications({ limitCount: 50 })
      .then((result) => {
        if (isCancelled) return;
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
      })
      .catch((err: any) => {
        if (isCancelled) return;
        setLoadError(err);
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [auth.isAuthenticated, auth.isReady, userId]);

  useGlobalEvent(
    SOCIAL_EVENTS.NOTIFICATION_CHANGE,
    () => {
      if (auth.isAuthenticated && userId) {
        void loadNotifications();
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
      toast(error?.message || "Notifications could not be updated");
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
        toast(error?.message || "Notification could not be updated");
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
        toast(error?.message || "Notification could not be deleted");
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
      toast(error?.message || "Notifications could not be deleted");
    }
  };

  const tabs = useMemo(
    () => [
      {
        key: FILTER_TABS.ALL,
        label: "All",
        count: notifications.length,
      },
      {
        key: FILTER_TABS.UNREAD,
        label: "Unread",
        count: unreadCount,
      },
    ],
    [notifications.length, unreadCount],
  );

  return (
    <div className="flex w-full flex-col overflow-hidden">
      <DockSurfaceExtension id="account-notifications-toolbar" align="left">
        <div className="flex h-8 w-full items-center justify-between gap-2 px-2.5 select-none">
          <div className="flex h-full shrink-0 items-center gap-1.5">
            {tabs.map((tab) => {
              const isActive = activeFilter === tab.key;
              return (
                <Button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
                  className={cn(
                    "flex h-full shrink-0 cursor-pointer items-center gap-2 rounded-full px-3.5 text-xs font-semibold transition-all duration-200 select-none",
                    isActive
                      ? "bg-white text-black"
                      : "bg-transparent text-white/70 hover:bg-white/5 hover:text-white focus-visible:bg-white/10 focus-visible:text-white",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "text-xs font-bold tabular-nums",
                      isActive ? "text-black/80" : "text-white/50",
                    )}
                  >
                    {tab.count}
                  </span>
                </Button>
              );
            })}
          </div>

          {notifications.length > 0 && (
            <div className="flex h-full shrink-0 items-center gap-1.5">
              {hasUnread && (
                <Button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex h-full shrink-0 cursor-pointer items-center rounded-full bg-transparent px-3 text-xs font-semibold text-white/70 transition-all duration-200 select-none hover:bg-white/5 hover:text-white focus-visible:bg-white/10 focus-visible:text-white"
                >
                  <span>Mark read</span>
                </Button>
              )}
              <Button
                type="button"
                onClick={handleDeleteAll}
                className="flex h-full shrink-0 cursor-pointer items-center rounded-full bg-transparent px-3 text-xs font-semibold text-white/70 transition-all duration-200 select-none hover:bg-white/5 hover:text-white focus-visible:bg-white/10 focus-visible:text-white"
              >
                <span>Clear all</span>
              </Button>
            </div>
          )}
        </div>
      </DockSurfaceExtension>

      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.div
            key="loading"
            variants={dockFadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full"
          >
            <NotificationListSkeleton />
          </motion.div>
        ) : loadError ? (
          <motion.div
            key="error"
            variants={dockFadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex h-12 min-h-[48px] w-full items-center gap-2.5"
          >
            <div className="center size-12 shrink-0 rounded-[20px] bg-white/5 text-white/50">
              <Icon icon="solar:danger-circle-bold" size={22} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              <p className="truncate text-sm font-semibold text-white leading-tight">
                Unable to load notifications
              </p>
              <p className="truncate text-xs text-white/70 leading-tight">
                Notifications could not be loaded
              </p>
            </div>
          </motion.div>
        ) : visibleNotifications.length === 0 ? (
          <motion.div
            key={`empty-${activeFilter}`}
            variants={dockFadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex h-12 min-h-[48px] w-full items-center gap-2.5"
          >
            <div className="center size-12 shrink-0 rounded-[20px] bg-white/5 text-white/50">
              <Icon icon="solar:bell-bold" size={22} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              <p className="truncate text-sm font-semibold text-white leading-tight">
                {activeFilter === FILTER_TABS.UNREAD
                  ? "No unread notifications"
                  : "No notifications yet"}
              </p>
              <p className="truncate text-xs text-white/70 leading-tight">
                {activeFilter === FILTER_TABS.UNREAD
                  ? "You are all caught up"
                  : "New followers and activity will appear here"}
              </p>
            </div>
          </motion.div>
        ) : (
          <div
            key={`notifications-container-${activeFilter}`}
            data-lenis-prevent
            data-lenis-prevent-wheel
            onWheel={handleListWheel}
            className="max-h-[min(54dvh,24rem)] w-full touch-pan-y scrollbar-none overflow-y-auto overscroll-contain rounded-[20px]"
          >
            <motion.div
              key={`notifications-list-${activeFilter}`}
              variants={dockFadeVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex min-h-[48px] w-full flex-col justify-center gap-2.5 overflow-visible"
            >
              <AnimatePresence initial={false}>
                {visibleNotifications.map((notification, index) => (
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
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AccountNotificationsSurface;
