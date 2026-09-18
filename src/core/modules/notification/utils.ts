import { CRITICAL_SET, PRODUCTION_OPTIONAL_TOAST_TYPES } from "./constants";
import { normalizeFeedbackText } from "@/core/utils";
import type { NotificationData, NotificationEntry } from "./types";

const IS_PROD = process.env.NODE_ENV === "production";

function canUseBrowserStorage(): boolean {
  return typeof window !== "undefined";
}

export function getStorageItem<T>(
  key: string,
  defaultValue: T | null = null,
): T | null {
  if (!canUseBrowserStorage()) return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
}

export function setStorageItem(key: string, value: unknown): boolean {
  if (!canUseBrowserStorage()) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
    return false;
  }
}

export function removeStorageItem(key: string): boolean {
  if (!canUseBrowserStorage()) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
    return false;
  }
}

export function sortNotificationsByTimestamp(
  notifications: Record<string, NotificationEntry> = {},
): [string, NotificationEntry][] {
  return Object.entries(notifications).sort(
    (a, b) => a[1].timestamp - b[1].timestamp,
  );
}

export function isObjectRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isValidCritical(notification: unknown): boolean {
  const notif = notification as { message?: string; type?: string } | null;
  if (!notif?.type || !CRITICAL_SET.has(notif.type)) return false;
  if (notif.message && /HTTP\s*404/i.test(notif.message)) return false;
  return true;
}

export function filterCriticalNotifications(
  map: unknown,
): Record<string, NotificationEntry> {
  if (!isObjectRecord(map)) return {};
  return Object.entries(map).reduce<Record<string, NotificationEntry>>(
    (acc, [id, notification]) => {
      if (isValidCritical(notification)) {
        acc[id] = notification as NotificationEntry;
      }
      return acc;
    },
    {},
  );
}

export function withDefaultDuration<T extends Record<string, unknown>>(
  duration: number,
  options: T = {} as T,
): T & { duration: number } {
  return {
    duration,
    ...(options || {}),
  };
}

export function shouldSuppressToast(
  type: string,
  options: { allowInProduction?: boolean } = {},
): boolean {
  if (!IS_PROD) return false;
  if (!PRODUCTION_OPTIONAL_TOAST_TYPES.has(type)) return false;
  return options.allowInProduction !== true;
}

export function resolveNotificationCopy(
  notification: Partial<NotificationData> = {},
  config: Record<string, any> = {},
): { description: string; title: string } {
  const explicitTitle = notification?.title
    ? String(normalizeFeedbackText(notification.title))
    : "";
  const message = notification?.message
    ? String(normalizeFeedbackText(notification.message))
    : "";
  const description = notification?.description
    ? String(normalizeFeedbackText(notification.description))
    : "";

  let resolvedTitle =
    explicitTitle || message || String(config.title || "") || description || "";
  let resolvedDescription = explicitTitle
    ? description || message || ""
    : description || "";

  if (!explicitTitle && !message && !description) {
    resolvedDescription = String(config.description || "");
  }

  if (resolvedTitle === resolvedDescription) {
    resolvedDescription = "";
  }

  return {
    description: resolvedDescription,
    title: resolvedTitle,
  };
}
