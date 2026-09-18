"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/infrastructure/http/client";
import { updateAccountAction } from "../../server/actions";
import { useAccount } from "../../provider";
import {
  deletePasskey,
  getAuthCallbackUrl,
  getUserIdentities,
  linkIdentity,
  listPasskeys,
  registerPasskey,
  renamePasskey,
  requestEmailAuth,
  unlinkIdentity,
  useAuth,
  createVerificationSurfaceEntry,
} from "@/features/auth";
import {
  getNavActionClass,
  useNavigationActions,
  type SurfaceEntry,
} from "@/core/modules/nav";
import { useToast } from "@/core/modules/notification";
import { Button, Icon, Input } from "@/core/primitives";
import AdaptiveImage from "@/core/primitives/adaptive-image";
import {
  DESTRUCTIVE_ACTION_TONE_CLASS,
  INFO_ACTION_TONE_CLASS,
  SUCCESS_ACTION_TONE_CLASS,
} from "@/core/tokens";
import { cn } from "@/core/utils";
import {
  formatSessionActivity,
  formatSessionIp,
  parseUserAgent,
} from "../../utils";

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;
const USERNAME_ERROR =
  "Username must be 3-30 characters and contain letters, numbers, _ or -";

export const SUBMIT_BUTTON_CLASS = getNavActionClass({
  className:
    "h-10 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  variant: INFO_ACTION_TONE_CLASS,
});

const BASE_INPUT_STYLE =
  "w-full resize-none rounded-[20px] bg-white/5 p-4 text-sm text-white ring-1 ring-inset ring-white/5 transition-colors placeholder:text-white/50 hover:bg-white/10 hover:ring-white/10 focus:bg-white/10 focus:ring-white/10";

export const INPUT_BASE_CLASSES = cn(BASE_INPUT_STYLE, "h-10");
export const TEXTAREA_BASE_CLASSES = cn(BASE_INPUT_STYLE, "min-h-36");

