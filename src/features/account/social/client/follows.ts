"use client";

import { requestJson } from "@/infrastructure/http/client";

export const FOLLOW_STATUSES = Object.freeze({
  ACCEPTED: "accepted",
  PENDING: "pending",
  REJECTED: "rejected",
} as const);

export type FollowStatus =
  (typeof FOLLOW_STATUSES)[keyof typeof FOLLOW_STATUSES];

export interface FollowUserResult {
  status?: string | null;
  [key: string]: unknown;
}

export interface FollowRecord {
  id?: string;
  follower_id?: string;
  following_id?: string;
  status?: string;
  created_at?: string;
  follower?: Record<string, unknown>;
  following?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function getFollowState(
  followingId: string,
): Promise<string | null> {
  const response = await requestJson<{ status?: string | null }>(
    `/api/social/follows?followingId=${encodeURIComponent(followingId)}`,
    { notifyOnUnauthorized: false },
  );
  return response.status || null;
}

export async function followUser(followingId: string): Promise<string> {
  if (!followingId) throw new Error("A target account is required");
  const response = await requestJson<{ status?: string }>(
    "/api/social/follows",
    {
      body: JSON.stringify({ followingId }),
      method: "POST",
    },
  );
  return response.status || "accepted";
}

export async function unfollowUser(followingId: string): Promise<null> {
  if (!followingId) throw new Error("A target account is required");
  await requestJson("/api/social/follows", {
    body: JSON.stringify({ followingId }),
    method: "DELETE",
  });
  return null;
}

export async function removeFollower(followerId: string): Promise<null> {
  if (!followerId) throw new Error("Follower ID is required");
  await requestJson("/api/social/follows", {
    body: JSON.stringify({ action: "remove-follower", followerId }),
    method: "DELETE",
  });
  return null;
}

let inFlightInboxCount: Promise<number> | null = null;

export async function fetchInboxCount(): Promise<number> {
  if (inFlightInboxCount) return inFlightInboxCount;

  inFlightInboxCount = (async () => {
    try {
      const res = await requestJson<{ count?: number }>(
        "/api/social/follows?resource=inbox-count",
        {
          notifyOnUnauthorized: false,
        },
      ).catch(() => ({ count: 0 }));

      return Number(res?.count) || 0;
    } finally {
      inFlightInboxCount = null;
    }
  })();

  return inFlightInboxCount;
}

export async function fetchFollowRequests(): Promise<FollowRecord[]> {
  const res = await requestJson<{ data?: FollowRecord[] }>(
    "/api/social/follows?resource=requests",
    {
      notifyOnUnauthorized: false,
    },
  ).catch(() => ({ data: [] }));
  return Array.isArray(res?.data) ? res.data : [];
}

export async function acceptFollowRequest(requesterId: string): Promise<void> {
  if (!requesterId) throw new Error("Requester ID is required");
  await requestJson("/api/social/follows", {
    body: JSON.stringify({ action: "accept", requesterId }),
    method: "PATCH",
  });
}

export async function rejectFollowRequest(requesterId: string): Promise<void> {
  if (!requesterId) throw new Error("Requester ID is required");
  await requestJson("/api/social/follows", {
    body: JSON.stringify({ action: "reject", requesterId }),
    method: "PATCH",
  });
}

export async function fetchFollowers(
  userId?: string | null,
): Promise<FollowRecord[]> {
  const query = userId
    ? `?resource=followers&userId=${encodeURIComponent(userId)}`
    : "?resource=followers";
  const res = await requestJson<{ data?: FollowRecord[] }>(
    `/api/social/follows${query}`,
    {
      notifyOnUnauthorized: false,
    },
  ).catch(() => ({ data: [] }));
  return Array.isArray(res?.data) ? res.data : [];
}

export async function fetchFollowing(
  userId?: string | null,
): Promise<FollowRecord[]> {
  const query = userId
    ? `?resource=following&userId=${encodeURIComponent(userId)}`
    : "?resource=following";
  const res = await requestJson<{ data?: FollowRecord[] }>(
    `/api/social/follows${query}`,
    {
      notifyOnUnauthorized: false,
    },
  ).catch(() => ({ data: [] }));
  return Array.isArray(res?.data) ? res.data : [];
}
