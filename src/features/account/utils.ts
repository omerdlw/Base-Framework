import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/supabase/client";
import { trimToNull } from "@/core/utils";
import { USERNAME_PATTERN } from "./constants";
import type {
  AccountClientContext,
  AccountPatchInput,
  CurrentAccount,
  NormalizedAccountPatch,
  PublicAccount,
} from "./types";

export const DEFAULT_USER_AVATAR = "/default-avatar.svg";

export function normalizeText(value: unknown, maxLength: number): string {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

export function normalizeUsername(value: unknown): string {
  const username = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error(
      "Username must be 3-30 characters and contain letters, numbers, _ or -",
    );
  }
  return username;
}

export function resolveInputValue<T = unknown>(
  camelCaseVal: T | undefined,
  snakeCaseVal: T | undefined,
  fallbackVal: T,
): T {
  if (camelCaseVal !== undefined) return camelCaseVal;
  if (snakeCaseVal !== undefined) return snakeCaseVal;
  return fallbackVal;
}

export function normalizeAccountPatch(
  input: AccountPatchInput = {},
): NormalizedAccountPatch {
  const rawDisplayName = resolveInputValue(
    input.displayName,
    input.display_name,
    "",
  );
  const displayName = normalizeText(rawDisplayName, 80);
  if (!displayName) throw new Error("Display name is required");

  const rawAvatarUrl = resolveInputValue(
    input.avatarUrl,
    input.avatar_url,
    null,
  );
  const rawBannerUrl = resolveInputValue(
    input.bannerUrl,
    input.banner_url,
    null,
  );
  const rawBio = resolveInputValue(input.bio, null, null);
  const rawIsPrivate = resolveInputValue(
    input.isPrivate,
    input.is_private,
    false,
  );

  return {
    avatarUrl: normalizeText(rawAvatarUrl, 2048) || null,
    bannerUrl: normalizeText(rawBannerUrl, 2048) || null,
    bio: normalizeText(rawBio, 500) || null,
    displayName,
    isPrivate: rawIsPrivate === true || rawIsPrivate === "on",
    username: normalizeUsername(input.username),
  };
}

export const normalizeProfilePatch = normalizeAccountPatch;

export function toPublicAccount(row: any): PublicAccount | null {
  if (!row) return null;
  return {
    avatarUrl: row.avatar_url || null,
    bannerUrl: row.banner_url || null,
    bio: row.bio || null,
    createdAt: row.created_at,
    displayName: row.display_name,
    id: row.id,
    isPrivate: row.is_private === true,
    updatedAt: row.updated_at,
    username: row.username,
  };
}

export const toPublicProfile = toPublicAccount;

export function toCurrentAccount(row: any): CurrentAccount | null {
  if (!row) return null;
  return {
    avatarUrl: row.avatar_url || null,
    bannerUrl: row.banner_url || null,
    bio: row.bio || null,
    createdAt: row.created_at,
    deactivatedAt: row.deactivated_at || null,
    displayName: row.display_name,
    email: row.email,
    id: row.id,
    isPrivate: row.is_private === true,
    status: row.status,
    updatedAt: row.updated_at,
    username: row.username,
  };
}

export function requireAccountContext(context: {
  client?: SupabaseClient<Database>;
  userId?: string;
}): AccountClientContext {
  if (!context?.client || !context?.userId) {
    throw new Error("Account client and authenticated user id are required");
  }
  return { client: context.client, userId: context.userId };
}

// User Agent & Session Utils
export interface ParsedUserAgent {
  browser: string;
  device: "desktop" | "mobile" | "tablet";
  deviceLabel: string;
  icon: string;
  os: string;
  title: string;
}

