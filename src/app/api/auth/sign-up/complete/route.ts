import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { updateAccount } from "@/features/account/server";
import { assertSameOrigin } from "@/infrastructure/security/url-safety";
import { requireUser } from "@/features/auth/server";
import { apiErrorResponse } from "@/infrastructure/http/api-error";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const payload = await request.json();
    const client = await createServerSupabaseClient();
    const { account } = await updateAccount({
      client,
      userId: user.id,
      input: {
        displayName: payload.displayName,
        username: payload.username,
      },
    });

    return NextResponse.json({ account, profile: account });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
