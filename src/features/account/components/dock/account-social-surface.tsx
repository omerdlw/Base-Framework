"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

import { useAuth } from "@/features/auth";
import {
  DockSurfaceExtension,
  dockFadeVariants,
  dockListItemVariants,
  type SurfaceEntry,
} from "@/core/modules/dock";
import { useToast } from "@/core/modules/notification";
import {
  FOLLOW_STATUSES,
  acceptFollowRequest,
  fetchFollowRequests,
  fetchFollowers,
  fetchFollowing,
  followUser,
  rejectFollowRequest,
  removeFollower,
  unfollowUser,
} from "../../social/client/follows";
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from "../../utils";
import { SOCIAL_EVENTS } from "../../constants";
import { globalEvents } from "@/core/events";
import { useGlobalEvent } from "@/core/hooks";
import { isValidBannerUrl } from "@/core/modules/dock";
import { cn } from "@/core/utils";
import AdaptiveImage from "@/core/primitives/adaptive-image";
import { Button, Icon, Loader } from "@/core/primitives";

const TABS = Object.freeze({
  FOLLOWERS: "followers",
  FOLLOWING: "following",
  INBOX: "inbox",
} as const);

type TabType = (typeof TABS)[keyof typeof TABS];

const ACTION_KEYS = Object.freeze({
  ACCEPT: "accept",
  REJECT: "reject",
  UNFOLLOW: "unfollow",
  REMOVE: "remove-follower",
  FOLLOW: "follow",
} as const);

type ActionKey = (typeof ACTION_KEYS)[keyof typeof ACTION_KEYS];

const BUTTON_BASE_CLASS =
  "center h-9 shrink-0 gap-1.5 rounded-[14px] px-3.5 text-xs font-semibold select-none transition-colors duration-200 cursor-pointer active:scale-98 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-white/50";

const PRIMARY_BUTTON_CLASS = `${BUTTON_BASE_CLASS} bg-primary/10 text-primary hover:bg-primary hover:text-black focus-visible:bg-primary focus-visible:text-black`;
const SECONDARY_BUTTON_CLASS = `${BUTTON_BASE_CLASS} bg-white/5 text-white/70 hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white`;
const DISABLED_BUTTON_CLASS = `${BUTTON_BASE_CLASS} bg-white/5 text-white/50 cursor-default`;

export interface SocialUser {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  displayName: string;
  status: string;
  [key: string]: unknown;
}

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

function normalizeTab(value?: unknown): TabType {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "following") return TABS.FOLLOWING;
  if (normalized === "requests" || normalized === TABS.INBOX) return TABS.INBOX;
  return TABS.FOLLOWERS;
}

function hydrateFollowUsers(list?: unknown): SocialUser[] {
  return (Array.isArray(list) ? list : [])
    .map((item: any) => ({
      id: item.userId || item.id,
      username: item.username || null,
      avatarUrl: item.avatarUrl || item.avatar_url || null,
      bannerUrl: item.bannerUrl || item.banner_url || null,
      displayName:
        item.displayName ||
        item.display_name ||
        item.username ||
        "Anonymous User",
      status: item.status || FOLLOW_STATUSES.ACCEPTED,
    }))
    .filter((item) => item.id);
}

function resolveCollectionErrorMessage(error: any, tab: TabType): string {
  const status = Number(error?.status || 0);
  if (status === 403)
    return tab === TABS.INBOX
      ? "You are not allowed to view pending follow requests"
      : "This account is private";
  if (status === 401) return "Your session has expired. Please sign in again";
  return tab === TABS.INBOX
    ? "Pending follow requests could not be loaded"
    : `Could not load ${tab}`;
}

function buildFollowingStatusMap(
  list: any[] = [],
  fallbackStatus: string = FOLLOW_STATUSES.ACCEPTED,
): Record<string, string> {
  return (Array.isArray(list) ? list : []).reduce<Record<string, string>>(
    (acc, item) => {
      const id = item?.userId || item?.id;
      if (id) acc[id] = item?.status || fallbackStatus;
      return acc;
    },
    {},
  );
}

