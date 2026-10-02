import { isImageIconSource } from "@omerdlw/base-framework/utils";

const AUTH_LAST_ACCOUNT_STORAGE_KEY = "dock_last_known_account_v2";

function readSessionStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    window.sessionStorage.setItem("test", "1");
    window.sessionStorage.removeItem("test");
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveLastKnownAccount(data: any): void {
  const storage = readSessionStorage();
  if (!storage || !data) return;
  try {
    const payload = {
      id: data.id || null,
      displayName: data.displayName || data.display_name || null,
      username: data.username || data.user_name || null,
      avatarUrl: data.avatarUrl || data.avatar_url || null,
      email: data.email || null,
    };
    storage.setItem(AUTH_LAST_ACCOUNT_STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

function readLastKnownAccount(expectedUserId: string | null = null): any {
  const storage = readSessionStorage();
  if (!storage) return null;
  try {
    storage.removeItem("dock_last_known_account");
    const raw = storage.getItem(AUTH_LAST_ACCOUNT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (expectedUserId && parsed?.id && parsed.id !== expectedUserId) {
      storage.removeItem(AUTH_LAST_ACCOUNT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearLastKnownAccount(): void {
  const storage = readSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(AUTH_LAST_ACCOUNT_STORAGE_KEY);
    storage.removeItem("dock_last_known_account");
  } catch {}
}

function resolveAuthIcon({
  account = null,
  user = null,
  type,
}: {
  account?: any;
  user?: any;
  type?: string;
} = {}): string {
  const cached = readLastKnownAccount(user?.id);
  const avatarCandidate =
    account?.avatarUrl || account?.avatar_url || cached?.avatarUrl || null;

  if (
    typeof avatarCandidate === "string" &&
    avatarCandidate.trim() &&
    isImageIconSource(avatarCandidate.trim())
  ) {
    return avatarCandidate.trim();
  }

  const isSignOut = type === "LOGOUT" || type === "ACCOUNT_DELETE";
  return isSignOut ? "solar:logout-2-bold" : "solar:login-2-bold";
}

export function resolveAuthStatusDetails({
  account = null,
  user = null,
  type,
  fallbackTitle = "Account",
  defaultDescription = "",
}: {
  account?: any;
  user?: any;
  type?: string;
  fallbackTitle?: string;
  defaultDescription?: string;
} = {}): { title: string; description: string; icon: string } {
  const cached = readLastKnownAccount(user?.id);
  const uMeta = user?.user_metadata || {};

  const rawDisplayName =
    account?.displayName ||
    account?.display_name ||
    uMeta.displayName ||
    uMeta.display_name ||
    uMeta.full_name ||
    uMeta.name ||
    user?.name ||
    cached?.displayName ||
    "";
  const rawUsername =
    account?.username || account?.user_name || cached?.username || "";

  const cleanUsername = String(rawUsername || "")
    .trim()
    .replace(/^@+/, "");
  const formattedUsername = cleanUsername ? `@${cleanUsername}` : "";

  let title = String(rawDisplayName || "").trim();
  if (!title) {
    if (formattedUsername) title = cleanUsername;
    else if (user?.email || account?.email || cached?.email)
      title = user?.email || account?.email || cached?.email;
    else title = fallbackTitle;
  }

  const isSignOut = type === "LOGOUT" || type === "ACCOUNT_DELETE";
  const defaultActionText = isSignOut
    ? type === "ACCOUNT_DELETE"
      ? "Account deleted"
      : "Signed out"
    : type === "SIGNUP"
      ? "Setting up account"
      : "Signed in";

  let description = defaultDescription || defaultActionText;

  if (formattedUsername) {
    const isSameAsTitle =
      title.toLowerCase() === formattedUsername.toLowerCase() ||
      title.toLowerCase() === cleanUsername.toLowerCase();
    description = isSameAsTitle ? defaultActionText : formattedUsername;
  }

  return { title, description, icon: resolveAuthIcon({ account, user, type }) };
}
