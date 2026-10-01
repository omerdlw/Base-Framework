export interface PublicAccount {
  avatarUrl: string | null;
  backgroundUrl: string | null;
  bannerPosition: string | null;
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

export interface CurrentAccount {
  avatarUrl: string | null;
  backgroundUrl: string | null;
  bannerPosition: string | null;
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

export interface AccountPatchInput {
  avatarUrl?: string | null;
  backgroundUrl?: string | null;
  bannerPosition?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  displayName?: string;
  isPrivate?: boolean | string;
  username?: string;
}

export interface NormalizedAccountPatch {
  avatarUrl: string | null;
  backgroundUrl: string | null;
  bannerPosition: string | null;
  bannerUrl: string | null;
  bio: string | null;
  displayName: string;
  isPrivate: boolean;
  username: string;
}

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