function useSocialCollection(
  fetchFn: (param?: any) => Promise<any>,
  param?: any,
  enabled = true,
) {
  const [state, setState] = useState<{
    list: SocialUser[];
    isLoading: boolean;
    error: any;
  }>({
    list: [],
    isLoading: enabled,
    error: null,
  });

  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetcher = useCallback(async () => {
    if (!enabled) {
      setState((s) => (s.isLoading ? { ...s, isLoading: false } : s));
      return;
    }

    const requestId = ++requestIdRef.current;
    setState((s) => ({ ...s, isLoading: s.list.length === 0, error: null }));

    try {
      const res = await fetchFn(param);
      if (mountedRef.current && requestId === requestIdRef.current) {
        setState({
          list: hydrateFollowUsers(res),
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setState((s) => ({ ...s, isLoading: false, error }));
      }
    }
  }, [fetchFn, param, enabled]);

  useEffect(() => {
    void fetcher();
  }, [fetcher]);

  return { state, setState, reload: fetcher };
}

interface UserActionProps {
  tab: TabType;
  user: SocialUser;
  authUserId?: string | null;
  isOwnProfile: boolean;
  pendingKind?: ActionKey | null;
  followStatus?: string | null;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onUnfollow: (id: string) => void;
  onRemoveFollower: (id: string) => void;
  onFollow: (id: string) => void;
}

const UserAction = memo(function UserAction({
  tab,
  user,
  authUserId,
  isOwnProfile,
  pendingKind,
  followStatus,
  onAccept,
  onReject,
  onUnfollow,
  onRemoveFollower,
  onFollow,
}: UserActionProps) {
  const isPending = Boolean(pendingKind);
  const canShowFollowAction =
    tab !== TABS.INBOX &&
    Boolean(authUserId) &&
    !isOwnProfile &&
    authUserId !== user.id;

  if (tab === TABS.INBOX) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Button
          onClick={() => onAccept(user.id)}
          disabled={isPending}
          className={PRIMARY_BUTTON_CLASS}
          aria-label="Accept"
        >
          {pendingKind === ACTION_KEYS.ACCEPT ? (
            <Loader>
              <Icon icon="solar:check-circle-bold" size={14} />
              <span>Accept</span>
            </Loader>
          ) : (
            <>
              <Icon icon="solar:check-circle-bold" size={14} />
              <span>Accept</span>
            </>
          )}
        </Button>
        <Button
          onClick={() => onReject(user.id)}
          disabled={isPending}
          className={SECONDARY_BUTTON_CLASS}
          aria-label="Reject"
        >
          {pendingKind === ACTION_KEYS.REJECT ? (
            <Loader>
              <Icon icon="solar:close-circle-bold" size={14} />
              <span>Reject</span>
            </Loader>
          ) : (
            <>
              <Icon icon="solar:close-circle-bold" size={14} />
              <span>Reject</span>
            </>
          )}
        </Button>
      </div>
    );
  }

  if (tab === TABS.FOLLOWING && isOwnProfile) {
    return (
      <Button
        onClick={() => onUnfollow(user.id)}
        disabled={isPending}
        className={SECONDARY_BUTTON_CLASS}
        aria-label="Unfollow"
      >
        {pendingKind === ACTION_KEYS.UNFOLLOW ? (
          <Loader>
            <Icon icon="solar:user-minus-bold" size={14} />
            <span>Unfollow</span>
          </Loader>
        ) : (
          <>
            <Icon icon="solar:user-minus-bold" size={14} />
            <span>Unfollow</span>
          </>
        )}
      </Button>
    );
  }

  if (tab === TABS.FOLLOWERS && isOwnProfile) {
    return (
      <Button
        onClick={() => onRemoveFollower(user.id)}
        disabled={isPending}
        className={SECONDARY_BUTTON_CLASS}
        aria-label="Remove"
      >
        {pendingKind === ACTION_KEYS.REMOVE ? (
          <Loader>
            <Icon icon="solar:user-cross-bold" size={14} />
            <span>Remove</span>
          </Loader>
        ) : (
          <>
            <Icon icon="solar:user-cross-bold" size={14} />
            <span>Remove</span>
          </>
        )}
      </Button>
    );
  }

  if (canShowFollowAction) {
    const isFollowPending = followStatus === FOLLOW_STATUSES.PENDING;
    const isFollowAccepted = followStatus === FOLLOW_STATUSES.ACCEPTED;

    const followLabel = isFollowAccepted
      ? "Following"
      : isFollowPending
        ? "Requested"
        : "Follow";
    const followIcon = isFollowAccepted
      ? "solar:user-check-bold"
      : isFollowPending
        ? "solar:clock-circle-bold"
        : "solar:user-plus-bold";
    const btnClass = isFollowPending
      ? DISABLED_BUTTON_CLASS
      : isFollowAccepted
        ? SECONDARY_BUTTON_CLASS
        : PRIMARY_BUTTON_CLASS;

    return (
      <Button
        onClick={() =>
          isFollowAccepted ? onUnfollow(user.id) : onFollow(user.id)
        }
        disabled={isPending || isFollowPending}
        className={btnClass}
        aria-label={followLabel}
      >
        <Icon icon={followIcon} size={14} />
        <span>{followLabel}</span>
      </Button>
    );
  }

  return null;
});

