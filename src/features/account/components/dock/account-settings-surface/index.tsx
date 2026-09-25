"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/infrastructure/http/client";
import { useAccount } from "../../../provider";
import { getUserIdentities, listPasskeys, useAuth } from "@/features/auth";
import {
  getDockActionClass,
  useDockActions,
  type SurfaceEntry,
} from "@/core/modules/dock";
import { useToast } from "@/core/modules/notification";
import { ACTION_TONE_CLASS } from "@/core/tokens";
import { cn } from "@/core/utils";

import {
  AccountSettingsOverviewView,
  AccountSettingsMenu,
  AccountEditMenu,
  type AccountSettingsOverviewViewProps,
} from "./overview-view";
import {
  AccountInfoView,
  SurfaceAccountInfoForm,
  type AccountInfoViewProps,
} from "./account-view";
import {
  AccountMediaView,
  SurfaceMediaForm,
  type AccountMediaViewProps,
} from "./media-view";
import {
  AccountEmailView,
  EmailSection,
  type AccountEmailViewProps,
} from "./email-view";
import {
  AccountProvidersView,
  ProvidersSection,
  type AccountProvidersViewProps,
} from "./providers-view";
import {
  AccountSessionsView,
  SessionsSection,
  type AccountSessionsViewProps,
} from "./sessions-view";
import {
  AccountPasskeysView,
  PasskeysSection,
  type AccountPasskeysViewProps,
} from "./passkeys-view";
import {
  AccountDeleteView,
  DeleteSection,
  type AccountDeleteViewProps,
} from "./delete-view";

export {
  AccountSettingsOverviewView,
  AccountSettingsMenu,
  AccountEditMenu,
  AccountInfoView,
  SurfaceAccountInfoForm,
  AccountMediaView,
  SurfaceMediaForm,
  AccountEmailView,
  EmailSection,
  AccountProvidersView,
  ProvidersSection,
  AccountSessionsView,
  SessionsSection,
  AccountPasskeysView,
  PasskeysSection,
  AccountDeleteView,
  DeleteSection,
};

export type {
  AccountSettingsOverviewViewProps,
  AccountInfoViewProps,
  AccountMediaViewProps,
  AccountEmailViewProps,
  AccountProvidersViewProps,
  AccountSessionsViewProps,
  AccountPasskeysViewProps,
  AccountDeleteViewProps,
};

export const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;
export const USERNAME_ERROR =
  "Username must be 3-30 characters and contain letters, numbers, _ or -";

export const SUBMIT_BUTTON_CLASS = getDockActionClass({
  className:
    "h-10 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  variant: ACTION_TONE_CLASS,
});

export const BASE_INPUT_STYLE =
  "w-full resize-none rounded-[20px] bg-white/5 text-sm text-white transition-colors duration-200 placeholder:text-white/50 hover:bg-white/10 focus:bg-white/10 focus:outline-none";

export const INPUT_BASE_CLASSES = cn(BASE_INPUT_STYLE, "h-10 px-4");
export const TEXTAREA_BASE_CLASSES = cn(BASE_INPUT_STYLE, "min-h-36 p-4");

export const SETTING_META = Object.freeze({
  account: {
    description: "Name, username, bio and privacy",
    icon: "solar:user-circle-bold",
    title: "Account info",
  },
  "avatar-banner": {
    description: "Avatar, dock banner and page background",
    icon: "solar:gallery-bold",
    title: "Avatar & Banners",
  },
  delete: {
    description: "Permanently remove this account",
    icon: "solar:trash-bin-trash-bold",
    title: "Delete account",
  },
  email: {
    description: "Email used for sign-in",
    icon: "solar:letter-bold",
    title: "Email sign-in",
  },
  overview: {
    description: "Account, security and controls",
    icon: "solar:settings-bold",
    title: "Account settings",
  },
  passkeys: {
    description: "Passwordless device sign-in",
    icon: "solar:key-bold",
    title: "Passkeys",
  },
  profile: {
    description: "Name, username, bio and privacy",
    icon: "solar:user-circle-bold",
    title: "Account info",
  },
  providers: {
    description: "Manage OAuth connections",
    icon: "solar:link-bold",
    title: "Connected providers",
  },
  sessions: {
    description: "Review and revoke devices",
    icon: "solar:devices-bold",
    title: "Active sessions",
  },
});

export const OAUTH_PROVIDER_CONFIG = Object.freeze({
  google: {
    icon: "flat-color-icons:google",
    key: "google",
    label: "Google",
    supabaseProvider: "google",
  },
  github: {
    icon: "mdi:github",
    key: "github",
    label: "GitHub",
    supabaseProvider: "github",
  },
  x: {
    icon: "simple-icons:x",
    key: "x",
    label: "X",
    supabaseProvider: "twitter",
  },
});

export interface SettingItem {
  description: string;
  icon: string;
  title: string;
  key: string;
}

