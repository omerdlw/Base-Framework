import "server-only";

import { NextResponse } from "next/server";
import {
  USER_MESSAGES,
  UserError,
  report,
} from "@omerdlw/base-framework/utils";

export function apiErrorResponse(
  error: unknown,
  { fallback = USER_MESSAGES.server, status = 500 } = {},
): NextResponse {
  if (error instanceof UserError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status ?? 400 },
    );
  }

  report("API route", error);
  return NextResponse.json({ error: fallback }, { status });
}
