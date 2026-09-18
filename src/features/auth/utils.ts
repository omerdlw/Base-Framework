import { trimToNull, getSiteUrl } from "@/core/utils";
import { AUTH_ROUTES } from "./constants";
import type { AuthState, AuthUser } from "./types";

export function normalizeEmail(value: unknown): string {
  const email = String(value || "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address");
  }
  return email;
}

export function sanitizeNextPath(
  value: unknown,
  fallback = "/account",
): string {
  const path = trimToNull(value);
  if (!path || !/^\/(?!\/)[^\\\u0000-\u001f]*$/.test(path)) return fallback;
  return path;
}

export function getAuthCallbackUrl(nextPath = "/account"): string {
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : getSiteUrl();
  const callback = new URL(AUTH_ROUTES.CALLBACK, origin);
  callback.searchParams.set("next", sanitizeNextPath(nextPath));
  return callback.toString();
}

export function toAuthUser(
  claims: Record<string, any> | null | undefined,
): AuthUser | null {
  if (!claims?.sub) return null;
  return {
    aal: claims.aal || "aal1",
    claims,
    email: claims.email || null,
    id: claims.sub,
    sessionId: claims.session_id || null,
  };
}

export function unwrapResult<T = unknown>(
  result: { data?: T; error?: any } | null | undefined,
  fallbackMessage: string,
): T {
  if (result?.error) throw result.error;
  if (!result?.data) throw new Error(fallbackMessage);
  return result.data;
}

export async function resolveAuthState(
  client: any,
  session: any = null,
): Promise<AuthState> {
  let activeSession = session;

  if (!activeSession) {
    const { data } = await client.auth.getSession();
    activeSession = data?.session || null;
  }

  return {
    error: null,
    isAuthenticated: Boolean(activeSession?.user),
    isConfigured: true,
    isReady: true,
    session: activeSession,
    user: activeSession?.user || null,
  };
}
