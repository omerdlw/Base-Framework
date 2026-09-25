import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import {
  getPublicAccount,
  getAccountFollowRelation,
  getAccountFollowCounts,
} from "@/features/account/server";
import { getOptionalUser } from "@/features/auth/server";
import { AccountClient } from "./client";

export interface AccountPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: AccountPageProps): Promise<Metadata> {
  const { username } = await params;
  const client = await createServerSupabaseClient();
  const account = await getPublicAccount({ client, username });
  if (!account) return { title: "Account Not Found" };

  const title = account.displayName
    ? `${account.displayName} (@${account.username})`
    : `@${account.username}`;
  const description =
    account.bio ||
    `View ${account.displayName || account.username}'s profile on Base Framework.`;

  return {
    description,
    openGraph: {
      description,
      images: account.avatarUrl ? [{ url: account.avatarUrl }] : [],
      title,
    },
    title,
    twitter: {
      card: "summary",
      description,
      images: account.avatarUrl ? [account.avatarUrl] : [],
      title,
    },
  };
}

export default async function AccountPage({
  params,
}: AccountPageProps): Promise<JSX.Element> {
  const { username } = await params;
  const client = await createServerSupabaseClient();
  const [account, viewer] = await Promise.all([
    getPublicAccount({ client, username }),
    getOptionalUser(),
  ]);

  if (!account) notFound();

  const isOwner = viewer?.id === account.id;

  const [relation, counts] = await Promise.all([
    getAccountFollowRelation({
      client,
      viewerId: viewer?.id,
      targetId: account.id,
    }),
    getAccountFollowCounts({
      client,
      accountId: account.id,
    }),
  ]);

  return (
    <AccountClient
      account={account}
      followersCount={counts.followersCount}
      followingCount={counts.followingCount}
      initialFollowStatus={relation.status}
      isFollower={relation.isFollower}
      isOwner={isOwner}
    />
  );
}