interface SocialUserRowProps {
  close?: () => void;
  user: SocialUser;
  action?: ReactNode;
  index: number;
}

const SocialUserRow = memo(function SocialUserRow({
  close,
  user,
  action,
  index,
}: SocialUserRowProps) {
  const avatarSrc = getUserAvatarUrl(user);
  const avatarFallbackSrc = getUserAvatarFallbackUrl(user);
  const hasBanner = isValidBannerUrl(user?.bannerUrl);

  return (
    <motion.div
      variants={dockListItemVariants}
      custom={index}
      initial="hidden"
      animate="visible"
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
              backgroundImage: `url("${user.bannerUrl}")`,
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.65) 70%, black 100%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
        </div>
      )}

      <Link
        href={`/account/${user.username || user.id}`}
        onClick={close}
        className="relative z-10 flex h-full min-w-0 flex-1 items-center gap-2.5"
      >
        <div className="relative size-12 shrink-0 overflow-hidden rounded-[20px] bg-white/5">
          <AdaptiveImage
            mode="img"
            src={avatarSrc}
            alt={user.displayName}
            loading="lazy"
            decoding="async"
            className="size-full rounded-[inherit] object-cover transition-transform duration-300 group-hover/user:scale-105"
            onError={(e) => applyAvatarFallback(e, avatarFallbackSrc)}
            wrapperClassName="size-full rounded-[inherit]"
          />
        </div>
        <div className="flex h-full min-w-0 flex-1 flex-col justify-center gap-0.5">
          <span className="truncate text-sm font-semibold text-white leading-tight">
            {user.displayName}
          </span>
          <span className="truncate text-xs text-white/70 leading-tight">
            @{user.username || "user"}
          </span>
        </div>
      </Link>
      {action ? (
        <div className="relative z-10 mr-1.5 flex shrink-0 items-center">
          {action}
        </div>
      ) : null}
    </motion.div>
  );
});

function LoadingList() {
  return (
    <div className="flex w-full flex-col gap-2.5">
      {Array.from({ length: 4 }, (_, index) => (
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
          <div className="skeleton-block mr-1.5 h-9 w-20 shrink-0 rounded-[14px]" />
        </div>
      ))}
    </div>
  );
}

export interface AccountSocialData {
  account?: any;
  avatarUrl?: string | null;
  canManageRequests?: boolean;
  displayName?: string;
  profile?: any;
  tab?: string;
  type?: string;
  userId?: string | null;
  username?: string;
  [key: string]: unknown;
}

