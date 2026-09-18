"use client";

import { requestJson } from "@/infrastructure/http/client";

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
