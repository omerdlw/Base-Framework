import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/supabase/client";

export async function getAccountFollowRelation({
  client,
  viewerId,
  targetId,
}: {
  client: SupabaseClient<Database>;
  viewerId?: string | null;
  targetId: string;
}): Promise<{ status: string | null; isFollower: boolean }> {
  if (!client || !viewerId || viewerId === targetId) {
    return { status: null, isFollower: false };
  }

  const { data } = await client
    .from("account_follows")
    .select("status")
    .eq("follower_id", viewerId)
    .eq("following_id", targetId)
    .maybeSingle();

  const status = data?.status || null;
  return {
    status,
    isFollower: status === "accepted",
  };
}

export async function getAccountFollowCounts({
  client,
  accountId,
}: {
  client: SupabaseClient<Database>;
  accountId: string;
}): Promise<{ followersCount: number; followingCount: number }> {
  if (!client || !accountId) {
    return { followersCount: 0, followingCount: 0 };
  }

  const [followersResult, followingResult] = await Promise.all([
    client
      .from("account_follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", accountId)
      .eq("status", "accepted"),
    client
      .from("account_follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", accountId)
      .eq("status", "accepted"),
  ]);

  return {
    followersCount: followersResult?.count ?? 0,
    followingCount: followingResult?.count ?? 0,
  };
}
