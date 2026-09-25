"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useAuth, useRequireAuth } from "../provider";
import { useAccount } from "@/features/account/provider";
import {
  clearLastKnownAccount,
  resolveAuthStatusDetails,
  saveLastKnownAccount,
} from "@/features/account";
import { useDockActions } from "@/core/modules/dock";
import { EVENT_TYPES, globalEvents } from "@/core/events";
import { AUTH_EVENTS, resolvePageAuth } from "../constants";
import { useGlobalEvent } from "@/core/hooks";
import { getCurrentPath } from "@/core/utils";
import { usePageController } from "@/core/orchestration";
import { Spinner } from "@/core/primitives";
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
      const activeAccount = currentAccount || previousAccountRef.current;
      globalEvents.emit(AUTH_EVENTS.AUTH_SIGN_IN, {
        account: activeAccount,
        session: auth.session,
        userId,
      });

      const details = resolveAuthStatusDetails({
        account: activeAccount,
        user: auth.user,
        type: "LOGIN",
      });
      globalEvents.emit(EVENT_TYPES.STATUS_SET, {
        type: "LOGIN",
        title: details.title,
        description: details.description,
        icon: details.icon,
        duration: 3000,
      });
    } else if (!isInitialState && !userId && previousUserId.current) {
      clearLastKnownAccount();
      globalEvents.emit(AUTH_EVENTS.AUTH_SIGN_OUT, {
        previousAccount: previousAccountRef.current,
        previousSession: previousSession.current,
        userId: previousUserId.current,
      });
      globalEvents.emit(EVENT_TYPES.STATUS_SET, {
        type: "LOGOUT",
        title: "Signed out",
        description: "See you soon",
        icon: "solar:logout-2-bold",
        duration: 3000,
      });
    }

    hasResolvedInitialState.current = true;
    previousUserId.current = userId;
    previousSession.current = auth.session;
    globalEvents.emit(AUTH_EVENTS.AUTH_READY, {
      isAuthenticated: auth.isAuthenticated,
      userId,
    });
  }, [
    auth.isAuthenticated,
    auth.isReady,
    auth.session,
    auth.user,
    currentAccount,
  ]);

  return null;
}

export function AuthStatusBridge(): null {
  useGlobalEvent(AUTH_EVENTS.AUTH_FEEDBACK, (eventData: any) => {
    const phase = eventData?.phase?.toLowerCase?.();
    const flow = eventData?.flow;
    const statusType = eventData?.statusType || "LOGIN";

    if (phase === "clear" || phase === "failure") {
      globalEvents.emit(EVENT_TYPES.STATUS_CLEAR, {
        flow,
        type: statusType,
      });
      return;
    }

    globalEvents.emit(EVENT_TYPES.STATUS_SET, {
      type: statusType,
      flow,
      priority: eventData?.priority ?? 110,
      title: eventData?.title || "Account",
      description: eventData?.description || "",
      icon:
        phase === "start" ? (
          <Spinner size={24} />
        ) : phase === "success" ? (
          "material-symbols:check-rounded"
        ) : (
          eventData?.icon
        ),
      duration:
        phase === "success"
          ? Number(eventData?.duration) > 0
            ? Number(eventData.duration)
            : 3000
          : 0,
      themeType: eventData?.themeType || "LOGIN",
    });
  });

  useGlobalEvent(AUTH_EVENTS.AUTH_SIGN_UP, (eventData: any) => {
    const user = eventData?.session?.user || eventData?.user;
    const account = eventData?.account || null;
    const details = resolveAuthStatusDetails({
      account,
      user,
      type: "SIGNUP",
      defaultDescription: "Setting up account",
    });
    globalEvents.emit(EVENT_TYPES.STATUS_SET, {
      type: "SIGNUP",
      title: details.title,
      description: details.description,
      icon: details.icon,
      duration: 3000,
    });
  });

  useGlobalEvent(AUTH_EVENTS.AUTH_ACCOUNT_DELETE_START, (eventData: any) => {
    globalEvents.emit(EVENT_TYPES.STATUS_SET, {
      type: "ACCOUNT_DELETE",
      title: eventData?.user?.name || eventData?.user?.email || "Account",
      description: "Deleting account. This may take a few seconds",
      icon: <Spinner size={24} />,
      duration: 0,
    });
  });

  useGlobalEvent(AUTH_EVENTS.AUTH_ACCOUNT_DELETE_END, (eventData: any) => {
    if (eventData?.status === "failure") {
      globalEvents.emit(EVENT_TYPES.STATUS_CLEAR, {
        type: "ACCOUNT_DELETE",
      });
    }
  });

  return null;
}

export function AuthRequiredListener(): null {
  const { openSurface } = useDockActions();

  useGlobalEvent(AUTH_EVENTS.AUTH_REQUIRED, (payload) => {
    const next = payload?.next || getCurrentPath();
    void openSurface(createSignInSurfaceEntry({ next }));
  });

  return null;
}

export function PageAuthGuard(): null {
  const page = usePageController();
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
      <AuthStatusBridge />
      <AuthRequiredListener />
      <PageAuthGuard />
    </>
  );
}

