"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/provider";
import { useModal } from "@/core/modules/modal";
import { useNavContextActions } from "@/core/modules/nav";
import { useGlobalEvent } from "@/core/hooks";
import { fetchUnreadCount } from "../../social";
import {
  NOTIFICATIONS_ACTION_KEY,
  NOTIFICATIONS_ACTION_ORDER,
  NOTIFICATIONS_ICON,
  NOTIFICATIONS_TITLE,
  SIGN_OUT_ACTION_KEY,
  SIGN_OUT_ACTION_ORDER,
  SOCIAL_EVENTS,
} from "../../constants";

export function AccountNavActions(): null {
  const auth = useAuth();
  const router = useRouter();
  const { openModal, closeModal, isOpen, modalType } = useModal();

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
      if (isOpen && modalType === "NOTIFICATIONS_MODAL") {
        closeModal();
        return;
      }
      openModal("NOTIFICATIONS_MODAL", "left", {
        data: { userId: auth.user?.id ?? null },
        title: "Notifications",
      });
    },
    [auth.user?.id, closeModal, isOpen, modalType, openModal],
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

  useNavContextActions(globalActions);

  return null;
}
