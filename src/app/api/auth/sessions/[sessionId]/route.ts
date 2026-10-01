import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { assertSameOrigin } from "@/infrastructure/security/url-safety";
import { recordAuthEvent, requireUser } from "@/features/auth/server";
import { apiErrorResponse } from "@/infrastructure/http/api-error";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { sessionId } = await context.params;
    if (!sessionId || sessionId === user.sessionId) {
      return NextResponse.json(
        { error: "Use local sign-out for the current session" },
        { status: 400 },
      );
    }

    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("revoke_auth_session", {
      p_session_id: sessionId,
    });
    if (error) throw error;
    await recordAuthEvent("session.revoked", { sessionId });
    return NextResponse.json({ revoked: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
