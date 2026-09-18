"use client";

import dynamic from "next/dynamic";
import type { SurfaceEntry } from "@/core/modules/nav";
import {
  SETTING_META,
  OAUTH_PROVIDER_CONFIG,
  SUBMIT_BUTTON_CLASS,
  INPUT_BASE_CLASSES,
  TEXTAREA_BASE_CLASSES,
  normalizeOAuthProviderKey,
  useAccountEditState,
  AccountEditMenu,
  AccountSettingsForm,
  AccountProfileSettingsForm,
  AccountEditSettings,
  type AccountEditSurfaceProps,
  type AccountEditSettingsProps,
  type AccountSettingsFormProps,
} from "./account-edit-surface-view";

export {
  SETTING_META,
  OAUTH_PROVIDER_CONFIG,
  SUBMIT_BUTTON_CLASS,
  INPUT_BASE_CLASSES,
  TEXTAREA_BASE_CLASSES,
  normalizeOAuthProviderKey,
  useAccountEditState,
  AccountEditMenu,
  AccountSettingsForm,
  AccountProfileSettingsForm,
  AccountEditSettings,
};

export type {
  AccountEditSurfaceProps,
  AccountEditSettingsProps,
  AccountSettingsFormProps,
};

export const AccountEditSurface = dynamic<AccountEditSurfaceProps>(
  () => import("./account-edit-surface-view").then((m) => m.AccountEditSurface),
  { ssr: false },
);

export function createAccountEditSurfaceEntry(
  settingKey: string = "overview",
  props: Record<string, unknown> = {},
  config: Partial<SurfaceEntry> = {},
): SurfaceEntry {
  const meta =
    (SETTING_META as Record<string, any>)[settingKey] || SETTING_META.overview;
  return {
    component: AccountEditSurface,
    description: meta.description,
    expandHorizontal: false,
    icon: meta.icon,
    props: { settingKey, ...props },
    title: meta.title,
    ...config,
  };
}

export default AccountEditSurface;
