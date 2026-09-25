import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/supabase/client";
import { PUBLIC_ACCOUNT_FIELDS, UUID_PATTERN } from "../constants";
import {
  normalizeAccountPatch,
  requireAccountContext,
  resolveInputValue,
  toCurrentAccount,
  toPublicAccount,
} from "../utils";
import type {
  AccountPatchInput,
  CurrentAccount,
  PublicAccount,
} from "../types";

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

export const getPublicProfile = getPublicAccount;

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

  const mergedInput = {
    avatarUrl: resolveInputValue(
      input?.avatarUrl,
      input?.avatar_url,
      current?.avatar_url,
    ),
    backgroundUrl: resolveInputValue(
      input?.backgroundUrl,
      input?.background_url,
      current?.background_url,
    ),
    bannerPosition: resolveInputValue(
      input?.bannerPosition,
      input?.banner_position,
      current?.banner_position,
    ),
    bannerUrl: resolveInputValue(
      input?.bannerUrl,
      input?.banner_url,
      current?.banner_url,
    ),
    bio: resolveInputValue(input?.bio, undefined, current?.bio),
    displayName: resolveInputValue(
      input?.displayName,
      input?.display_name,
      current?.display_name || undefined,
    ),
    isPrivate: resolveInputValue(
      input?.isPrivate,
      input?.is_private,
      current?.is_private,
    ),
    username: resolveInputValue(
      input?.username,
      undefined,
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

  if (updateResult.error) throw updateResult.error;

  const updatedAccountRow = Array.isArray(updateResult.data)
    ? updateResult.data[0]
    : updateResult.data;

  const account = toCurrentAccount({
    ...updatedAccountRow,
    email: emailResult.data?.email || null,
  });

  return { account, profile: account, userId };
}

export const updateAccountProfile = updateAccount;

export async function deactivateCurrentAccount(context: {
  client?: SupabaseClient<Database>;
  userId?: string;
}): Promise<{ deactivated: true; userId: string }> {
  const { client, userId } = requireAccountContext(context);

  const { error } = await client.rpc("deactivate_current_account");
  if (error) throw error;

  return { deactivated: true, userId };
}

export async function reactivateCurrentAccount(context: {
  client?: SupabaseClient<Database>;
  userId?: string;
}): Promise<{ reactivated: true; userId: string }> {
  const { client, userId } = requireAccountContext(context);

  const { error } = await client.rpc("reactivate_current_account");
  if (error) throw error;

  return { reactivated: true, userId };
}
