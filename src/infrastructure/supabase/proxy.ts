import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/infrastructure/env";
import { getClientIp } from "@/infrastructure/security/rate-limiter";
import { applySecurityHeaders } from "@/infrastructure/security/headers";

export async function updateSupabaseSession(
  request: NextRequest,
): Promise<NextResponse> {
  const config = getSupabasePublicConfig();
  if (!config) return applySecurityHeaders(NextResponse.next({ request }));

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    auth: {
      experimental: { passkey: true },
      flowType: "pkce",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers = {}) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value as string),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims || null;
  const sessionId = String(claims?.session_id || "").trim();

  if (!claims?.sub || !sessionId) return applySecurityHeaders(response);

  const { data: session } = await supabase
    .from("auth_sessions")
    .select("revoked_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (session?.revoked_at) {
    await supabase.auth.signOut({ scope: "local" });
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/";
    signInUrl.search = "?reason=session-revoked";
    const redirect = NextResponse.redirect(signInUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return applySecurityHeaders(redirect);
  }

  const { error: touchError } = await supabase.rpc("touch_auth_session", {
    p_ip_address: getClientIp(request),
    p_session_id: sessionId,
    p_user_agent: request.headers.get("user-agent"),
  });
  if (touchError) {
    console.error("Failed to touch auth session:", touchError);
  }

  return applySecurityHeaders(response);
}
