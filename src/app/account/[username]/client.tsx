"use client";

import type { JSX } from "react";
import { useAuth } from "@/features/auth";
import {
  AccountLayout,
  type AccountData,
  useAccount,
} from "@/features/account";
import { AccountRegistry } from "./registry";

export interface AccountClientProps {
  account: AccountData;
  followersCount: number;
  followingCount: number;
  initialFollowStatus: string | null;
  isFollower: boolean;
  isOwner: boolean;
}

export function AccountClient({
  account,
  followersCount,
  followingCount,
  initialFollowStatus,
  isFollower,
  isOwner: initialIsOwner,
}: AccountClientProps): JSX.Element {
  const auth = useAuth();
  const accountState = useAccount();
  const isOwner =
    initialIsOwner ||
    Boolean(
      auth.isAuthenticated &&
      auth.user?.id &&
      account?.id &&
      auth.user.id === account.id,
    );

  const activeAccount =
    isOwner && (accountState?.account || accountState?.profile)
      ? { ...account, ...(accountState.account || accountState.profile) }
      : account;

  return (
    <>
      <AccountRegistry
        account={activeAccount}
        initialFollowStatus={initialFollowStatus}
        isOwner={isOwner}
      />
      <AccountLayout
        account={activeAccount}
        followersCount={followersCount}
        followingCount={followingCount}
        isFollower={isFollower}
        isOwner={isOwner}
      >
      </AccountLayout>
    </>
  );
}
