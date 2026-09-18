export interface PublicAccount {
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  createdAt: string;
  displayName: string;
  id: string;
  isPrivate: boolean;
  updatedAt: string;
  username: string;
  [key: string]: unknown;
}

export type PublicProfile = PublicAccount;

export interface CurrentAccount {
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  createdAt: string;
  deactivatedAt: string | null;
  displayName: string;
  email: string | null;
  id: string;
  isPrivate: boolean;
  status: string;
  updatedAt: string;
  username: string;
  [key: string]: unknown;
}

export type CurrentProfile = CurrentAccount;

export interface AccountPatchInput {
  avatarUrl?: string | null;
  avatar_url?: string | null;
  bannerUrl?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  displayName?: string;
  display_name?: string;
  isPrivate?: boolean | string;
  is_private?: boolean | string;
  username?: string;
  [key: string]: unknown;
}

export type ProfilePatchInput = AccountPatchInput;

export interface NormalizedAccountPatch {
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  displayName: string;
  isPrivate: boolean;
  username: string;
}

export type NormalizedProfilePatch = NormalizedAccountPatch;

export interface AccountState {
  account: CurrentAccount | null;
  error: unknown;
  isLoading: boolean;
  profile: CurrentAccount | null;
}

export interface AccountContextValue extends AccountState {
  client: any;
  refresh: () => Promise<any>;
  update: (patch: AccountPatchInput) => Promise<any>;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/supabase/client";

export interface AccountClientContext<T = Database> {
  client: SupabaseClient<T>;
  userId: string;
}