export const SETTINGS: SettingItem[] = [
  { key: "avatar-banner", ...SETTING_META["avatar-banner"] },
  { key: "account", ...SETTING_META["account"] },
  { key: "email", ...SETTING_META["email"] },
  { key: "providers", ...SETTING_META["providers"] },
  { key: "sessions", ...SETTING_META["sessions"] },
  { key: "passkeys", ...SETTING_META["passkeys"] },
  { key: "delete", ...SETTING_META["delete"] },
];

export function normalizeOAuthProviderKey(provider?: any): string | null {
  const normalized = String(provider || "")
    .trim()
    .toLowerCase();
  if (["google", "google.com"].includes(normalized)) return "google";
  if (["github", "github.com"].includes(normalized)) return "github";
  if (["x", "x.com", "twitter", "twitter.com"].includes(normalized)) return "x";
  return null;
}

export function useAsyncSecurityAction(reloadSecurity?: () => Promise<void>) {
  const toast = useToast();
  return async (
    actionPromise: () => Promise<any>,
    setBusy: (busy: boolean) => void,
    successMsg: string,
    errorMsg: string,
  ) => {
    setBusy(true);
    try {
      await actionPromise();
      if (reloadSecurity) await reloadSecurity();
      toast(successMsg);
    } catch (error: any) {
      toast(error?.message || errorMsg);
    } finally {
      setBusy(false);
    }
  };
}

