import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/supabase/client";
import type {
  AccountClientContext,
  CurrentAccount,
  PublicAccount,
} from "../types";
import { USERNAME_PATTERN } from "../constants";
import type { AccountPatchInput, NormalizedAccountPatch } from "../types";
import { UserError } from "@omerdlw/base-framework/utils";

export function toPublicAccount(row: any): PublicAccount | null {
  if (!row) return null;
  return {
    avatarUrl: row.avatar_url || null,
    backgroundUrl: row.background_url || null,
    bannerPosition: row.banner_position || null,
    bannerUrl: row.banner_url || null,
    bio: row.bio || null,
    createdAt: row.created_at,
    displayName: row.display_name,
    id: row.id,
    isPrivate: row.is_private === true,
    updatedAt: row.updated_at,
    username: row.username,
  };
}

export function toCurrentAccount(row: any): CurrentAccount | null {
  if (!row) return null;
  return {
    avatarUrl: row.avatar_url || null,
    backgroundUrl: row.background_url || null,
    bannerPosition: row.banner_position || null,
    bannerUrl: row.banner_url || null,
    bio: row.bio || null,
    createdAt: row.created_at,
    deactivatedAt: row.deactivated_at || null,
    displayName: row.display_name,
    email: row.email,
    id: row.id,
    isPrivate: row.is_private === true,
    status: row.status,
    updatedAt: row.updated_at,
    username: row.username,
  };
}

export function requireAccountContext(context: {
  client?: SupabaseClient<Database>;
  userId?: string;
}): AccountClientContext {
  if (!context?.client || !context?.userId) {
    throw new Error("Account client and authenticated user id are required");
  }
  return { client: context.client, userId: context.userId };
}

function normalizeText(value: unknown, maxLength: number): string {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

function normalizeUsername(value: unknown): string {
  const username = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!USERNAME_PATTERN.test(username)) {
    throw new UserError(
      "Username must be 3-30 characters and contain letters, numbers, _ or -",
    );
  }
  return username;
}

export function readAccountPatchField<K extends keyof AccountPatchInput, F>(
  input: AccountPatchInput | undefined,
  field: K,
  fallback: F,
): Exclude<AccountPatchInput[K], undefined> | F {
  const value = input?.[field];
  return value !== undefined
    ? (value as Exclude<AccountPatchInput[K], undefined>)
    : fallback;
}

export function normalizeAccountPatch(
  input: AccountPatchInput = {},
): NormalizedAccountPatch {
  const rawDisplayName = readAccountPatchField(input, "displayName", "");
  const displayName = normalizeText(rawDisplayName, 80);
  if (!displayName) throw new UserError("Display name is required");

  const rawAvatarUrl = readAccountPatchField(input, "avatarUrl", null);
  const rawBannerUrl = readAccountPatchField(input, "bannerUrl", null);
  const rawBackgroundUrl = readAccountPatchField(input, "backgroundUrl", null);
  const rawBannerPosition = readAccountPatchField(
    input,
    "bannerPosition",
    null,
  );
  const rawBio = readAccountPatchField(input, "bio", null);
  const rawIsPrivate = readAccountPatchField(input, "isPrivate", false);

  return {
    avatarUrl: normalizeText(rawAvatarUrl, 2048) || null,
    backgroundUrl: normalizeText(rawBackgroundUrl, 2048) || null,
    bannerPosition: normalizeText(rawBannerPosition, 64) || null,
    bannerUrl: normalizeText(rawBannerUrl, 2048) || null,
    bio: normalizeText(rawBio, 500) || null,
    displayName,
    isPrivate: rawIsPrivate === true || rawIsPrivate === "on",
    username: normalizeUsername(input.username),
  };
}