export function createAccountSocialSurfaceEntry(
  data: AccountSocialData = {},
  config: Partial<SurfaceEntry> = {},
): SurfaceEntry {
  const account = data?.account || data?.profile || null;
  const username = data?.username || account?.username || "";
  const displayName = String(
    data?.displayName ||
    account?.displayName ||
    account?.display_name ||
    username ||
    "Social",
  ).trim();
  const icon =
    data?.avatarUrl ||
    (account ? getUserAvatarUrl(account) : "solar:users-group-rounded-bold");

  const tab = normalizeTab(data?.tab || data?.type);
  const tabLabel =
    tab === TABS.INBOX
      ? "Follow Requests"
      : tab === TABS.FOLLOWING
        ? "Following"
        : "Followers";

  return {
    component: AccountSocialSurface,
    icon,
    title: displayName,
    description: tabLabel,
    props: { data },
    expandHorizontal: false,
    ...config,
  };
}

export interface AccountSocialSurfaceProps {
  close?: () => void;
  data?: AccountSocialData;
}

export function AccountSocialSurface({
  close,
  data,
}: AccountSocialSurfaceProps) {
  const auth = useAuth();
  const toast = useToast();

  const authUserId = auth.user?.id || null;
  const userId = String(data?.userId || "").trim() || authUserId;
  const isOwnProfile = Boolean(authUserId) && authUserId === userId;
  const canManageRequests = Boolean(data?.canManageRequests) || isOwnProfile;
  const isAuthSessionReady = Boolean(
    auth.isReady && auth.isAuthenticated && authUserId,
  );

  const [activeTab, setActiveTab] = useState<TabType>(() =>
    normalizeTab(data?.tab || data?.type),
  );
  const [pendingActionByUserId, setPendingActionByUserId] = useState<
    Record<string, ActionKey>
  >({});
  const [followingStatusMap, setFollowingStatusMap] = useState<
    Record<string, string>
  >({});

  const {
    state: followersState,
    setState: setFollowersState,
    reload: reloadFollowers,
  } = useSocialCollection(fetchFollowers, userId, !!userId);
  const {
    state: followingState,
    setState: setFollowingState,
    reload: reloadFollowing,
  } = useSocialCollection(fetchFollowing, userId, !!userId);
  const {
    state: requestsState,
    setState: setRequestsState,
    reload: reloadRequests,
  } = useSocialCollection(
    fetchFollowRequests,
    undefined,
    canManageRequests && isAuthSessionReady,
  );

  const { state: authFollowingState, reload: reloadAuthFollowing } =
    useSocialCollection(fetchFollowing, authUserId, isAuthSessionReady);

  const [prevAuthList, setPrevAuthList] = useState(authFollowingState.list);
  if (prevAuthList !== authFollowingState.list) {
    setPrevAuthList(authFollowingState.list);
    setFollowingStatusMap(buildFollowingStatusMap(authFollowingState.list));
  }

  useGlobalEvent(
    SOCIAL_EVENTS.FOLLOW_CHANGE,
    () => {
      if (userId) {
        reloadFollowers();
        reloadFollowing();
      }
      if (authUserId) reloadAuthFollowing();
    },
    { debounceMs: 250 },
  );

  useGlobalEvent(
    SOCIAL_EVENTS.INBOX_CHANGE,
    () => {
      if (canManageRequests && authUserId) reloadRequests();
    },
    { debounceMs: 250 },
  );

  const runAction = useCallback(
    async ({
      targetId,
      actionKey,
      actionFn,
      errorMsg,
      onOptimistic,
      onRollback,
    }: {
      targetId: string;
      actionKey: ActionKey;
      actionFn: () => Promise<void>;
      errorMsg: string;
      onOptimistic?: () => void;
      onRollback?: () => void;
    }) => {
      if (!authUserId || pendingActionByUserId[targetId]) return;

      setPendingActionByUserId((curr) => ({ ...curr, [targetId]: actionKey }));
      onOptimistic?.();

      try {
        await actionFn();
      } catch (error: any) {
        onRollback?.();
        toast(error?.message || errorMsg);
      } finally {
        setPendingActionByUserId((curr) => {
          const next = { ...curr };
          delete next[targetId];
          return next;
        });
      }
    },
    [authUserId, pendingActionByUserId, toast],
  );

  const handleAccept = useCallback(
    (id: string) => {
      let previousList: SocialUser[] = [];
      runAction({
        targetId: id,
        actionKey: ACTION_KEYS.ACCEPT,
        actionFn: async () => {
          await acceptFollowRequest(id);
          globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
            followingId: authUserId,
            status: "accepted",
          });
          globalEvents.emit(SOCIAL_EVENTS.INBOX_CHANGE);
        },
        errorMsg: "Request could not be accepted",
        onOptimistic: () =>
          setRequestsState((prev) => {
            previousList = prev.list;
            return { ...prev, list: prev.list.filter((u) => u.id !== id) };
          }),
        onRollback: () =>
          setRequestsState((prev) => ({ ...prev, list: previousList })),
      });
    },
    [authUserId, runAction, setRequestsState],
  );

  const handleReject = useCallback(
    (id: string) => {
      let previousList: SocialUser[] = [];
      runAction({
        targetId: id,
        actionKey: ACTION_KEYS.REJECT,
        actionFn: async () => {
          await rejectFollowRequest(id);
          globalEvents.emit(SOCIAL_EVENTS.INBOX_CHANGE);
        },
        errorMsg: "Request could not be rejected",
        onOptimistic: () =>
          setRequestsState((prev) => {
            previousList = prev.list;
            return { ...prev, list: prev.list.filter((u) => u.id !== id) };
          }),
        onRollback: () =>
          setRequestsState((prev) => ({ ...prev, list: previousList })),
      });
    },
    [runAction, setRequestsState],
  );

  const handleUnfollow = useCallback(
    (id: string) => {
      let previousMap: Record<string, string> = {};
      let previousList: SocialUser[] = [];
      runAction({
        targetId: id,
        actionKey: ACTION_KEYS.UNFOLLOW,
        actionFn: async () => {
          await unfollowUser(id);
          globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
            followingId: id,
            status: null,
          });
        },
        errorMsg: "Could not unfollow this user",
        onOptimistic: () => {
          setFollowingStatusMap((prev) => {
            previousMap = prev;
            const next = { ...prev };
            delete next[id];
            return next;
          });
          if (isOwnProfile)
            setFollowingState((prev) => {
              previousList = prev.list;
              return { ...prev, list: prev.list.filter((u) => u.id !== id) };
            });
        },
        onRollback: () => {
          setFollowingStatusMap(previousMap);
          if (isOwnProfile)
            setFollowingState((prev) => ({ ...prev, list: previousList }));
        },
      });
    },
    [isOwnProfile, runAction, setFollowingState],
  );

  const handleRemoveFollower = useCallback(
    (id: string) => {
      let previousList: SocialUser[] = [];
      runAction({
        targetId: id,
        actionKey: ACTION_KEYS.REMOVE,
        actionFn: async () => {
          await removeFollower(id);
          globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
            followingId: authUserId,
            status: null,
          });
        },
        errorMsg: "Could not remove follower",
        onOptimistic: () =>
          setFollowersState((prev) => {
            previousList = prev.list;
            return { ...prev, list: prev.list.filter((u) => u.id !== id) };
          }),
        onRollback: () =>
          setFollowersState((prev) => ({ ...prev, list: previousList })),
      });
    },
    [authUserId, runAction, setFollowersState],
  );

  const handleFollow = useCallback(
    (id: string) => {
      let previousMap: Record<string, string> = {};
      runAction({
        targetId: id,
        actionKey: ACTION_KEYS.FOLLOW,
        actionFn: async () => {
          const status = await followUser(id);
          globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
            followingId: id,
            status,
          });
        },
        errorMsg: "Could not follow this user",
        onOptimistic: () =>
          setFollowingStatusMap((prev) => {
            previousMap = prev;
            return { ...prev, [id]: FOLLOW_STATUSES.ACCEPTED };
          }),
        onRollback: () => setFollowingStatusMap(previousMap),
      });
    },
    [runAction],
  );

  const shouldShowInboxTab =
    canManageRequests &&
    (requestsState.isLoading ||
      requestsState.list.length > 0 ||
      Boolean(requestsState.error));

  const tabs = useMemo(() => {
    const list: { key: TabType; label: string; count: number }[] = [
      {
        key: TABS.FOLLOWING,
        label: "Following",
        count: followingState.list.length,
      },
      {
        key: TABS.FOLLOWERS,
        label: "Followers",
        count: followersState.list.length,
      },
    ];
    if (shouldShowInboxTab)
      list.push({
        key: TABS.INBOX,
        label: "Inbox",
        count: requestsState.list.length,
      });
    return list;
  }, [
    followingState.list.length,
    followersState.list.length,
    shouldShowInboxTab,
    requestsState.list.length,
  ]);

  const activeDataState =
    activeTab === TABS.INBOX
      ? requestsState
      : activeTab === TABS.FOLLOWING
        ? followingState
        : followersState;
  const { list, isLoading, error: activeError } = activeDataState;
  const activeErrorMessage = activeError
    ? resolveCollectionErrorMessage(activeError, activeTab)
    : null;
  const emptyDescription =
    activeTab === TABS.INBOX
      ? "No pending follow requests"
      : `No ${activeTab} yet`;

  return (
    <div className="flex w-full flex-col overflow-hidden">
      <DockSurfaceExtension id="account-social-tabs" align="center">
        <div className="flex h-8 shrink-0 items-center gap-1.5 select-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex h-full shrink-0 cursor-pointer items-center gap-2 rounded-full px-3.5 text-xs font-semibold transition-all duration-200 select-none",
                  isActive
                    ? "bg-white text-black"
                    : "bg-transparent text-white/70 hover:bg-white/5 hover:text-white focus-visible:bg-white/10 focus-visible:text-white",
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "text-xs font-bold tabular-nums",
                      isActive ? "text-black/80" : "text-white/50",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </DockSurfaceExtension>

      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.div
            key={`loading-${activeTab}`}
            variants={dockFadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full"
          >
            <LoadingList />
          </motion.div>
        ) : activeErrorMessage ? (
          <motion.div
            key={`error-${activeTab}`}
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
                Unable to load {activeTab}
              </p>
              <p className="truncate text-xs text-white/70 leading-tight">
                {activeErrorMessage}
              </p>
            </div>
          </motion.div>
        ) : list.length === 0 ? (
          <motion.div
            key={`empty-${activeTab}`}
            variants={dockFadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex h-12 min-h-[48px] w-full items-center gap-2.5"
          >
            <div className="center size-12 shrink-0 rounded-[20px] bg-white/5 text-white/50">
              <Icon
                icon={
                  activeTab === TABS.INBOX
                    ? "solar:inbox-line-bold"
                    : "solar:users-group-rounded-bold"
                }
                size={22}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              <p className="truncate text-sm font-semibold text-white leading-tight">
                {emptyDescription}
              </p>
              <p className="truncate text-xs text-white/70 leading-tight">
                {activeTab === TABS.INBOX
                  ? "Incoming follow requests will appear here"
                  : `No ${activeTab} yet for this account`}
              </p>
            </div>
          </motion.div>
        ) : (
          <div
            key={`users-container-${activeTab}`}
            data-lenis-prevent
            data-lenis-prevent-wheel
            onWheel={handleListWheel}
            className="max-h-[min(54dvh,24rem)] w-full touch-pan-y scrollbar-none overflow-y-auto overscroll-contain rounded-[20px]"
          >
            <motion.div
              key={`users-list-${activeTab}`}
              variants={dockFadeVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex min-h-[48px] w-full flex-col justify-center gap-2.5 overflow-visible"
            >
              {list.map((user, index) => (
                <SocialUserRow
                  key={user.id}
                  close={close}
                  user={user}
                  index={index}
                  action={
                    <UserAction
                      tab={activeTab}
                      user={user}
                      authUserId={authUserId}
                      isOwnProfile={isOwnProfile}
                      pendingKind={pendingActionByUserId[user.id] || null}
                      followStatus={followingStatusMap[user.id] || null}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onUnfollow={handleUnfollow}
                      onRemoveFollower={handleRemoveFollower}
                      onFollow={handleFollow}
                    />
                  }
                />
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AccountSocialSurface;
