import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { DEFAULT_MAX_AUTH_AGE_SECONDS } from "./constants";
import { normalizeEmail, sanitizeNextPath, toAuthUser } from "./utils";
import type { AuthUser, RequireUserOptions } from "./types";

export { normalizeEmail, sanitizeNextPath, toAuthUser };

export function assertSameOrigin(request: Request): void {
  try {
    const requestOrigin = new URL(request.url).origin;
    const originHeader = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");

    if (originHeader) {
      const headerOrigin = new URL(originHeader).origin;
      if (headerOrigin === requestOrigin) return;
    } else if (fetchSite === "same-origin") {
      return;
    }
  } catch {}

  throw new Error("Cross-site request rejected");
}

export async function getOptionalUser(): Promise<AuthUser | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) return null;

  const user = toAuthUser(data.claims);

  if (user?.sessionId) {
    const { data: revokedSession } = await supabase
      .from("auth_sessions")
      .select("revoked_at")
      .eq("session_id", user.sessionId)
      .maybeSingle();

    if (revokedSession?.revoked_at) return null;
  }

  return user;
}

export async function requireUser({
  redirectTo = null,
}: RequireUserOptions = {}): Promise<AuthUser> {
  const user = await getOptionalUser();

  if (user) return user;
  if (redirectTo) redirect(redirectTo);

  throw new Error("Authentication required");
}

export async function requireRecentAuthentication(
  maxAgeSeconds = DEFAULT_MAX_AUTH_AGE_SECONDS,
): Promise<AuthUser> {
  const user = await requireUser();
  const amr = user.claims?.amr;

  const latestAuthentication = Array.isArray(amr)
    ? amr.reduce((max: number, entry: any) => {
        const ts = Number(entry?.timestamp) || 0;
        return ts > max ? ts : max;
      }, 0)
    : 0;

  const currentAgeSeconds =
    Math.floor(Date.now() / 1000) - latestAuthentication;

  if (!latestAuthentication || currentAgeSeconds > maxAgeSeconds) {
    throw new Error("Recent authentication required");
  }

  return user;
}

export async function recordAuthEvent(
  _event: string,
  _metadata: Record<string, any> = {},
): Promise<void> {
  return;
}