export function useAccountSettingsState(settingKey = "overview") {
  const accountState = useAccount();
  const auth = useAuth();
  const { closeSurface, openSurface } = useDockActions();
  const router = useRouter();

  const [sessions, setSessions] = useState<any[]>([]);
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [identities, setIdentities] = useState(auth.user?.identities || []);
  const [securityLoading, setSecurityLoading] = useState(false);

  const shouldFetchSecurity = ["sessions", "passkeys", "providers"].includes(
    settingKey,
  );

  const reloadSecurity = useCallback(async () => {
    if (!auth.client || !auth.isAuthenticated) return;
    setSecurityLoading(true);
    try {
      const [sessionRes, nextPasskeys, nextIdentities] = await Promise.all([
        requestJson("/api/auth/sessions", { notifyOnUnauthorized: false }),
        listPasskeys(auth.client).catch(() => []),
        getUserIdentities(auth.client).catch(() => auth.user?.identities || []),
      ]);
      setSessions(sessionRes.sessions || []);
      setPasskeys(nextPasskeys);
      setIdentities(nextIdentities);
    } finally {
      setSecurityLoading(false);
    }
  }, [auth.client, auth.isAuthenticated, auth.user?.identities]);

  useEffect(() => {
    if (!shouldFetchSecurity || !auth.client || !auth.isAuthenticated) return;
    let isCancelled = false;
    const frameId = requestAnimationFrame(() => {
      if (!isCancelled) void reloadSecurity();
    });
    return () => {
      isCancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [shouldFetchSecurity, auth.client, auth.isAuthenticated, reloadSecurity]);

  const revokeSession = useCallback(
    async (sessionId: string) => {
      await requestJson(`/api/auth/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
      await reloadSecurity();
    },
    [reloadSecurity],
  );

  const revokeOthers = useCallback(async () => {
    await requestJson("/api/auth/sessions/others", { method: "POST" });
    await reloadSecurity();
  }, [reloadSecurity]);

  const deleteAccount = useCallback(
    async (confirmation: any) => {
      await requestJson("/api/account/me", {
        body: JSON.stringify({ confirmation }),
        method: "DELETE",
      });
      await auth.signOut("local");
      closeSurface?.();
      router.replace("/?reason=account-deleted");
    },
    [auth, closeSurface, router],
  );

  const openSurfaceByKey = useCallback(
    (key: string) => {
      openSurface(createAccountSettingsSurfaceEntry(key));
    },
    [openSurface],
  );

  const sharedSecurityProps = useMemo(
    () => ({
      account: accountState.account,
      auth,
      deleteAccountAction: deleteAccount,
      deleteAccount,
      identities,
      passkeys,
      reloadSecurityAction: reloadSecurity,
      reloadSecurity,
      revokeOthersAction: revokeOthers,
      revokeOthers,
      revokeSessionAction: revokeSession,
      revokeSession,
      securityLoading,
      sessions,
      user: auth.user,
    }),
    [
      accountState.account,
      auth,
      deleteAccount,
      identities,
      passkeys,
      reloadSecurity,
      revokeOthers,
      revokeSession,
      securityLoading,
      sessions,
    ],
  );

  return {
    account: accountState.account,
    openSurface,
    openSurfaceByKey,
    passkeys,
    securityLoading,
    sessions,
    sharedSecurityProps,
  };
}

export const useAccountEditState = useAccountSettingsState;

export interface AccountSettingsFormProps {
  closeAction?: (result?: any) => void;
  close?: (result?: any) => void;
  section?: string;
  account?: any;
  onAccountUpdateAction?: (updated: any) => void;
  onAccountUpdate?: (updated: any) => void;
  [key: string]: unknown;
}

export const AccountSettingsForm = (props: AccountSettingsFormProps) => {
  const accountState = useAccount();
  const currentAccount = accountState?.account || accountState?.profile;
  const handleClose = props.closeAction ?? props.close;
  if (props.section === "avatar-banner") {
    return (
      <AccountMediaView
        key={currentAccount?.id || "anonymous"}
        closeAction={handleClose}
        close={handleClose}
        currentAccount={currentAccount}
        {...props}
      />
    );
  }
  return (
    <AccountInfoView
      key={currentAccount?.id || "anonymous"}
      closeAction={handleClose}
      close={handleClose}
      currentAccount={currentAccount}
      {...props}
    />
  );
};
export const AccountProfileSettingsForm = AccountSettingsForm;

export interface AccountSettingsSecurityProps {
  account?: any;
  auth?: any;
  deleteAccountAction?: (confirmation: any) => Promise<void>;
  deleteAccount?: (confirmation: any) => Promise<void>;
  identities?: any[];
  passkeys?: any[];
  reloadSecurityAction?: () => Promise<void>;
  reloadSecurity?: () => Promise<void>;
  revokeOthersAction?: () => Promise<void>;
  revokeOthers?: () => Promise<void>;
  revokeSessionAction?: (id: string) => Promise<void>;
  revokeSession?: (id: string) => Promise<void>;
  section: string;
  securityLoading?: boolean;
  sessions?: any[];
  user?: any;
  closeAction?: () => void;
  close?: () => void;
  [key: string]: unknown;
}

export function AccountSettingsSecurity({
  account,
  auth,
  deleteAccountAction,
  deleteAccount,
  identities,
  passkeys,
  reloadSecurityAction,
  reloadSecurity,
  revokeOthersAction,
  revokeOthers,
  revokeSessionAction,
  revokeSession,
  section,
  securityLoading,
  sessions,
  user,
}: AccountSettingsSecurityProps) {
  switch (section) {
    case "email":
      return <AccountEmailView account={account} auth={auth} />;
    case "providers":
      return (
        <AccountProvidersView
          auth={auth}
          identities={identities}
          reloadSecurityAction={reloadSecurityAction ?? reloadSecurity}
          user={user}
        />
      );
    case "sessions":
      return (
        <AccountSessionsView
          reloadSecurityAction={reloadSecurityAction ?? reloadSecurity}
          revokeOthersAction={revokeOthersAction ?? revokeOthers}
          revokeSessionAction={revokeSessionAction ?? revokeSession}
          securityLoading={securityLoading}
          sessions={sessions}
        />
      );
    case "passkeys":
      return (
        <AccountPasskeysView
          auth={auth}
          passkeys={passkeys}
          reloadSecurityAction={reloadSecurityAction ?? reloadSecurity}
          securityLoading={securityLoading}
        />
      );
    case "delete":
      return (
        <AccountDeleteView
          auth={auth}
          deleteAccountAction={deleteAccountAction ?? deleteAccount}
        />
      );
    default:
      return (
        <p className="text-sm text-white/50">
          This account setting is not available yet
        </p>
      );
  }
}

export const AccountEditSettings = AccountSettingsSecurity;
export type AccountEditSettingsProps = AccountSettingsSecurityProps;

export function createAccountSettingsSurfaceEntry(
  settingKey: string = "overview",
  props: Record<string, unknown> = {},
  config: Partial<SurfaceEntry> = {},
): SurfaceEntry {
  const meta =
    (SETTING_META as Record<string, any>)[settingKey] || SETTING_META.overview;
  const isMedia = settingKey === "avatar-banner";
  return {
    component: AccountSettingsSurface,
    description: meta.description,
    expandHorizontal: isMedia || Boolean(config.expandHorizontal),
    width: isMedia ? 580 : config.width,
    icon: meta.icon,
    props: { settingKey, ...props },
    title: meta.title,
    ...config,
  };
}

export const createAccountEditSurfaceEntry = createAccountSettingsSurfaceEntry;

export interface AccountSettingsSurfaceProps {
  closeAction?: () => void;
  close?: () => void;
  settingKey?: string;
  account?: any;
  [key: string]: unknown;
}

export type AccountEditSurfaceProps = AccountSettingsSurfaceProps;

export function AccountSettingsSurface({
  closeAction,
  close,
  settingKey = "overview",
  ...props
}: AccountSettingsSurfaceProps) {
  const state = useAccountSettingsState(settingKey);
  const { openSurface } = useDockActions();
  const handleClose = closeAction ?? close;

  if (settingKey === "overview") {
    return (
      <AccountSettingsOverviewView
        onSelectAction={(key) =>
          openSurface(createAccountSettingsSurfaceEntry(key))
        }
      />
    );
  }

  const isProfileSection = ["account", "profile", "avatar-banner"].includes(
    settingKey,
  );

  return (
    <div className="flex flex-col gap-2.5">
      {isProfileSection ? (
        <AccountSettingsForm
          closeAction={handleClose}
          close={handleClose}
          section={settingKey}
          {...props}
        />
      ) : (
        <AccountSettingsSecurity
          closeAction={handleClose}
          section={settingKey}
          {...(props.account ? props : state.sharedSecurityProps)}
        />
      )}
    </div>
  );
}

export const AccountEditSurface = AccountSettingsSurface;
export default AccountSettingsSurface;
