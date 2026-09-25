"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { requireUser } from "@/features/auth/server";
import { updateAccount } from "./profile";
import type { AccountPatchInput, CurrentAccount } from "../types";

export type FollowActionResult =
  | {
      readonly code?: string;
      readonly data: { status: string | null };
      readonly error?: never;
      readonly status: string | null;
      readonly success: true;
    }
  | {
      readonly code?: string;
      readonly data?: never;
      readonly error: string;
      readonly status: null;
      readonly success: false;
    };

export type UpdateAccountActionResult =
  | {
      readonly account: CurrentAccount;
      readonly code?: string;
      readonly data: CurrentAccount;
      readonly error?: never;
      readonly success: true;
    }
  | {
      readonly account: null;
      readonly code?: string;
      readonly data?: never;
      readonly error: string;
      readonly success: false;
    };

function followSuccess(status: string | null): FollowActionResult {
  return { data: { status }, status, success: true };
}

function followError(error: string, code?: string): FollowActionResult {
  return { error, status: null, success: false, ...(code ? { code } : {}) };
}

function updateSuccess(account: CurrentAccount): UpdateAccountActionResult {
  return { account, data: account, success: true };
}

function updateError(error: string, code?: string): UpdateAccountActionResult {
  return { account: null, error, success: false, ...(code ? { code } : {}) };
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
  } catch (error: any) {
    return followError(error?.message || "Failed to follow account");
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
  } catch (error: any) {
    return followError(error?.message || "Failed to unfollow account");
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
      return updateError("Failed to update account");
    }

    if (result.account.username) {
      revalidatePath(`/account/${encodeURIComponent(result.account.username)}`);
    }
    revalidatePath("/account");

    return updateSuccess(result.account);
  } catch (error: any) {
    return updateError(error?.message || "Failed to update account");
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
