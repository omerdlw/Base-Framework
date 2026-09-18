"use client";

import type { JSX } from "react";
import { useAuth } from "@/features/auth";
import { AccountLayout, type AccountData } from "@/features/account";
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
  const isOwner =
    initialIsOwner ||
    Boolean(
      auth.isAuthenticated &&
      auth.user?.id &&
      account?.id &&
      auth.user.id === account.id,
    );

  return (
    <>
      <AccountRegistry
        account={account}
        initialFollowStatus={initialFollowStatus}
        isOwner={isOwner}
      />
      <AccountLayout
        account={account}
        followersCount={followersCount}
        followingCount={followingCount}
        isFollower={isFollower}
        isOwner={isOwner}
      >
        {/* Projeye özgü DATA SECTION burada render edilir */}
      </AccountLayout>
    </>
  );
}
