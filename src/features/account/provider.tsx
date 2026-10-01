"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/features/auth/provider";
import { accountClient } from "./client";
import { INITIAL_ACCOUNT_STATE } from "./constants";
import type {
  AccountContextValue,
  AccountPatchInput,
  AccountState,
} from "./types";

const AccountContext = createContext<AccountContextValue | null>(null);

export interface AccountProviderProps {
  children?: ReactNode;
  client?: any;
  identity?: {
    isAuthenticated?: boolean;
    isReady?: boolean;
    user?: any;
  };
}

export function AccountProvider({
  children,
  client = accountClient,
  identity: identityProp,
}: AccountProviderProps) {
  const auth = useAuth();
  const identity = useMemo(
    () =>
      identityProp ?? {
        isAuthenticated: auth.isAuthenticated,
        isReady: auth.isReady,
        user: auth.user,
      },
    [identityProp, auth.isAuthenticated, auth.isReady, auth.user],
  );
  const [state, setState] = useState<AccountState>(INITIAL_ACCOUNT_STATE);
  const userId = identity?.isAuthenticated ? identity?.user?.id || null : null;

  const refresh = useCallback(async (): Promise<any> => {
    if (!client || !userId) {
      setState(INITIAL_ACCOUNT_STATE);
      return null;
    }
    setState((current) => ({
      ...current,
      error: null,
      isLoading: true,
    }));
    try {
      const value = await client.getCurrentAccount();
      setState({
        ...value,
        error: null,
        isLoading: false,
      });
      return value;
    } catch (error) {
      setState((current) => ({
        ...current,
        error,
        isLoading: false,
      }));
      throw error;
    }
  }, [client, userId]);

  const update = useCallback(
    async (patch: AccountPatchInput): Promise<any> => {
      if (!client || !userId) throw new Error("Authentication required");
      const value = await client.updateCurrentAccount(patch);
      setState((current) => ({
        ...current,
        ...value,
      }));
      return value;
    },
    [client, userId],
  );

  useEffect(() => {
    if (!identity?.isReady) return;
    void refresh().catch(() => null);
  }, [identity?.isReady, refresh]);

  const value = useMemo<AccountContextValue>(
    () => ({
      ...state,
      client,
      refresh,
      update,
    }),
    [client, refresh, state, update],
  );

  return <AccountContext value={value}>{children}</AccountContext>;
}

export function useAccount(): AccountContextValue {
  const context = use(AccountContext);
  if (!context)
    throw new Error("useAccount must be used inside AccountProvider");
  return context;
}
