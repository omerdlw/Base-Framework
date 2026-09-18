"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "../provider";
import { useAuth } from "@/features/auth/provider";
import { useNavigationActions } from "@/core/modules/nav";
import { REGISTRY_SOURCES, useNavRegistration } from "@/core/orchestration";
import { useGlobalEvent } from "@/core/hooks";
import { getCurrentPath } from "@/core/utils";
import { AccountAction } from "./nav/account-action";
import { createAccountSetupSurfaceEntry } from "./nav/account-setup-surface";
import { createAccountSocialSurfaceEntry } from "./nav/account-social-surface";
import { fetchInboxCount } from "../social";
import { createSignInSurfaceEntry } from "@/features/auth";
import { DEFAULT_ACCOUNT_ICON, SOCIAL_EVENTS } from "../constants";

export function AccountRouteNavGuard(): null {
  const auth = useAuth();
  const { account: accountFromHook, profile: profileFromHook } = useAccount();
  const account = accountFromHook || profileFromHook;
  const pathname = usePathname();
  const router = useRouter();
  const { openSurface } = useNavigationActions();
  const promptedSignInPath = useRef<string | null>(null);
  const isAccountEntryPath = pathname === "/account";

  const [rawInboxCount, setRawInboxCount] = useState(0);
  const inboxCount =
    auth.isAuthenticated && account?.isPrivate ? rawInboxCount : 0;

  const ownAccountPath = account?.username
    ? `/account/${encodeURIComponent(account.username)}`
    : "/account";
  const isAccountOwnerView =
    pathname === "/account" || pathname === ownAccountPath;

  useEffect(() => {
    if (!auth.isAuthenticated || !account?.isPrivate) return;
    let active = true;
    void fetchInboxCount()
      .then((count: number) => {
        if (active) setRawInboxCount(count);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [account?.isPrivate, auth.isAuthenticated]);

  useGlobalEvent(
    SOCIAL_EVENTS.INBOX_CHANGE,
    () => {
      if (auth.isAuthenticated && account?.isPrivate) {
        void fetchInboxCount()
          .then(setRawInboxCount)
          .catch(() => null);
      }
    },
    { debounceMs: 150 },
  );

  const openAccountInbox = useCallback(() => {
    if (!account) return;
    void openSurface(
      createAccountSocialSurfaceEntry({
        canManageRequests: true,
        displayName: account.displayName,
        tab: "inbox",
        userId: account.id,
        username: account.username,
      }),
    );
  }, [account, openSurface]);

  const username = account?.username ? `@${account.username}` : null;
  const bannerPosition =
    (account as any)?.bannerPosition ||
    (account as any)?.banner_position ||
    null;
  const avatarUrl = account?.avatarUrl;
  const bannerUrl = account?.bannerUrl;
  const displayName = account?.displayName;
  const isPrivate = account?.isPrivate;

  const accountNavConfig = useMemo(
    () => ({
      action:
        auth.isAuthenticated &&
        isAccountOwnerView &&
        isPrivate &&
        inboxCount > 0 ? (
          <AccountAction
            canManageRequests={true}
            inboxCount={inboxCount}
            isOwner={isAccountOwnerView}
            onOpenInbox={openAccountInbox}
          />
        ) : null,
      bannerUrl: auth.isAuthenticated ? bannerUrl || null : null,
      bannerPosition: auth.isAuthenticated ? bannerPosition : null,
      description: (auth.isAuthenticated && username) || "Manage your account",
      icon: (auth.isAuthenticated && avatarUrl) || DEFAULT_ACCOUNT_ICON,
      keepWhenDescendant: (activePath?: any) =>
        Boolean(
          activePath &&
          String(activePath).startsWith("/account") &&
          activePath !== "/account" &&
          activePath !== ownAccountPath,
        ),
      path: "/account",
      targetPath: ownAccountPath,
      title: (auth.isAuthenticated && displayName) || "Account",
    }),
    [
      auth.isAuthenticated,
      avatarUrl,
      bannerPosition,
      bannerUrl,
      displayName,
      inboxCount,
      isAccountOwnerView,
      isPrivate,
      openAccountInbox,
      ownAccountPath,
      username,
    ],
  );

  useNavRegistration(accountNavConfig, {
    priority: 200,
    source: REGISTRY_SOURCES.DYNAMIC,
  });

  useEffect(() => {
    if (auth.isAuthenticated || !isAccountEntryPath) {
      promptedSignInPath.current = null;
      return;
    }

    if (!auth.isReady || promptedSignInPath.current === pathname) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || promptedSignInPath.current === pathname) return;
      promptedSignInPath.current = pathname;
      void openSurface(
        createSignInSurfaceEntry({
          next: getCurrentPath(),
        }),
      ).then((result: any) => {
        if (cancelled) return;
        if (
          !result?.success &&
          typeof window !== "undefined" &&
          window.location.pathname === "/account"
        ) {
          router.replace("/");
        }
        promptedSignInPath.current = null;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    auth.isAuthenticated,
    auth.isReady,
    isAccountEntryPath,
    openSurface,
    pathname,
    router,
  ]);

  return null;
}

export function OAuthAccountSetupGuard(): null {
  const auth = useAuth();
  const { openSurface } = useNavigationActions();
  const router = useRouter();
  const pathname = usePathname();
  const hasPrompted = useRef(false);

  useEffect(() => {
    if (!auth.isReady || !auth.isAuthenticated) return;
    if (hasPrompted.current) return;

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("setup") !== "account") return;

    hasPrompted.current = true;
    const next = searchParams.get("next") || "/account";

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("setup");
    cleanUrl.searchParams.delete("next");
    window.history.replaceState(null, "", cleanUrl.toString());

    queueMicrotask(() => {
      void openSurface(createAccountSetupSurfaceEntry({ next })).then(
        (result: any) => {
          if (!result?.success) return;
        },
      );
    });
  }, [auth.isAuthenticated, auth.isReady, openSurface, router, pathname]);

  return null;
}

export function AccountGuard(): ReactNode {
  return (
    <>
      <AccountRouteNavGuard />
      <OAuthAccountSetupGuard />
    </>
  );
}
