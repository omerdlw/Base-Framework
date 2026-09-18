import { NextResponse } from "next/server";
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/infrastructure/supabase/server";
import { getCurrentAccount, updateAccount } from "@/features/account/server";
import {
  assertSameOrigin,
  requireRecentAuthentication,
  requireUser,
} from "@/features/auth/server";

function failure(error: unknown, fallbackStatus = 500): NextResponse {
  const isAuthenticationFailure =
    error instanceof Error && error.message === "Authentication required";
  const status = isAuthenticationFailure ? 401 : fallbackStatus;
  const message =
    error instanceof Error ? error.message : "Account request failed";

  return NextResponse.json(
    {
      error: isAuthenticationFailure ? "Authentication required" : message,
    },
    { status },
  );
}

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const client = await createServerSupabaseClient();
    return NextResponse.json(
      await getCurrentAccount({ client, userId: user.id }),
    );
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const client = await createServerSupabaseClient();
    const payload = await request.json();
    return NextResponse.json(
      await updateAccount({ client, input: payload, userId: user.id }),
    );
  } catch (error) {
    return failure(error, 400);
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const payload = await request.json().catch(() => ({}));
    if (payload.confirmation !== "DELETE") {
      return NextResponse.json(
        { error: 'Type "DELETE" to permanently remove the account' },
        { status: 400 },
      );
    }
    const user = await requireRecentAuthentication();
    const admin = createAdminSupabaseClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return failure(error, 400);
  }
}
