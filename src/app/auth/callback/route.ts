import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { sanitizeNextPath } from "@/features/auth/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = sanitizeNextPath(url.searchParams.get("next"));

  if (!code)
    return NextResponse.redirect(new URL("/?reason=missing-code", url));

  const supabase = await createServerSupabaseClient();
  const { data: sessionData, error } =
    await supabase.auth.exchangeCodeForSession(code);
  if (error)
    return NextResponse.redirect(new URL("/?reason=callback-failed", url));

  const userId = sessionData?.user?.id;
  if (userId) {
    const { data: accountRow } = await supabase
      .from("accounts")
      .select("username")
      .eq("id", userId)
      .maybeSingle();

    if (!accountRow?.username) {
      const setupUrl = new URL("/", url);
      setupUrl.searchParams.set("setup", "account");
      setupUrl.searchParams.set("next", nextPath);
      return NextResponse.redirect(setupUrl);
    }
  }

  const redirectUrl = new URL(nextPath, url);
  redirectUrl.searchParams.set("auth", "login");
  return NextResponse.redirect(redirectUrl);
}
