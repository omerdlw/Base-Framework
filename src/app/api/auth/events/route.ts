import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin } from "@/infrastructure/security/url-safety";
import { recordAuthEvent, requireUser } from "@/features/auth/server";
import { apiErrorResponse } from "@/infrastructure/http/api-error";

const ALLOWED_EVENTS = new Set([
  "auth.signed_in",
  "auth.signed_out",
  "passkey.registered",
  "passkey.deleted",
]);

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await requireUser();
    const payload = await request.json();
    if (!ALLOWED_EVENTS.has(payload.event)) {
      return NextResponse.json(
        { error: "Unsupported security event" },
        { status: 400 },
      );
    }
    await recordAuthEvent(payload.event, payload.metadata || {});
    return NextResponse.json({ recorded: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
