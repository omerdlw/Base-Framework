"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/provider";
import {
  useDockActions,
  useDockContextActions,
  useDockSelector,
} from "@/core/modules/dock";
import { useGlobalEvent } from "@/core/hooks";
import {
  ACCOUNT_NOTIFICATIONS_SURFACE_ID,
  createAccountNotificationsSurfaceEntry,
  fetchUnreadCount,
} from "../../social";
import {
  NOTIFICATIONS_ACTION_KEY,
  NOTIFICATIONS_ACTION_ORDER,
  NOTIFICATIONS_ICON,
  NOTIFICATIONS_TITLE,
  SIGN_OUT_ACTION_KEY,
  SIGN_OUT_ACTION_ORDER,
  SOCIAL_EVENTS,
} from "../../constants";

export function AccountDockActions(): null {
  const auth = useAuth();
  const router = useRouter();
  const { openSurface, closeSurface } = useDockActions();
  const activeSurfaceId = useDockSelector(
    (state) => state.surface?.surfaceId || state.surface?.id || null,
  );

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    void fetchUnreadCount()
      .then(setUnreadCount)
      .catch(() => null);
  }, [auth.isAuthenticated]);

  useGlobalEvent(
    SOCIAL_EVENTS.NOTIFICATION_CHANGE,
    () => {
      if (auth.isAuthenticated) {
        void fetchUnreadCount()
          .then(setUnreadCount)
          .catch(() => null);
      }
    },
    { debounceMs: 150 },
  );

  const handleOpenNotifications = useCallback(
    (event?: any) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (activeSurfaceId === ACCOUNT_NOTIFICATIONS_SURFACE_ID) {
        closeSurface();
        return;
      }
      openSurface(
        createAccountNotificationsSurfaceEntry({
          userId: auth.user?.id ?? null,
        }),
      );
    },
    [activeSurfaceId, auth.user?.id, closeSurface, openSurface],
  );

  const signOut = useCallback(async () => {
    await auth.signOut("local");
    window.setTimeout(() => router.replace("/"), 450);
  }, [auth, router]);

  const unreadBadge =
    unreadCount > 0 ? (unreadCount > 99 ? "99+" : `${unreadCount}`) : null;

  const globalActions = useMemo(
    () => [
      {
        badge: unreadBadge,
        icon: NOTIFICATIONS_ICON,
        key: NOTIFICATIONS_ACTION_KEY,
        onClick: handleOpenNotifications,
        order: NOTIFICATIONS_ACTION_ORDER,
        tooltip: NOTIFICATIONS_TITLE,
        visible: auth.isReady && auth.isAuthenticated,
      },
      {
        icon: "solar:logout-2-bold",
        key: SIGN_OUT_ACTION_KEY,
        onClick: () => void signOut(),
        order: SIGN_OUT_ACTION_ORDER,
        tooltip: "Exit",
        visible: auth.isReady && auth.isAuthenticated,
      },
    ],
    [
      auth.isAuthenticated,
      auth.isReady,
      handleOpenNotifications,
      signOut,
      unreadBadge,
    ],
  );

  useDockContextActions(globalActions);

  return null;
}
