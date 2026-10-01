import { requestJson } from "@/infrastructure/http/client";

export const accountClient = Object.freeze({
  getCurrentAccount: () =>
    requestJson("/api/account/me", { notifyOnUnauthorized: false }),
  updateCurrentAccount: (patch: Record<string, unknown>) =>
    requestJson("/api/account/me", {
      body: JSON.stringify(patch),
      method: "PATCH",
    }),
});

export const FOLLOW_STATUSES = Object.freeze({
  ACCEPTED: "accepted",
  PENDING: "pending",
  REJECTED: "rejected",
} as const);

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
      notifyOnError: false,
      notifyOnUnauthorized: false,
    },
  );
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
      notifyOnError: false,
      notifyOnUnauthorized: false,
    },
  );
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
      notifyOnError: false,
      notifyOnUnauthorized: false,
    },
  );
  return Array.isArray(res?.data) ? res.data : [];
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  actor_id?: string;
  event_type: string;
  read?: boolean;
  created_at: string;
  actor?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FetchNotificationsOptions {
  limitCount?: number;
}

export async function fetchNotifications({
  limitCount = 50,
}: FetchNotificationsOptions = {}): Promise<NotificationRecord[]> {
  const res = await requestJson<{ data?: NotificationRecord[] }>(
    `/api/notifications?limitCount=${encodeURIComponent(limitCount)}`,
    { notifyOnUnauthorized: false },
  ).catch(() => ({ data: [] }));

  return Array.isArray(res?.data) ? res.data : [];
}

let inFlightUnreadCount: Promise<number> | null = null;

export async function fetchUnreadCount(): Promise<number> {
  if (inFlightUnreadCount) return inFlightUnreadCount;

  inFlightUnreadCount = (async () => {
    try {
      const res = await requestJson<{ data?: number }>(
        "/api/notifications?resource=unread-count",
        {
          notifyOnUnauthorized: false,
        },
      ).catch(() => ({ data: 0 }));

      return Number(res?.data) || 0;
    } finally {
      inFlightUnreadCount = null;
    }
  })();

  return inFlightUnreadCount;
}

export async function markAsRead(notificationId: string): Promise<void> {
  if (!notificationId) return;
  await requestJson("/api/notifications", {
    body: JSON.stringify({ action: "mark-read", notificationId }),
    method: "PATCH",
  });
}

export async function markAllAsRead(): Promise<void> {
  await requestJson("/api/notifications", {
    body: JSON.stringify({ action: "mark-all-read" }),
    method: "PATCH",
  });
}

export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  if (!notificationId) return;
  await requestJson(
    `/api/notifications?action=delete&notificationId=${encodeURIComponent(notificationId)}`,
    { method: "DELETE" },
  );
}

export async function deleteAllNotifications(): Promise<void> {
  await requestJson("/api/notifications?action=delete-all", {
    method: "DELETE",
  });
}
