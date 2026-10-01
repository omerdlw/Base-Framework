"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { err, ok, type Result } from "@/core/result";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { requireUser } from "@/features/auth/server";
import { updateAccount } from "./profile";
import type { AccountPatchInput, CurrentAccount } from "../types";
import { report, toUserMessage } from "@/core/utils";

export type FollowActionResult =
  | (Result<{ status: string | null }, string> & {
      readonly code?: string;
      readonly data: { status: string | null };
      readonly status: string | null;
    })
  | (Result<never, string> & {
      readonly code?: string;
      readonly status: null;
    });

export type UpdateAccountActionResult =
  | (Result<CurrentAccount, string> & {
      readonly account: CurrentAccount;
      readonly code?: string;
      readonly data: CurrentAccount;
    })
  | (Result<never, string> & {
      readonly account: null;
      readonly code?: string;
    });

function followSuccess(status: string | null): FollowActionResult {
  return { ...ok({ status }), data: { status }, status };
}

function followError(error: string, code?: string): FollowActionResult {
  return { ...err(error, code), status: null };
}

function updateSuccess(account: CurrentAccount): UpdateAccountActionResult {
  return { ...ok(account), account, data: account };
}

function updateError(error: string, code?: string): UpdateAccountActionResult {
  return { ...err(error, code), account: null };
}

function logActionFailure(action: string, error: unknown): void {
  report(`AccountAction ${action}`, error);
}

export async function followUserAction(
  followingId: string,
  targetUsername?: string,
): Promise<FollowActionResult> {
  try {
    const user = await requireUser();
    if (!followingId || followingId === user.id) {
      return followError("Invalid follow target");
    }

    const client = await createServerSupabaseClient();
    const { data: targetRows, error: targetError } = await client.rpc(
      "get_account_follow_target",
      { p_user_id: followingId },
    );
    if (targetError) throw targetError;
    const target = targetRows?.[0];
    if (!target) {
      return followError("Account not found");
    }

    const status = target.is_private ? "pending" : "accepted";
    const { error } = await client
      .from("account_follows")
      .upsert(
        { follower_id: user.id, following_id: followingId, status },
        { onConflict: "follower_id,following_id" },
      );
    if (error) throw error;

    if (targetUsername) {
      revalidatePath(`/account/${encodeURIComponent(targetUsername)}`);
    }
    revalidatePath("/account");

    return followSuccess(status);
  } catch (error: unknown) {
    logActionFailure("follow", error);
    return followError(
      toUserMessage(error, {
        fallback: "Couldn't follow this account. Please try again",
      }),
      "FOLLOW_FAILED",
    );
  }
}

export async function unfollowUserAction(
  followingId: string,
  targetUsername?: string,
): Promise<FollowActionResult> {
  try {
    const user = await requireUser();
    if (!followingId || followingId === user.id) {
      return followError("Invalid follow target");
    }

    const client = await createServerSupabaseClient();
    const { error } = await client
      .from("account_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", followingId);
    if (error) throw error;

    if (targetUsername) {
      revalidatePath(`/account/${encodeURIComponent(targetUsername)}`);
    }
    revalidatePath("/account");

    return followSuccess(null);
  } catch (error: unknown) {
    logActionFailure("unfollow", error);
    return followError(
      toUserMessage(error, {
        fallback: "Couldn't unfollow this account. Please try again",
      }),
      "UNFOLLOW_FAILED",
    );
  }
}

export async function updateAccountAction(
  input: AccountPatchInput,
): Promise<UpdateAccountActionResult> {
  try {
    const user = await requireUser();
    const client = await createServerSupabaseClient();
    const result = await updateAccount({ client, input, userId: user.id });

    if (!result.account) {
      return updateError("Your account couldn't be updated. Please try again");
    }

    if (result.account.username) {
      revalidatePath(`/account/${encodeURIComponent(result.account.username)}`);
    }
    revalidatePath("/account");

    return updateSuccess(result.account);
  } catch (error: unknown) {
    logActionFailure("update account", error);
    return updateError(
      toUserMessage(error, {
        fallback: "Your account couldn't be updated. Please try again",
      }),
      "ACCOUNT_UPDATE_FAILED",
    );
  }
}

export async function completeSignUpAction(input: {
  displayName?: string;
  username: string;
}): Promise<UpdateAccountActionResult> {
  return updateAccountAction({
    displayName: input.displayName || input.username,
    username: input.username,
  });
}
