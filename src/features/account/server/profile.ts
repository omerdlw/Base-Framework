import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/supabase/client";
import { PUBLIC_ACCOUNT_FIELDS, UUID_PATTERN } from "../constants";
import {
  normalizeAccountPatch,
  requireAccountContext,
  readAccountPatchField,
  toCurrentAccount,
  toPublicAccount,
} from "../utils";
import type {
  AccountPatchInput,
  CurrentAccount,
  PublicAccount,
} from "../types";
import { UserError } from "@omerdlw/base-framework/utils";

export async function getCurrentAccount(context: {
  client?: SupabaseClient<Database>;
  userId?: string;
}): Promise<{
  account: CurrentAccount | null;
  profile: CurrentAccount | null;
}> {
  const { client, userId } = requireAccountContext(context);

  const [accountResult, emailResult] = await Promise.all([
    client.from("accounts").select("*").eq("id", userId).single(),
    client
      .from("account_emails")
      .select("email")
      .eq("account_id", userId)
      .maybeSingle(),
  ]);

  if (accountResult.error) throw accountResult.error;

  const account = toCurrentAccount({
    ...accountResult.data,
    email: emailResult.data?.email || null,
  });

  return { account, profile: account };
}

export async function getPublicAccount({
  client,
  username,
}: {
  client: SupabaseClient<Database>;
  username?: string | null;
}): Promise<PublicAccount | null> {
  if (!client) throw new Error("Account client is required");

  const identifier = String(username || "")
    .trim()
    .toLowerCase();
  if (!identifier) return null;

  let query = client.from("accounts").select(PUBLIC_ACCOUNT_FIELDS);

  query = UUID_PATTERN.test(identifier)
    ? query.or(`username.eq.${identifier},id.eq.${identifier}`)
    : query.eq("username", identifier);

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return toPublicAccount(data);
}

export async function updateAccount({
  client,
  input,
  userId,
}: {
  client: SupabaseClient<Database>;
  input: AccountPatchInput;
  userId: string;
}): Promise<{
  account: CurrentAccount | null;
  profile: CurrentAccount | null;
  userId: string;
}> {
  requireAccountContext({ client, userId });

  const { data: current, error: fetchError } = await client
    .from("accounts")
    .select(
      "username, display_name, avatar_url, banner_url, banner_position, background_url, bio, is_private",
    )
    .eq("id", userId)
    .single();

  if (fetchError) throw fetchError;

  const mergedInput: AccountPatchInput = {
    avatarUrl: readAccountPatchField(input, "avatarUrl", current?.avatar_url),
    backgroundUrl: readAccountPatchField(
      input,
      "backgroundUrl",
      current?.background_url,
    ),
    bannerPosition: readAccountPatchField(
      input,
      "bannerPosition",
      current?.banner_position,
    ),
    bannerUrl: readAccountPatchField(input, "bannerUrl", current?.banner_url),
    bio: readAccountPatchField(input, "bio", current?.bio),
    displayName: readAccountPatchField(
      input,
      "displayName",
      current?.display_name || undefined,
    ),
    isPrivate: readAccountPatchField(input, "isPrivate", current?.is_private),
    username: readAccountPatchField(
      input,
      "username",
      current?.username || undefined,
    ),
  };

  const patch = normalizeAccountPatch(mergedInput);

  const [updateResult, emailResult] = await Promise.all([
    client.rpc("update_account", {
      p_avatar_url: patch.avatarUrl,
      p_background_url: patch.backgroundUrl,
      p_banner_position: patch.bannerPosition,
      p_banner_url: patch.bannerUrl,
      p_bio: patch.bio,
      p_display_name: patch.displayName,
      p_is_private: patch.isPrivate,
      p_username: patch.username,
    }),
    client
      .from("account_emails")
      .select("email")
      .eq("account_id", userId)
      .maybeSingle(),
  ]);

  if (updateResult.error) {
    if (updateResult.error.code === "23505") {
      throw new UserError("That username is already taken", 409);
    }
    throw updateResult.error;
  }

  const updatedAccountRow = Array.isArray(updateResult.data)
    ? updateResult.data[0]
    : updateResult.data;

  const account = toCurrentAccount({
    ...updatedAccountRow,
    email: emailResult.data?.email || null,
  });

  return { account, profile: account, userId };
}