export function parseUserAgent(ua?: string | null): ParsedUserAgent {
  if (!ua || typeof ua !== "string") {
    return {
      browser: "Web browser",
      device: "desktop",
      deviceLabel: "Unknown device",
      icon: "solar:monitor-smartphone-bold",
      os: "Unknown OS",
      title: "Unknown session",
    };
  }

  let browser = "Web browser";
  let os = "Unknown OS";
  let device: "desktop" | "mobile" | "tablet" = "desktop";
  let deviceLabel = "Desktop";

  if (/iPhone/i.test(ua)) {
    os = "iOS";
    device = "mobile";
    deviceLabel = "iPhone";
  } else if (/iPad/i.test(ua)) {
    os = "iPadOS";
    device = "tablet";
    deviceLabel = "iPad";
  } else if (/Android/i.test(ua)) {
    os = "Android";
    const isMobile = /Mobile/i.test(ua);
    device = isMobile ? "mobile" : "tablet";
    deviceLabel = isMobile ? "Android" : "Android tablet";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = "macOS";
    device = "desktop";
    deviceLabel = "macOS";
  } else if (/Windows/i.test(ua)) {
    os = "Windows";
    device = "desktop";
    deviceLabel = "Windows";
  } else if (/CrOS/i.test(ua)) {
    os = "ChromeOS";
    device = "desktop";
    deviceLabel = "Chromebook";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
    device = "desktop";
    deviceLabel = "Linux";
  }

  if (/Arc\//i.test(ua)) {
    browser = "Arc";
  } else if (/Edg\//i.test(ua)) {
    browser = "Edge";
  } else if (/OPR\/|Opera/i.test(ua)) {
    browser = "Opera";
  } else if (/Brave/i.test(ua)) {
    browser = "Brave";
  } else if (/Vivaldi/i.test(ua)) {
    browser = "Vivaldi";
  } else if (/SamsungBrowser/i.test(ua)) {
    browser = "Samsung Internet";
  } else if (/CriOS\/([0-9.]+)/i.test(ua)) {
    browser = "Chrome";
  } else if (/FxiOS\/([0-9.]+)/i.test(ua)) {
    browser = "Firefox";
  } else if (/Chrome\/([0-9.]+)/i.test(ua) && !/Chromium/i.test(ua)) {
    browser = "Chrome";
  } else if (/Firefox\/([0-9.]+)/i.test(ua)) {
    browser = "Firefox";
  } else if (
    /Version\/([0-9.]+).*Safari/i.test(ua) ||
    (/Safari/i.test(ua) && /Apple/i.test(ua))
  ) {
    browser = "Safari";
  }

  const title = `${browser} on ${deviceLabel}`;

  let icon = "solar:laptop-minimalistic-bold";
  if (device === "mobile") {
    icon = "solar:smartphone-bold";
  } else if (device === "tablet") {
    icon = "solar:tablet-bold";
  } else if (deviceLabel === "macOS") {
    icon = "solar:laptop-minimalistic-bold";
  } else if (deviceLabel === "Windows" || deviceLabel === "Linux") {
    icon = "solar:monitor-bold";
  }

  return {
    browser,
    device,
    deviceLabel,
    icon,
    os,
    title,
  };
}

export function formatSessionIp(ip?: string | null): string | null {
  if (!ip) return null;
  const trimmed = String(ip).trim();
  if (
    trimmed === "::1" ||
    trimmed === "127.0.0.1" ||
    trimmed === "::ffff:127.0.0.1"
  ) {
    return "Localhost";
  }
  return trimmed;
}

export interface SessionLike {
  is_current?: boolean;
  last_seen_at?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export function formatSessionActivity(session?: SessionLike | null): string {
  if (!session) return "Active session";
  if (session.is_current) return "Active now";

  const dateValue = session.last_seen_at || session.created_at;
  if (!dateValue) return "Active session";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Active session";

  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Active just now";
  if (diffInSeconds < 3600) {
    const mins = Math.max(1, Math.floor(diffInSeconds / 60));
    return `Active ${mins}m ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `Active ${hours}h ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `Active ${days}d ago`;
  }

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);

  return `Active ${formattedDate}`;
}

// Avatar Helpers
export function getInitial(value: unknown): string {
  const text = trimToNull(value);
  if (!text) return "A";
  const first = text.charAt(0).toUpperCase();
  return /^[A-Z0-9]$/.test(first) ? first : "A";
}

export function normalizeAvatarUrl(url: unknown): string | null {
  return trimToNull(url);
}

export function resolveAvatarUrlCandidate(
  user: Record<string, any> = {},
): string | null {
  const candidate =
    user.avatarUrl ||
    user.avatar_url ||
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture;
  return normalizeAvatarUrl(candidate);
}

export function createInitialAvatarDataUrl(initial: string): string {
  const normalizedLetter = getInitial(initial);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
<rect width="200" height="200" rx="100" fill="#18181b" />
<text
x="50%"
y="54%"
text-anchor="middle"
dominant-baseline="middle"
fill="#ffffff"
font-family="ui-sans-serif, system-ui, sans-serif"
font-size="104"
font-weight="600"
>
${normalizedLetter}
</text>
</svg>
`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getUserAvatarFallbackUrl(
  user: Record<string, any> = {},
  fallbackUrl: string = DEFAULT_USER_AVATAR,
): string {
  const fallbackInitial = getInitial(
    user?.displayName ||
      user?.display_name ||
      user?.username ||
      user?.name ||
      "A",
  );

  if (fallbackInitial) {
    return createInitialAvatarDataUrl(fallbackInitial);
  }

  const normalizedFallback = normalizeAvatarUrl(fallbackUrl);
  return normalizedFallback || DEFAULT_USER_AVATAR;
}

export function getUserAvatarUrl(user: Record<string, any> = {}): string {
  const rawAvatarUrl = resolveAvatarUrlCandidate(user);
  if (rawAvatarUrl) return rawAvatarUrl;
  return getUserAvatarFallbackUrl(user);
}

export function applyAvatarFallback(
  event: any,
  fallbackUrl: string = DEFAULT_USER_AVATAR,
): void {
  const target = event?.currentTarget;
  if (!target || typeof target !== "object") return;
  if (target.dataset?.avatarFallbackApplied === "true") return;

  const normalizedFallback =
    normalizeAvatarUrl(fallbackUrl) || DEFAULT_USER_AVATAR;
  if (target.dataset) {
    target.dataset.avatarFallbackApplied = "true";
  }
  target.src = normalizedFallback;
}
