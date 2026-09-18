"use client";

import dynamic from "next/dynamic";
import type { SurfaceEntry } from "@/core/modules/nav";
import type {
  AccountSetupData,
  AccountSetupSurfaceProps,
} from "./account-setup-surface-view";

export type { AccountSetupData, AccountSetupSurfaceProps };

export const AccountSetupSurface = dynamic<AccountSetupSurfaceProps>(
  () =>
    import("./account-setup-surface-view").then((m) => m.AccountSetupSurface),
  { ssr: false },
);

export function createAccountSetupSurfaceEntry(
  data: AccountSetupData = {},
  config: Partial<SurfaceEntry> = {},
): SurfaceEntry {
  return {
    component: AccountSetupSurface,
    title: "Set up account",
    props: { data },
    ...config,
  };
}

export default AccountSetupSurface;
