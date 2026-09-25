"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/infrastructure/env";
import { createBrowserSupabaseClient } from "@/infrastructure/supabase/client";
import { globalEvents } from "@/core/events";
import { AUTH_EVENTS, INITIAL_AUTH_STATE } from "./constants";
import { signOut as signOutClient } from "./client";
import { resolveAuthState } from "./utils";
import type {
  AuthContextValue,
  AuthState,
  RequireAuthOptions,
  RequireAuthResult,
} from "./types";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children?: ReactNode }) {
  const configured = isSupabaseConfigured();

  const [state, setState] = useState<AuthState>(() => ({
    ...INITIAL_AUTH_STATE,
    isConfigured: configured,
    isReady: !configured,
  }));

  const client = useMemo(
    () => (configured ? createBrowserSupabaseClient() : null),
    [configured],
  );

  const refresh = useCallback(async (): Promise<AuthState | null> => {
    if (!client) return null;
    const nextState = await resolveAuthState(client);
    setState(nextState);
    return nextState;
  }, [client]);

  const signOut = useCallback(
    async (scope: "local" | "global" | "others" = "local") => {
      if (!client) return;
      await signOutClient(client, scope);

      if (scope !== "others") {
        setState({
          ...INITIAL_AUTH_STATE,
          isConfigured: true,
          isReady: true,
        });
      }
    },
    [client],
  );

  useEffect(() => {
    if (!client) return undefined;
    let active = true;

    resolveAuthState(client)
      .then((nextState) => {
        if (active) setState(nextState);
      })
      .catch((error) => {
        if (active) {
          setState((current) => ({
            ...current,
            error,
            isReady: true,
          }));
        }
      });

    const { data: authListener } = client.auth.onAuthStateChange(
      (_event: any, session: any) => {
        queueMicrotask(() => {
          if (!active) return;
          resolveAuthState(client, session).then((nextState) => {
            if (active) setState(nextState);
          });
        });
      },
    );

    return () => {
      active = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      client,
      refresh,
      signOut,
    }),
    [client, refresh, signOut, state],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function useUser(): any | null {
  return useAuth().user;
}

export function useSession(): any | null {
  return useAuth().session;
}

export function useRequireAuth(
  options: RequireAuthOptions = {},
): RequireAuthResult {
  const { enabled = true, openSignIn = true, redirectTo = "/" } = options;

  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasPromptedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !auth.isReady) return;
    if (!auth.isAuthenticated) {
      if (hasPromptedRef.current) return;
      hasPromptedRef.current = true;

      if (openSignIn) {
        globalEvents.emit(AUTH_EVENTS.AUTH_REQUIRED, {
          next: pathname,
          redirectTo,
        });
      } else if (redirectTo) {
        router.replace(redirectTo);
      }
    } else {
      hasPromptedRef.current = false;
    }
  }, [
    auth.isAuthenticated,
    auth.isReady,
    enabled,
    openSignIn,
    pathname,
    redirectTo,
    router,
  ]);

  return {
    isAuthenticated: auth.isAuthenticated,
    isReady: auth.isReady,
    user: auth.user,
  };
}
