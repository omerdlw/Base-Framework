"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
  type SyntheticEvent,
} from "react";
import { useAuth, createSignInSurfaceEntry } from "@/features/auth";
import { useDockActions } from "@/core/modules/dock";
import { globalEvents } from "@/core/events";
import { useGlobalEvent } from "@/core/hooks";
import { REGISTRY_SOURCES, usePage } from "@/core/orchestration";
import {
  createAccountSettingsSurfaceEntry,
  type AccountData,
  getFollowState,
  SOCIAL_EVENTS,
} from "@/features/account";
import {
  followUserAction,
  unfollowUserAction,
} from "@/features/account/server/actions";

const DEFAULT_ACCOUNT_ICON = "solar:user-circle-bold";
const FOLLOW_ACTION_KEY = "social.follow";
const FOLLOW_ACTION_ORDER = 10;
const SETTINGS_ACCOUNT_ACTION_KEY = "account.settings";
const SETTINGS_ACCOUNT_ACTION_ORDER = 10;

export interface AccountRegistryProps {
  account?: AccountData | null;
  initialFollowStatus?: string | null;
  isOwner?: boolean;
}

export function AccountRegistry({
  account,
  initialFollowStatus = null,
  isOwner: isOwnerProp = false,
}: AccountRegistryProps): null {
  const auth = useAuth();
  const isOwner =
    isOwnerProp ||
    Boolean(
      auth.isAuthenticated &&
      auth.user?.id &&
      account?.id &&
      auth.user.id === account.id,
    );
  const { openSurface } = useDockActions();
  const targetUserId = account?.id;
  const targetUsername = account?.username;

  const targetDockConfig = useMemo(() => {
    if (isOwner || !account?.username) return null;
    return {
      bannerUrl: account.bannerUrl || null,
      bannerPosition: account.bannerPosition || null,
      description: `@${account.username}`,
      icon: account.avatarUrl || DEFAULT_ACCOUNT_ICON,
      path: `/account/${encodeURIComponent(account.username)}`,
      title: account.displayName || account.username || "Account",
    };
  }, [
    account?.avatarUrl,
    account?.bannerPosition,
    account?.bannerUrl,
    account?.displayName,
    account?.username,
    isOwner,
  ]);

  const [followStatus, setFollowStatus] = useState<string | null>(
    initialFollowStatus,
  );
  const [prevInitialStatus, setPrevInitialStatus] = useState<string | null>(
    initialFollowStatus,
  );
  const [isPending, startTransition] = useTransition();

  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    followStatus,
    (_current, nextStatus: string | null) => nextStatus,
  );

  if (initialFollowStatus !== prevInitialStatus) {
    setPrevInitialStatus(initialFollowStatus);
    setFollowStatus(initialFollowStatus);
  }

  useEffect(() => {
    if (!auth.isAuthenticated || !targetUserId || isOwner) return;
    void getFollowState(targetUserId)
      .then(setFollowStatus)
      .catch(() => null);
  }, [auth.isAuthenticated, isOwner, targetUserId]);

  useGlobalEvent(
    !isOwner && targetUserId ? SOCIAL_EVENTS.FOLLOW_CHANGE : null,
    (payload: any) => {
      if (payload?.followingId === targetUserId) {
        setFollowStatus(payload.status);
      }
    },
  );

  const toggleFollow = useCallback(
    (event?: SyntheticEvent) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (!auth.isAuthenticated) {
        void openSurface(
          createSignInSurfaceEntry({ next: window.location.pathname }),
        );
        return;
      }
      if (isPending || !targetUserId) return;

      startTransition(async () => {
        const isCurrentlyFollowing =
          optimisticStatus === "accepted" || optimisticStatus === "pending";
        const nextExpected = isCurrentlyFollowing ? null : "accepted";
        setOptimisticStatus(nextExpected);

        try {
          const result = isCurrentlyFollowing
            ? await unfollowUserAction(targetUserId, targetUsername)
            : await followUserAction(targetUserId, targetUsername);

          if (result.success) {
            const nextStatus = result.status;
            setFollowStatus(nextStatus);
            globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
              followingId: targetUserId,
              status: nextStatus,
            });
          }
        } catch (error) {
          console.error("[Social] Failed to update follow status:", error);
        }
      });
    },
    [
      auth.isAuthenticated,
      isPending,
      openSurface,
      optimisticStatus,
      setOptimisticStatus,
      targetUserId,
      targetUsername,
    ],
  );

  const openAccountSettings = useCallback(() => {
    void openSurface(createAccountSettingsSurfaceEntry("overview"));
  }, [openSurface]);

  const isFollowing = optimisticStatus === "accepted";
  const isRequested = optimisticStatus === "pending";

  const actions = useMemo(() => {
    if (isOwner) {
      return [
        {
          icon: "solar:settings-bold",
          key: SETTINGS_ACCOUNT_ACTION_KEY,
          onClick: openAccountSettings,
          order: SETTINGS_ACCOUNT_ACTION_ORDER,
          tooltip: "Account settings",
          visible: auth.isReady && auth.isAuthenticated,
        },
      ];
    }

    if (!targetUserId) return [];

    let icon = "solar:user-plus-bold";
    let tooltip = targetUsername ? `Follow @${targetUsername}` : "Follow";

    if (isPending) {
      icon = "svg-spinners:90-ring-with-bg";
      tooltip = "Updating...";
    } else if (isFollowing) {
      icon = "solar:user-cross-bold";
      tooltip = targetUsername ? `Unfollow @${targetUsername}` : "Unfollow";
    } else if (isRequested) {
      icon = "solar:user-cross-bold";
      tooltip = "Cancel follow request";
    }

    return [
      {
        disabled: isPending,
        icon,
        key: FOLLOW_ACTION_KEY,
        onClick: toggleFollow,
        order: FOLLOW_ACTION_ORDER,
        tooltip,
        visible: Boolean(targetUserId),
      },
    ];
  }, [
    auth.isAuthenticated,
    auth.isReady,
    isFollowing,
    isOwner,
    isPending,
    isRequested,
    openAccountSettings,
    targetUserId,
    targetUsername,
    toggleFollow,
  ]);

  usePage(
    {
      actions,
      dock: targetDockConfig,
    },
    {
      priority: 250,
      source: REGISTRY_SOURCES.DYNAMIC,
    },
  );

  return null;
}
