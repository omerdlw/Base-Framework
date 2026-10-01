import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { DEFAULT_MAX_AUTH_AGE_SECONDS } from "./constants";
import { sanitizeNextPath, toAuthUser } from "./utils";
import type { AuthUser, RequireUserOptions } from "./types";
import { UserError } from "@/core/utils";

export { sanitizeNextPath };

export async function getOptionalUser(): Promise<AuthUser | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) return null;

  const user = toAuthUser(data.claims);

  if (user?.sessionId) {
    try {
      const { data: revokedSession, error: sessionError } = await supabase
        .from("auth_sessions")
        .select("revoked_at")
        .eq("session_id", user.sessionId)
        .maybeSingle();

      if (sessionError || revokedSession?.revoked_at) return null;
    } catch {
      return null;
    }
  }

  return user;
}

export async function requireUser({
  redirectTo = null,
}: RequireUserOptions = {}): Promise<AuthUser> {
  const user = await getOptionalUser();

  if (user) return user;
  if (redirectTo) redirect(redirectTo);

  throw new UserError("Authentication required", 401);
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
    throw new UserError(
      "For your security, please sign in again to continue",
      403,
    );
  }

  return user;
}

export async function recordAuthEvent(
  _event: string,
  _metadata: Record<string, any> = {},
): Promise<void> {
  return;
}
