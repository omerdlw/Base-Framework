"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useAuth, useRequireAuth } from "../provider";
import { useAccount } from "@/features/account/provider";
import { saveLastKnownAccount, useNavigationActions } from "@/core/modules/nav";
import { EVENT_TYPES, globalEvents } from "@/core/events";
import { useGlobalEvent } from "@/core/hooks";
import { getCurrentPath } from "@/core/utils";
import { resolvePageAuth, usePage } from "@/core/orchestration";
import { createSignInSurfaceEntry } from "./sign-in-surface";

export function AuthEventBridge(): null {
  const auth = useAuth();
  const { account, profile } = useAccount();
  const currentAccount = account || profile || null;
  const previousAccountRef = useRef<any>(null);
  const hasResolvedInitialState = useRef(false);
  const previousUserId = useRef<string | null>(null);
  const previousSession = useRef<any>(null);

  useEffect(() => {
    if (currentAccount) {
      previousAccountRef.current = currentAccount;
      saveLastKnownAccount(currentAccount);
    }
  }, [currentAccount]);

  useEffect(() => {
    if (!auth.isReady) return;

    const userId = auth.user?.id || null;
    const isInitialState = !hasResolvedInitialState.current;

    let isOAuthCallback = false;
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("auth") === "login") {
        isOAuthCallback = true;
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("auth");
        window.history.replaceState(null, "", cleanUrl.toString());
      }
    }

    if (
      (!isInitialState || isOAuthCallback) &&
      userId &&
      (isOAuthCallback || previousUserId.current !== userId)
    ) {
      globalEvents.emit(EVENT_TYPES.AUTH_SIGN_IN, {
        account: currentAccount || previousAccountRef.current,
        session: auth.session,
        userId,
      });
    } else if (!isInitialState && !userId && previousUserId.current) {
      globalEvents.emit(EVENT_TYPES.AUTH_SIGN_OUT, {
        previousAccount: previousAccountRef.current,
        previousSession: previousSession.current,
        userId: previousUserId.current,
      });
    }

    hasResolvedInitialState.current = true;
    previousUserId.current = userId;
    previousSession.current = auth.session;
    globalEvents.emit(EVENT_TYPES.AUTH_READY, {
      isAuthenticated: auth.isAuthenticated,
      userId,
    });
  }, [
    auth.isAuthenticated,
    auth.isReady,
    auth.session,
    auth.user?.id,
    currentAccount,
  ]);

  return null;
}

export function AuthRequiredListener(): null {
  const { openSurface } = useNavigationActions();

  useGlobalEvent(EVENT_TYPES.AUTH_REQUIRED, (payload) => {
    const next = payload?.next || getCurrentPath();
    void openSurface(createSignInSurfaceEntry({ next }));
  });

  return null;
}

export function PageAuthGuard(): null {
  const page = usePage();
  const authOptions = useMemo(
    () => resolvePageAuth(page?.config),
    [page?.config],
  );
  useRequireAuth(authOptions);
  return null;
}

export function AuthListener(): ReactNode {
  return (
    <>
      <AuthEventBridge />
      <AuthRequiredListener />
      <PageAuthGuard />
    </>
  );
}