export const SETTING_META = Object.freeze({
  account: {
    description: "Name, username, bio and privacy",
    icon: "solar:user-circle-bold",
    title: "Account info",
  },
  "avatar-banner": {
    description: "Avatar and banner image",
    icon: "solar:gallery-bold",
    title: "Gallery",
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
    icon: "solar:user-circle-bold",
    title: "Edit account",
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

interface SettingItem {
  description: string;
  icon: string;
  title: string;
  key: string;
  danger?: boolean;
}
const SETTINGS: SettingItem[] = [
  { key: "avatar-banner", ...SETTING_META["avatar-banner"] },
  { key: "account", ...SETTING_META["account"] },
  { key: "email", ...SETTING_META["email"] },
  { key: "providers", ...SETTING_META["providers"] },
  { key: "sessions", ...SETTING_META["sessions"] },
  { key: "passkeys", ...SETTING_META["passkeys"] },
  { key: "delete", danger: true, ...SETTING_META["delete"] },
];

export function normalizeOAuthProviderKey(provider?: any) {
  const normalized = String(provider || "")
    .trim()
    .toLowerCase();
  if (["google", "google.com"].includes(normalized)) return "google";
  if (["github", "github.com"].includes(normalized)) return "github";
  if (["x", "x.com", "twitter", "twitter.com"].includes(normalized)) return "x";
  return null;
}

function useAsyncSecurityAction(reloadSecurity?: () => Promise<void>) {
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
      toast.success(successMsg);
    } catch (error: any) {
      toast.error(error?.message || errorMsg);
    } finally {
      setBusy(false);
    }
  };
}

export function useAccountEditState(settingKey = "overview") {
  const accountState = useAccount();
  const auth = useAuth();
  const { closeSurface, openSurface } = useNavigationActions();
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

  const sharedSecurityProps = useMemo(
    () => ({
      account: accountState.account,
      auth,
      deleteAccount,
      identities,
      passkeys,
      reloadSecurity,
      revokeOthers,
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
    passkeys,
    securityLoading,
    sessions,
    sharedSecurityProps,
  };
}

export function AccountEditMenu({ state }: { state: any }) {
  return (
    <div className="grid gap-2.5">
      {SETTINGS.map((s) => (
        <Button
          key={s.key}
          type="button"
          onClick={() =>
            state.openSurface(createAccountEditSurfaceEntry(s.key))
          }
          className={cn(
            "group/item flex w-full items-center gap-2.5 rounded-[20px] p-2.5 text-left ring-1 ring-inset transition-colors cursor-pointer",
            s.danger
              ? "bg-error/10 ring-error/10 hover:bg-error"
              : "bg-transparent ring-white/5 hover:bg-white/5",
          )}
        >
          <span
            className={cn(
              "center size-10 shrink-0 rounded-[10px]",
              s.danger
                ? "text-error group-hover/item:text-white"
                : "text-white/70 group-hover/item:text-white",
            )}
          >
            <Icon icon={s.icon} size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block text-sm font-semibold",
                s.danger
                  ? "text-error group-hover/item:text-white"
                  : "text-white",
              )}
            >
              {s.title}
            </span>
            <span
              className={cn(
                "block truncate text-xs",
                s.danger
                  ? "text-error/70 group-hover/item:text-white"
                  : "text-white/70 group-hover/item:text-white",
              )}
            >
              {s.description}
            </span>
          </span>
          <Icon
            icon="solar:alt-arrow-right-linear"
            size={18}
            className={cn(
              s.danger
                ? "text-error/50 group-hover/item:text-white"
                : "text-white/50 group-hover/item:text-white",
            )}
          />
        </Button>
      ))}
    </div>
  );
}

function SurfaceAccountInfoForm({
  close,
  currentAccount,
  form: formProp,
  formId = "account-edit-info-form",
  handleAccountSubmit,
  handleChange,
}: any) {
  const accountState = useAccount();
  const account =
    currentAccount || accountState?.account || accountState?.profile;
  const router = useRouter();
  const toast = useToast();

  const [displayName, setDisplayName] = useState(
    () => formProp?.displayName ?? account?.displayName ?? "",
  );
  const [username, setUsername] = useState(
    () => formProp?.username ?? account?.username ?? "",
  );
  const [bio, setBio] = useState(() => formProp?.bio ?? account?.bio ?? "");
  const [isPrivate, setIsPrivate] = useState(() =>
    Boolean(formProp?.isPrivate ?? account?.isPrivate),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onChange = (setter: any, key: any, val: any) => {
    setter(val);
    handleChange?.(key, val);
  };

  const [actionState, formAction, isPending] = useActionState(
    async (_prev: any, formData: FormData) => {
      const formDisplayName =
        (formData?.get("displayName") as string) || displayName;
      const formUsername = (formData?.get("username") as string) || username;
      const formBio = (formData?.get("bio") as string) || bio;
      const formIsPrivate = formData?.has("isPrivate")
        ? formData.get("isPrivate") === "true" ||
          formData.get("isPrivate") === "on"
        : isPrivate;

      const trimmedName = formDisplayName.trim();
      const trimmedUsername = formUsername.trim().toLowerCase();

      if (!trimmedName) {
        return { error: "Display name is required", success: false };
      }
      if (!USERNAME_REGEX.test(trimmedUsername)) {
        return { error: USERNAME_ERROR, success: false };
      }

      const result = await updateAccountAction({
        bio: formBio.trim(),
        displayName: trimmedName,
        isPrivate: formIsPrivate,
        username: trimmedUsername,
      });

      if (!result.success) {
        return {
          error: result.error || "Account could not be updated",
          success: false,
        };
      }

      await accountState.refresh();
      return {
        nextUsername: result.account?.username || trimmedUsername,
        success: true,
      };
    },
    null,
  );

  useEffect(() => {
    if (!actionState) return;
    if (actionState.success) {
      toast.success("Account info updated successfully");
      router.refresh();
      const nextUsername = actionState.nextUsername;
      if (nextUsername && nextUsername !== account?.username) {
        router.replace(`/account/${encodeURIComponent(nextUsername)}`);
      }
      close?.({ success: true });
    } else if (actionState.error) {
      toast.error(actionState.error);
    }
  }, [actionState, account?.username, close, router, toast]);

  return (
    <form
      id={formId}
      action={handleAccountSubmit ? undefined : formAction}
      onSubmit={handleAccountSubmit}
      className="flex flex-col gap-2.5"
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Input
          name="displayName"
          className={INPUT_BASE_CLASSES}
          disabled={isPending}
          required
          maxLength={80}
          placeholder="Display Name"
          value={displayName}
          onChange={(e: any) =>
            onChange(setDisplayName, "displayName", e.target.value)
          }
        />
        <Input
          name="username"
          className={INPUT_BASE_CLASSES}
          disabled={isPending}
          required
          maxLength={30}
          pattern="[a-zA-Z0-9_-]{3,30}"
          spellCheck={false}
          placeholder="Username"
          value={username}
          onChange={(e: any) =>
            onChange(setUsername, "username", e.target.value)
          }
        />
      </div>
      <Input
        name="bio"
        className={TEXTAREA_BASE_CLASSES}
        disabled={isPending}
        maxLength={500}
        mode="textarea"
        rows={4}
        placeholder="Bio"
        value={bio}
        onChange={(e: any) => onChange(setBio, "bio", e.target.value)}
      />

      <input type="hidden" name="isPrivate" value={String(isPrivate)} />

      <Button
        type="button"
        role="switch"
        aria-checked={isPrivate}
        disabled={isPending}
        onClick={() => onChange(setIsPrivate, "isPrivate", !isPrivate)}
        className="flex h-11 w-full items-center justify-between rounded-[20px] bg-white/5 px-4 ring-1 ring-inset ring-white/5 transition-colors hover:bg-white/10 hover:ring-white/10"
      >
        <span className="text-sm font-medium text-white">
          {isPrivate ? "Private profile" : "Public profile"}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "flex h-6 w-11 shrink-0 rounded-full p-0.5 ring-1 ring-inset transition-colors",
            isPrivate
              ? "bg-white/15 ring-white/15"
              : "bg-black/60 ring-white/10",
          )}
        >
          <span
            className={cn(
              "size-5 rounded-full transition-colors",
              isPrivate
                ? "translate-x-5 bg-white shadow-sm"
                : "translate-x-0 bg-white/50",
            )}
          />
        </span>
      </Button>

      <Button
        type="submit"
        form={formId}
        disabled={isPending}
        className={SUBMIT_BUTTON_CLASS}
      >
        {isPending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}

function MediaCard({
  title,
  url,
  fallbackIcon,
  isSubmitting,
  onChange,
  wrapperClass,
}: any) {
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-[20px] bg-white/5 p-3.5 ring-1 ring-inset ring-white/5">
      <span className="text-xs font-semibold text-white/70">{title}</span>
      <div className="flex h-24 w-full items-center justify-center">
        <div
          className={cn(
            "relative overflow-hidden bg-black/60 ring-1 ring-inset ring-white/10 center text-white/50",
            wrapperClass,
          )}
        >
          {url ? (
            <AdaptiveImage
              alt={`${title} preview`}
              className="size-full object-cover"
              src={url}
            />
          ) : (
            <Icon icon={fallbackIcon} size={32} />
          )}
        </div>
      </div>
      <Input
        className={INPUT_BASE_CLASSES}
        disabled={isSubmitting}
        type="url"
        placeholder={`${title} URL`}
        value={url}
        onChange={(e: any) => onChange(e.target.value)}
      />
      {url && (
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => onChange("")}
          className="h-10 w-full rounded-[20px] bg-white/5 px-4 text-xs font-semibold text-white/70 ring-1 ring-inset ring-white/5 transition-colors hover:bg-white/10 hover:text-white hover:ring-white/10 disabled:opacity-50"
        >
          Clear {title.toLowerCase()}
        </Button>
      )}
    </div>
  );
}

