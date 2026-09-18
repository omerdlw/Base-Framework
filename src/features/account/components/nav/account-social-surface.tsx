"use client";

import dynamic from "next/dynamic";
import type { SurfaceEntry } from "@/core/modules/nav";
import { getUserAvatarUrl } from "../../utils";
import type {
  AccountSocialData,
  AccountSocialSurfaceProps,
  SocialUser,
} from "./account-social-surface-view";

export type { AccountSocialData, AccountSocialSurfaceProps, SocialUser };

export const AccountSocialSurface = dynamic<AccountSocialSurfaceProps>(
  () =>
    import("./account-social-surface-view").then((m) => m.AccountSocialSurface),
  { ssr: false },
);

function normalizeTab(value?: unknown): string {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "following") return "following";
  if (normalized === "requests" || normalized === "inbox") return "inbox";
  return "followers";
}

export function createAccountSocialSurfaceEntry(
  data: AccountSocialData = {},
  config: Partial<SurfaceEntry> = {},
): SurfaceEntry {
  const account = data?.account || data?.profile || null;
  const username = data?.username || account?.username || "";
  const displayName = String(
    data?.displayName ||
      account?.displayName ||
      account?.display_name ||
      username ||
      "Social",
  ).trim();
  const icon =
    data?.avatarUrl ||
    (account ? getUserAvatarUrl(account) : "solar:users-group-rounded-bold");

  const tab = normalizeTab(data?.tab || data?.type);
  const tabLabel =
    tab === "inbox"
      ? "Follow Requests"
      : tab === "following"
        ? "Following"
        : "Followers";

  return {
    component: AccountSocialSurface,
    icon,
    title: displayName,
    description: tabLabel,
    props: { data },
    expandHorizontal: false,
    ...config,
  };
}

export default AccountSocialSurface;
