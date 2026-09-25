import { isObject as isObjectRecord } from "@/core/utils";
import type {
  NotificationData,
  NotificationEntry,
  NotificationOptions,
  ToastOptionsInput,
} from "./types";

export { isObjectRecord };

export function normalizeFeedbackText<T = unknown>(value: T): T {
  if (typeof value !== "string") return value;
  let text = value.trim();
  while (text.endsWith(".") || text.endsWith("...")) {
    text = text.endsWith("...")
      ? text.slice(0, -3).trim()
      : text.slice(0, -1).trim();
  }
  return text as T;
}

export function sortNotificationsByTimestamp(
  notifications: Record<string, NotificationEntry> = {},
): [string, NotificationEntry][] {
  return Object.entries(notifications).sort(
    (a, b) => a[1].timestamp - b[1].timestamp,
  );
}

export function normalizeToastOptions(
  options?: ToastOptionsInput,
): NotificationOptions {
  if (typeof options === "number") {
    return { duration: options };
  }
  return options || {};
}

export function withDefaultDuration(
  duration: number,
  options?: ToastOptionsInput,
): NotificationOptions & { duration: number | null } {
  const normalized = normalizeToastOptions(options);
  return {
    ...normalized,
    duration: normalized.duration !== undefined ? normalized.duration : duration,
  };
}

export function isNotificationDataObject(
  value: unknown,
): value is NotificationData {
  return isObjectRecord(value) && "message" in value;
}