function SurfaceMediaForm({
  close,
  currentAccount,
  form: formProp,
  formId = "account-edit-media-form",
  handleAccountSubmit,
  handleChange,
}: any) {
  const accountState = useAccount();
  const account =
    currentAccount || accountState?.account || accountState?.profile;
  const router = useRouter();
  const toast = useToast();

  const [avatarUrl, setAvatarUrl] = useState(
    () => formProp?.avatarUrl ?? account?.avatarUrl ?? "",
  );
  const [bannerUrl, setBannerUrl] = useState(
    () => formProp?.bannerUrl ?? account?.bannerUrl ?? "",
  );

  const onChange = (setter: any, key: any, val: any) => {
    setter(val);
    handleChange?.(key, val);
  };

  const [imageActionState, imageFormAction, isImagePending] = useActionState(
    async () => {
      const result = await updateAccountAction({
        avatarUrl: avatarUrl.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
      });
      if (!result.success) {
        return {
          error: result.error || "Failed to update images",
          success: false,
        };
      }
      await accountState.refresh();
      return { success: true };
    },
    null,
  );

  useEffect(() => {
    if (!imageActionState) return;
    if (imageActionState.success) {
      toast.success("Gallery images updated successfully");
      router.refresh();
      close?.({ success: true });
    } else if (imageActionState.error) {
      toast.error(imageActionState.error);
    }
  }, [close, imageActionState, router, toast]);

  return (
    <form
      id={formId}
      action={handleAccountSubmit ? undefined : imageFormAction}
      onSubmit={handleAccountSubmit}
      className="flex flex-col gap-2.5"
    >
      <div className="flex w-full flex-col gap-2.5 sm:flex-row">
        <MediaCard
          title="Avatar"
          url={avatarUrl}
          fallbackIcon="solar:user-circle-bold"
          isSubmitting={isImagePending}
          wrapperClass="size-20 shrink-0 rounded-full"
          onChange={(val: any) => onChange(setAvatarUrl, "avatarUrl", val)}
        />
        <MediaCard
          title="Banner"
          url={bannerUrl}
          fallbackIcon="solar:gallery-bold"
          isSubmitting={isImagePending}
          wrapperClass="h-20 w-full rounded-[14px]"
          onChange={(val: any) => onChange(setBannerUrl, "bannerUrl", val)}
        />
      </div>
      <Button
        type="submit"
        form={formId}
        disabled={isImagePending}
        className={SUBMIT_BUTTON_CLASS}
      >
        {isImagePending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}

export interface AccountSettingsFormProps {
  close?: () => void;
  section?: string;
  account?: any;
  onAccountUpdate?: (updated: any) => void;
  [key: string]: unknown;
}

export const AccountSettingsForm = (props: AccountSettingsFormProps) => {
  const accountState = useAccount();
  const currentAccount = accountState?.account || accountState?.profile;
  const FormComponent =
    props.section === "avatar-banner"
      ? SurfaceMediaForm
      : SurfaceAccountInfoForm;
  return (
    <FormComponent
      key={currentAccount?.id || "anonymous"}
      currentAccount={currentAccount}
      {...props}
    />
  );
};
export const AccountProfileSettingsForm = AccountSettingsForm;

function EmailSection({ account, auth }: { account?: any; auth: any }) {
  const toast = useToast();
  const [email, setEmail] = useState(account?.email || "");
  const [pending, setPending] = useState(false);
  const isCurrentEmail = email.trim() === (account?.email || "").trim();

  async function updateEmail() {
    setPending(true);
    try {
      const { error } = await auth.client.auth.updateUser({ email });
      if (error) throw error;
      toast.info("Check your inbox to confirm the new email");
    } catch (error: any) {
      toast.error(error.message || "Email could not be updated");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Input
        aria-label="New email"
        type="email"
        placeholder="New email"
        className={INPUT_BASE_CLASSES}
        disabled={pending}
        value={email}
        onChange={(e: any) => setEmail(e.target.value)}
      />
      <Button
        type="button"
        className={SUBMIT_BUTTON_CLASS}
        disabled={pending || !auth?.client || !email.trim() || isCurrentEmail}
        onClick={updateEmail}
      >
        {pending ? "Verifying..." : "Verify and update email"}
      </Button>
    </div>
  );
}

function ProvidersSection({
  auth,
  identities,
  reloadSecurity,
  user,
}: {
  auth: any;
  identities?: any[];
  reloadSecurity?: () => Promise<void>;
  user?: any;
}) {
  const toast = useToast();
  const [linkingProvider, setLinkingProvider] = useState(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState(null);
  const [unlinkedIds, setUnlinkedIds] = useState(new Set());

  const activeIdentities = useMemo(() => {
    const rawIdentities = identities?.length
      ? identities
      : user?.identities || [];
    return rawIdentities.filter(
      (id: any) => !unlinkedIds.has(id?.id || id?.identity_id),
    );
  }, [identities, unlinkedIds, user?.identities]);

  const { connectedList, availableList } = useMemo(() => {
    const linkedMap = new Map();
    activeIdentities.forEach((id: any) => {
      const key = normalizeOAuthProviderKey(id?.provider);
      if (key && (OAUTH_PROVIDER_CONFIG as any)[key]) linkedMap.set(key, id);
    });
    return {
      connectedList: Array.from(linkedMap.entries()).map(([key, identity]) => ({
        config: (OAUTH_PROVIDER_CONFIG as any)[key],
        identity,
        key,
      })),
      availableList: Object.values(OAUTH_PROVIDER_CONFIG).filter(
        (item) => !linkedMap.has(item.key),
      ),
    };
  }, [activeIdentities]);

  async function handleUnlink(item: any) {
    if (unlinkingProvider || !auth?.client) return;
    if (activeIdentities.length < 2)
      return toast.error(
        "Keep at least one sign-in method connected to this account",
      );

    setUnlinkingProvider(item.key);
    try {
      await unlinkIdentity(auth.client, item.identity);
      const targetId = item.identity?.id || item.identity?.identity_id;
      if (targetId) setUnlinkedIds((prev) => new Set([...prev, targetId]));
      toast.success(`${item.config.label} disconnected`);
      await reloadSecurity?.();
      await auth.refresh?.();
    } catch (error: any) {
      toast.error(
        error.message?.toLowerCase().includes("manual linking")
          ? `${item.config.label} disconnecting is disabled in Supabase settings`
          : error.message || "Disconnect failed",
      );
    } finally {
      setUnlinkingProvider(null);
    }
  }

  async function handleLink(config: any) {
    if (linkingProvider || !auth?.client) return;
    setLinkingProvider(config.key);
    try {
      await linkIdentity(auth.client, {
        provider: config.supabaseProvider,
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account")}`,
      });
    } catch (error: any) {
      setLinkingProvider(null);
      toast.error(
        error.message?.toLowerCase().includes("manual linking")
          ? `${config.label} linking is disabled in Supabase settings`
          : error.message || "Connection failed",
      );
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {connectedList.map((item) => (
        <div
          key={item.key}
          className="flex w-full items-center justify-between rounded-[20px] bg-white/5 p-1 pl-4 text-white ring-1 ring-inset ring-white/5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Icon icon={item.config.icon} size={18} className="shrink-0" />
            <span className="truncate text-sm font-medium text-white">
              {item.config.label}
            </span>
          </div>
          <Button
            type="button"
            disabled={Boolean(unlinkingProvider)}
            onClick={() => handleUnlink(item)}
            className={cn(
              "center h-9 rounded-[16px] px-3.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
              DESTRUCTIVE_ACTION_TONE_CLASS,
            )}
          >
            {unlinkingProvider === item.key ? "Disconnecting" : "Disconnect"}
          </Button>
        </div>
      ))}
      {availableList.map((config) => (
        <Button
          key={config.key}
          type="button"
          disabled={Boolean(linkingProvider)}
          onClick={() => handleLink(config)}
          className="flex h-11 w-full items-center justify-between rounded-[20px] bg-white/5 px-4 text-white/70 ring-1 ring-inset ring-white/5 transition-colors hover:bg-white/10 hover:text-white hover:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex min-w-0 items-center gap-3">
            <Icon
              icon={config.icon}
              size={18}
              className="shrink-0 text-white/70"
            />
            <span className="truncate text-sm font-medium">
              {linkingProvider === config.key
                ? `Connecting ${config.label}...`
                : `Connect ${config.label}`}
            </span>
          </span>
          <Icon
            icon="solar:link-linear"
            size={16}
            className="shrink-0 text-white/50"
          />
        </Button>
      ))}
    </div>
  );
}

function SessionsSection({
  reloadSecurity,
  revokeOthers,
  revokeSession,
  securityLoading,
  sessions = [],
}: any) {
  const runAction = useAsyncSecurityAction(reloadSecurity);
  const [busySessionId, setBusySessionId] = useState(null);
  const [busyRevokingOthers, setBusyRevokingOthers] = useState(false);

  if (securityLoading && !sessions.length) {
    return (
      <div className="flex flex-col gap-2.5">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex w-full animate-pulse items-center justify-between gap-2.5 p-2.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="size-10 shrink-0 rounded-[14px] bg-white/5" />
              <div className="flex flex-col gap-1.5">
                <div className="h-3.5 w-32 rounded-full bg-white/5" />
                <div className="h-2.5 w-44 rounded-full bg-white/5" />
              </div>
            </div>
            <div className="h-7 w-20 shrink-0 rounded-full bg-white/5" />
          </div>
        ))}
      </div>
    );
  }

  const otherSessions = sessions.filter((s: any) => !s.is_current);

  return (
    <div className="flex flex-col gap-2.5">
      {sessions.length ? (
        sessions.map((s: any) => {
          const parsed = parseUserAgent(s.user_agent);
          const metaText = [
            formatSessionIp(s.ip_address),
            formatSessionActivity(s),
          ]
            .filter(Boolean)
            .join(" • ");

          return (
            <div
              key={s.session_id}
              title={s.user_agent || undefined}
              className={cn(
                "flex w-full items-center justify-between gap-2.5 rounded-[20px] p-2.5 ring ring-inset transition-colors",
                s.is_current
                  ? "bg-success/5 ring-success/10 hover:ring-success/50"
                  : "bg-white/5 ring-white/5 hover:bg-white/10 hover:ring-white/10",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    "center size-10 shrink-0 transition-colors",
                    s.is_current ? "text-success" : "text-white",
                  )}
                >
                  <Icon icon={parsed.icon} size={20} />
                </div>
                <div className="flex min-w-0 flex-col justify-center gap-0.5">
                  <span className="truncate text-sm font-semibold text-white">
                    {parsed.title}
                  </span>
                  <span className="truncate text-xs text-white/50">
                    {metaText || "Active session"}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center">
                {s.is_current ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold",
                      SUCCESS_ACTION_TONE_CLASS,
                    )}
                  >
                    Current
                  </span>
                ) : (
                  <Button
                    type="button"
                    disabled={busySessionId === s.session_id}
                    onClick={() =>
                      runAction(
                        () => revokeSession?.(s.session_id),
                        (b) => setBusySessionId(b ? s.session_id : null),
                        "Session revoked",
                        "Failed to revoke session",
                      )
                    }
                    className={cn(
                      "flex h-8 items-center justify-center rounded-[14px] px-3 text-xs font-semibold cursor-pointer active:scale-95",
                      DESTRUCTIVE_ACTION_TONE_CLASS,
                    )}
                  >
                    {busySessionId === s.session_id ? "Revoking..." : "Revoke"}
                  </Button>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-[20px] bg-white/5 p-6 text-center ring-1 ring-inset ring-white/5">
          <div className="center size-10 rounded-full bg-white/5 text-white/50">
            <Icon icon="solar:devices-bold" size={20} />
          </div>
          <span className="text-xs font-medium text-white/50">
            No active sessions found
          </span>
        </div>
      )}

      {otherSessions.length > 0 && (
        <Button
          type="button"
          disabled={busyRevokingOthers}
          onClick={() =>
            runAction(
              () => revokeOthers?.(),
              setBusyRevokingOthers,
              "Other sessions revoked",
              "Failed to revoke sessions",
            )
          }
          className={cn(
            SUBMIT_BUTTON_CLASS,
            "flex items-center justify-center gap-2 mt-0.5",
          )}
        >
          <Icon icon="solar:logout-2-bold" size={16} />
          {busyRevokingOthers ? "Signing out..." : "Sign out other sessions"}
        </Button>
      )}
    </div>
  );
}

function PasskeysSection({
  auth,
  passkeys = [],
  reloadSecurity,
  securityLoading,
}: any) {
  const runAction = useAsyncSecurityAction(reloadSecurity);
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  if (securityLoading && !passkeys.length) {
    return (
      <div className="flex flex-col gap-2.5">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex h-11 w-full animate-pulse items-center justify-between rounded-[20px] bg-white/5 px-4 ring-1 ring-inset ring-white/5"
          >
            <div className="h-3.5 w-28 rounded-full bg-white/10" />
            <div className="h-6 w-16 rounded-lg bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {passkeys.length ? (
        passkeys.map((p: any) => {
          const pId = p.id || p.passkeyId;
          const pName = p.friendlyName || p.friendly_name || "Passkey";
          const isRenaming = editingId === pId;

          return (
            <div
              key={pId}
              className={cn(
                "w-full rounded-[20px] bg-white/5 text-white p-1 ring-1 ring-inset ring-white/5",
                isRenaming
                  ? "flex flex-col gap-2.5 p-0 bg-transparent ring-0"
                  : "flex h-auto items-center justify-between",
              )}
            >
              {isRenaming ? (
                <>
                  <Input
                    autoFocus
                    className={INPUT_BASE_CLASSES}
                    placeholder="Passkey name"
                    value={editingName}
                    onChange={(e: any) => setEditingName(e.target.value)}
                  />
                  <div className="flex gap-2.5 w-full">
                    <Button
                      type="button"
                      disabled={pending || !editingName.trim()}
                      onClick={() =>
                        runAction(
                          async () => {
                            await renamePasskey(auth.client, {
                              friendlyName: editingName.trim(),
                              passkeyId: pId,
                            });
                            setEditingId(null);
                          },
                          setPending,
                          "Passkey renamed",
                          "Failed to rename",
                        )
                      }
                      className={SUBMIT_BUTTON_CLASS}
                    >
                      {pending ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setEditingId(null);
                        setEditingName("");
                      }}
                      className="size-10 center shrink-0 rounded-[20px] bg-white/5 text-xs cursor-pointer text-white/70 ring-1 ring-inset ring-white/5 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Icon icon="solar:close-bold" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <span className="truncate text-sm ml-3">{pName}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setEditingId(pId);
                        setEditingName(pName);
                      }}
                      className="py-2 px-4 rounded-[20px] text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                      Rename
                    </Button>
                    <Button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        runAction(
                          () => deletePasskey(auth.client, { passkeyId: pId }),
                          setPending,
                          "Passkey removed",
                          "Failed to remove",
                        )
                      }
                      className={cn(
                        "py-2 px-4 rounded-[20px] text-xs font-semibold cursor-pointer text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50",
                        DESTRUCTIVE_ACTION_TONE_CLASS,
                      )}
                    >
                      Remove
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })
      ) : (
        <div className="flex min-h-24 w-full items-center justify-center rounded-[20px] bg-white/5 p-4 text-center ring-1 ring-inset ring-white/5">
          <span className="text-xs text-white/50">No passkeys registered</span>
        </div>
      )}
      <Button
        type="button"
        disabled={pending || !auth?.client}
        onClick={() =>
          runAction(
            () => registerPasskey(auth.client),
            setPending,
            "Passkey added successfully",
            "Failed to add passkey",
          )
        }
        className={SUBMIT_BUTTON_CLASS}
      >
        <Icon icon="solar:key-bold" size={16} />
        {pending ? "Adding..." : "Add passkey"}
      </Button>
    </div>
  );
}

function DeleteSection({
  auth,
  deleteAccount,
}: {
  auth: any;
  deleteAccount: (confirmation: any) => Promise<void>;
}) {
  const toast = useToast();
  const { openSurface } = useNavigationActions();
  const [confirmation, setConfirmation] = useState("");
  const [sending, setSending] = useState(false);

  const userEmail = auth?.user?.email ?? "";
  const canSendCode = confirmation === "DELETE" && Boolean(userEmail);

  async function sendVerificationCode() {
    if (!canSendCode) return;
    setSending(true);
    try {
      await requestEmailAuth(auth.client, {
        createUser: false,
        email: userEmail,
        emailRedirectTo: getAuthCallbackUrl("/account"),
      });
      openSurface(
        createVerificationSurfaceEntry(
          { email: userEmail, onVerified: () => deleteAccount?.(confirmation) },
          { title: "Verify to delete" },
        ),
      );
    } catch (error: any) {
      toast.error(error?.message || "Could not send verification code");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Input
        aria-label='Type "DELETE" to confirm'
        className={INPUT_BASE_CLASSES}
        disabled={sending}
        placeholder='Type "DELETE" to confirm'
        value={confirmation}
        onChange={(e: any) => setConfirmation(e.target.value)}
      />
      <Button
        type="button"
        disabled={sending || !canSendCode}
        onClick={sendVerificationCode}
        className={getNavActionClass({
          className:
            "h-10 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          variant: DESTRUCTIVE_ACTION_TONE_CLASS,
        })}
      >
        {sending ? "Sending code..." : "Send verification code"}
      </Button>
    </div>
  );
}

export interface AccountEditSettingsProps {
  account?: any;
  auth?: any;
  deleteAccount?: any;
  identities?: any[];
  passkeys?: any[];
  reloadSecurity?: () => Promise<void>;
  revokeOthers?: () => Promise<void>;
  revokeSession?: (id: string) => Promise<void>;
  section: string;
  securityLoading?: boolean;
  sessions?: any[];
  user?: any;
  close?: () => void;
  [key: string]: unknown;
}

export function AccountEditSettings({
  account,
  auth,
  deleteAccount,
  identities,
  passkeys,
  reloadSecurity,
  revokeOthers,
  revokeSession,
  section,
  securityLoading,
  sessions,
  user,
}: AccountEditSettingsProps) {
  switch (section) {
    case "email":
      return <EmailSection account={account} auth={auth} />;
    case "providers":
      return (
        <ProvidersSection
          auth={auth}
          identities={identities}
          reloadSecurity={reloadSecurity}
          user={user}
        />
      );
    case "sessions":
      return (
        <SessionsSection
          reloadSecurity={reloadSecurity}
          revokeOthers={revokeOthers}
          revokeSession={revokeSession}
          securityLoading={securityLoading}
          sessions={sessions}
        />
      );
    case "passkeys":
      return (
        <PasskeysSection
          auth={auth}
          passkeys={passkeys}
          reloadSecurity={reloadSecurity}
          securityLoading={securityLoading}
        />
      );
    case "delete":
      return <DeleteSection auth={auth} deleteAccount={deleteAccount} />;
    default:
      return (
        <p className="text-sm text-white/50">
          This account setting is not available yet
        </p>
      );
  }
}

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

export interface AccountEditSurfaceProps {
  close?: () => void;
  settingKey?: string;
  account?: any;
  [key: string]: unknown;
}

export function AccountEditSurface({
  close,
  settingKey = "overview",
  ...props
}: AccountEditSurfaceProps) {
  const state = useAccountEditState(settingKey);
  const isProfileSection = ["account", "profile", "avatar-banner"].includes(
    settingKey,
  );

  if (settingKey === "overview") return <AccountEditMenu state={state} />;

  return (
    <div className="flex flex-col gap-2.5">
      {isProfileSection ? (
        <AccountSettingsForm close={close} section={settingKey} {...props} />
      ) : (
        <AccountEditSettings
          close={close}
          section={settingKey}
          {...(props.account ? props : state.sharedSecurityProps)}
        />
      )}
    </div>
  );
}

export default AccountEditSurface;
