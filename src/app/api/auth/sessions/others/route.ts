import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { assertSameOrigin } from "@/infrastructure/security/http";
import { recordAuthEvent, requireUser } from "@/features/auth/server";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const client = await createServerSupabaseClient();
    if (!user.sessionId) {
      return NextResponse.json(
        { error: "Active session required" },
        { status: 400 },
      );
    }

    const { error } = await client.rpc("revoke_other_auth_sessions", {
      p_current_session_id: user.sessionId,
    });
    if (error) throw error;
    await recordAuthEvent("session.others_revoked");
    return NextResponse.json({ revoked: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Sessions could not be revoked" },
      { status: 400 },
    );
  }
}
