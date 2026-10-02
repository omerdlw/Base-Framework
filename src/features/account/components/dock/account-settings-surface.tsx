"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/infrastructure/http/client";
import { useAccount } from "../../provider";
import { updateAccountAction } from "../../server/actions";
import {
  getAuthErrorMessage,
  createVerificationSurfaceEntry,
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
} from "@/features/auth";
import {
  DockCardBanner,
  useDockActionClass,
  useDockActions,
  type SurfaceEntry,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { ACTION_TONE_CLASS } from "@omerdlw/base-framework/tokens";
import { cn } from "@omerdlw/base-framework/utils";
import {
  AdaptiveImage,
  Button,
  Icon,
  Input,
  Loader,
  Textarea,
} from "@/features/shell/primitives";
import {
  formatSessionActivity,
  formatSessionIp,
  parseUserAgent,
} from "../../utils";

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;
const USERNAME_ERROR =
  "Username must be 3-30 characters and contain letters, numbers, _ or -";

function useSubmitButtonClass() {
  const actionClass = useDockActionClass();
  return useMemo(
    () =>
      actionClass({
        className: "h-10 disabled:cursor-not-allowed disabled:opacity-50",
        variant: ACTION_TONE_CLASS,
      }),
    [actionClass],
  );
}

const BASE_INPUT_STYLE =
  "w-full resize-none rounded-[20px] bg-white/5 text-sm text-white transition-colors ease-out-quart duration-micro placeholder:text-white/50 hover:bg-white/10 focus:bg-white/10 focus:outline-none";

const INPUT_BASE_CLASSES = cn(BASE_INPUT_STYLE, "h-10 px-4");
const TEXTAREA_BASE_CLASSES = cn(BASE_INPUT_STYLE, "min-h-36 p-4");

const SETTING_META = Object.freeze({
  account: {
    icon: "solar:user-circle-bold",
    title: "Account info",
  },
  "avatar-banner": {
    icon: "solar:gallery-bold",
    title: "Avatar & Banners",
  },
  delete: {
    icon: "solar:trash-bin-trash-bold",
    title: "Delete account",
  },
  email: {
    icon: "solar:letter-bold",
    title: "Email sign-in",
  },
  overview: {
    icon: "solar:settings-bold",
    title: "Account settings",
  },
  passkeys: {
    icon: "solar:key-bold",
    title: "Passkeys",
  },
  profile: {
    icon: "solar:user-circle-bold",
    title: "Account info",
  },
  providers: {
    icon: "solar:link-bold",
    title: "Connected providers",
  },
  sessions: {
    icon: "solar:devices-bold",
    title: "Active sessions",
  },
});

const OAUTH_PROVIDER_CONFIG = Object.freeze({
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
  icon: string;
  title: string;
  key: string;
}

const SETTINGS: SettingItem[] = [
  { key: "avatar-banner", ...SETTING_META["avatar-banner"] },
  { key: "account", ...SETTING_META["account"] },
  { key: "email", ...SETTING_META["email"] },
  { key: "providers", ...SETTING_META["providers"] },
  { key: "sessions", ...SETTING_META["sessions"] },
  { key: "passkeys", ...SETTING_META["passkeys"] },
  { key: "delete", ...SETTING_META["delete"] },
];

function normalizeOAuthProviderKey(provider?: any): string | null {
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
      toast(successMsg);
    } catch (error: any) {
      toast(getAuthErrorMessage(error, errorMsg));
    } finally {
      setBusy(false);
    }
  };
}

function useAccountSettingsState(settingKey = "overview") {
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

interface AccountSettingsOverviewViewProps {
  onSelectAction?: (key: string) => void;
  onSelect?: (key: string) => void;
}

function AccountSettingsOverviewView({
  onSelectAction,
  onSelect,
}: AccountSettingsOverviewViewProps) {
  const handleSelect = onSelectAction ?? onSelect;

  return (
    <div className="grid gap-2">
      {SETTINGS.map((s) => (
        <Button
          key={s.key}
          type="button"
          onClick={() => handleSelect?.(s.key)}
          className="group/item flex min-h-[52px] w-full cursor-pointer items-center gap-3.5 rounded-[20px] bg-white/5 px-3.5 py-2 text-left transition-colors ease-out-quart duration-micro hover:bg-white/10"
        >
          <Icon
            icon={s.icon}
            size={24}
            className="shrink-0 text-white/70 transition-colors ease-out-quart duration-micro group-hover/item:text-white"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-white leading-snug">
              {s.title}
            </span>
          </span>
          <Icon
            icon="solar:alt-arrow-right-linear"
            size={16}
            className="shrink-0 text-white/50 transition-colors ease-out-quart duration-micro group-hover/item:text-white"
          />
        </Button>
      ))}
    </div>
  );
}

interface AccountInfoViewProps {
  closeAction?: (result?: any) => void;
  close?: (result?: any) => void;
  currentAccount?: any;
  form?: any;
  formId?: string;
  handleAccountSubmitAction?: (e: any) => void;
  handleAccountSubmit?: (e: any) => void;
  handleChangeAction?: (key: string, val: any) => void;
  handleChange?: (key: string, val: any) => void;
  [key: string]: unknown;
}

function AccountInfoView({
  closeAction,
  close,
  currentAccount,
  form: formProp,
  formId = "account-settings-info-form",
  handleAccountSubmitAction,
  handleAccountSubmit,
  handleChangeAction,
  handleChange,
}: AccountInfoViewProps) {
  const SUBMIT_BUTTON_CLASS = useSubmitButtonClass();
  const accountState = useAccount();
  const account =
    currentAccount || accountState?.account || accountState?.profile;
  const router = useRouter();
  const toast = useToast();

  const handleClose = closeAction ?? close;
  const handleSubmit = handleAccountSubmitAction ?? handleAccountSubmit;
  const onChangeCallback = handleChangeAction ?? handleChange;

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

  const onChange = (setter: any, key: any, val: any) => {
    setter(val);
    onChangeCallback?.(key, val);
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
          error:
            result.error ||
            "Your account couldn't be updated. Please try again",
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
      toast("Profile updated");
      router.refresh();
      const nextUsername = actionState.nextUsername;
      if (nextUsername && nextUsername !== account?.username) {
        router.replace(`/account/${encodeURIComponent(nextUsername)}`);
      }
      handleClose?.({ success: true });
    } else if (actionState.error) {
      toast(actionState.error);
    }
  }, [actionState, account?.username, handleClose, router, toast]);

  return (
    <form
      id={formId}
      action={handleSubmit ? undefined : formAction}
      onSubmit={handleSubmit}
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
      <Textarea
        name="bio"
        className={TEXTAREA_BASE_CLASSES}
        disabled={isPending}
        maxLength={500}
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
        className="flex h-11 w-full items-center justify-between rounded-[20px] bg-white/5 px-4 ring-1 ring-inset ring-white/5 transition-colors duration-micro ease-out-quart hover:bg-white/10 hover:ring-white/10"
      >
        <span className="text-sm font-medium text-white">
          {isPrivate ? "Private profile" : "Public profile"}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "flex h-6 w-11 shrink-0 rounded-full p-0.5 ring-1 ring-inset transition-colors duration-micro ease-out-quart",
            isPrivate
              ? "bg-white/15 ring-white/15"
              : "bg-black/60 ring-white/10",
          )}
        >
          <span
            className={cn(
              "size-5 rounded-full transition-colors duration-micro ease-out-quart",
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
        {isPending ? <Loader /> : "Save changes"}
      </Button>
    </form>
  );
}

interface AccountMediaForm {
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  backgroundUrl?: string | null;
  bannerPosition?: string | null;
}

interface AccountMediaAccount {
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  backgroundUrl?: string | null;
  bannerPosition?: string | null;
  displayName?: string | null;
  username?: string | null;
}

interface AccountMediaViewProps {
  closeAction?: (result?: { success: boolean }) => void;
  close?: (result?: { success: boolean }) => void;
  currentAccount?: AccountMediaAccount | null;
  form?: AccountMediaForm;
  formId?: string;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onChange?: (key: keyof AccountMediaForm, value: string) => void;
}

interface MediaActionState {
  success: boolean;
  error?: string;
}

const DEFAULT_BANNER_POSITION = "center 45%";

function MediaSection({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2.5">{children}</div>;
}

function MediaPreview({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-[20px] bg-white/5">
      {children}
    </div>
  );
}

function UrlInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className="relative flex w-full items-center">
      <Input
        type="url"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-10 w-full rounded-[20px] bg-white/5 pl-4 text-sm text-white transition-colors ease-out-quart duration-micro placeholder:text-white/50 hover:bg-white/10 focus:bg-white/10 focus:outline-none",
          value ? "pr-9" : "pr-4",
          className,
        )}
      />

      {value && (
        <Button
          type="button"
          disabled={disabled}
          onClick={() => onChange("")}
          aria-label="Clear input"
          className="center absolute right-1.5 size-7 cursor-pointer rounded-full p-0 text-white/50 transition-[background-color,color,border-color,transform] duration-micro ease-out-quart hover:bg-white/10 hover:text-white motion-safe:active:scale-[0.97] motion-reduce:active:scale-100"
        >
          <Icon icon="solar:close-bold" size={14} />
        </Button>
      )}
    </div>
  );
}

function getBannerPositionY(position: string) {
  const match = position.match(/(\d+)%/);
  return match ? Number(match[1]) : 45;
}

function BannerVerticalSlider({
  value,
  disabled = false,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (nextValue: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const updateFromClientY = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track || disabled) return;
      const rect = track.getBoundingClientRect();
      if (rect.height <= 0) return;
      const ratio = (clientY - rect.top) / rect.height;
      const clamped = Math.min(100, Math.max(0, Math.round(ratio * 100)));
      onChange(clamped);
    },
    [disabled, onChange],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateFromClientY(event.clientY);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || !event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      return;
    }
    event.stopPropagation();
    updateFromClientY(event.clientY);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onChange(Math.max(0, value - 5));
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      onChange(Math.min(100, value + 5));
    } else if (event.key === "Home") {
      event.preventDefault();
      onChange(0);
    } else if (event.key === "End") {
      event.preventDefault();
      onChange(100);
    }
  };

  return (
    <div
      role="slider"
      data-no-surface-drag="true"
      tabIndex={disabled ? -1 : 0}
      aria-label="Banner vertical alignment"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      className={cn(
        "group/slider flex w-10 shrink-0 cursor-ns-resize flex-col items-center justify-between self-stretch rounded-[20px] bg-white/5 py-2.5 transition-colors ease-out-quart duration-micro select-none touch-none hover:bg-white/10",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Icon
        icon="solar:alt-arrow-up-linear"
        size={12}
        className="shrink-0 text-white/50 transition-colors duration-micro ease-out-quart group-hover/slider:text-white/80"
      />
      <div
        ref={trackRef}
        className="relative my-1.5 w-1.5 flex-1 rounded-full bg-white/15"
      >
        <div
          className="absolute inset-x-0 bottom-0 h-full origin-bottom rounded-full bg-white/40"
          style={{ transform: `scaleY(${value / 100})` }}
        />
        <div
          className="absolute left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-micro ease-out-quart motion-safe:group-hover/slider:scale-110"
          style={{ top: `${value}%` }}
        />
      </div>
      <Icon
        icon="solar:alt-arrow-down-linear"
        size={12}
        className="shrink-0 text-white/50 transition-colors duration-micro ease-out-quart group-hover/slider:text-white/80"
      />
    </div>
  );
}

function AccountMediaView({
  closeAction,
  close,
  currentAccount,
  form,
  formId = "account-settings-media-form",
  onSubmit,
  onChange,
}: AccountMediaViewProps) {
  const SUBMIT_BUTTON_CLASS = useSubmitButtonClass();
  const accountState = useAccount();
  const router = useRouter();
  const toast = useToast();
  const handleClose = closeAction ?? close;

  const account =
    currentAccount ?? accountState?.account ?? accountState?.profile;

  const [avatarUrl, setAvatarUrl] = useState(
    form?.avatarUrl ?? account?.avatarUrl ?? "",
  );

  const [bannerUrl, setBannerUrl] = useState(
    form?.bannerUrl ?? account?.bannerUrl ?? "",
  );

  const [backgroundUrl, setBackgroundUrl] = useState(
    form?.backgroundUrl ?? account?.backgroundUrl ?? "",
  );

  const [bannerPosition, setBannerPosition] = useState(
    form?.bannerPosition ?? account?.bannerPosition ?? DEFAULT_BANNER_POSITION,
  );

  const updateField = (
    key: keyof AccountMediaForm,
    value: string,
    setter: (value: string) => void,
  ) => {
    setter(value);
    onChange?.(key, value);
  };

  const currentY = getBannerPositionY(bannerPosition);

  const [actionState, formAction, isPending] = useActionState<
    MediaActionState,
    FormData
  >(
    async () => {
      const result = await updateAccountAction({
        avatarUrl: avatarUrl.trim() || null,
        backgroundUrl: backgroundUrl.trim() || null,
        bannerPosition: bannerPosition.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
      });

      if (!result.success) {
        return {
          success: false,
          error:
            result.error || "Your images couldn't be updated. Please try again",
        };
      }

      await accountState.refresh();

      return { success: true };
    },
    { success: false },
  );

  useEffect(() => {
    if (actionState.success) {
      toast("Images updated");
      router.refresh();
      handleClose?.({ success: true });

      return;
    }

    if (actionState.error) {
      toast(actionState.error);
    }
  }, [actionState, handleClose, router, toast]);

  const handleFormSubmit = onSubmit ?? undefined;

  return (
    <form
      id={formId}
      action={onSubmit ? undefined : formAction}
      onSubmit={handleFormSubmit}
      className="flex flex-col gap-2.5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <MediaSection>
          <MediaPreview>
            <div className="center relative size-20 shrink-0 overflow-hidden rounded-full bg-black/60 text-white/50 transition-transform duration-base ease-out-quart motion-safe:hover:scale-105">
              {avatarUrl ? (
                <AdaptiveImage
                  alt="Avatar preview"
                  className="size-full object-cover"
                  src={avatarUrl}
                />
              ) : (
                <Icon icon="solar:user-circle-bold" size={24} />
              )}
            </div>
          </MediaPreview>

          <UrlInput
            value={avatarUrl}
            onChange={(value) => updateField("avatarUrl", value, setAvatarUrl)}
            disabled={isPending}
            placeholder="Avatar image URL"
          />
        </MediaSection>

        <MediaSection>
          <MediaPreview>
            {backgroundUrl ? (
              <AdaptiveImage
                alt="Page background preview"
                className="size-full object-cover transition-transform duration-base ease-out-quart motion-safe:hover:scale-105"
                src={backgroundUrl}
              />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-xs text-white/50">
                <Icon
                  icon="solar:wallpaper-bold"
                  className="text-white/50"
                  size={24}
                />
              </div>
            )}
          </MediaPreview>

          <UrlInput
            value={backgroundUrl}
            onChange={(value) =>
              updateField("backgroundUrl", value, setBackgroundUrl)
            }
            disabled={isPending}
            placeholder="Page background URL"
          />
        </MediaSection>
      </div>

      <MediaSection>
        <div className="flex w-full items-stretch gap-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="relative flex h-[68px] w-full items-center justify-between overflow-hidden rounded-[30px] bg-black/60 p-2.5 ring-1 ring-inset ring-white/10 shadow-xl backdrop-blur-lg select-none">
              {bannerUrl && (
                <DockCardBanner
                  bannerUrl={bannerUrl}
                  bannerPosition={`center ${currentY}%`}
                  isActive
                />
              )}

              <div className="pointer-events-none relative z-10 flex w-full items-center justify-between gap-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="center relative size-12 shrink-0 overflow-hidden rounded-[20px] bg-white/5 text-white shadow-sm">
                    {avatarUrl ? (
                      <AdaptiveImage
                        alt="Preview avatar"
                        className="size-full object-cover"
                        src={avatarUrl}
                      />
                    ) : (
                      <Icon icon="solar:user-circle-bold" size={26} />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col justify-center gap-0.5">
                    <span className="truncate text-base font-semibold text-white leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                      {account?.displayName || "Your Name"}
                    </span>

                    <span className="truncate text-sm text-white/50 leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      @{account?.username || "username"}
                    </span>
                  </div>
                </div>

                <div className="mr-1.5 flex shrink-0 items-center gap-1">
                  <div className="center size-9 rounded-[14px] text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    <Icon icon="solar:logout-2-bold" size={16} />
                  </div>

                  <div className="center size-9 rounded-[14px] text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    <Icon icon="solar:settings-bold" size={16} />
                  </div>

                  <div className="center size-9 rounded-[14px] text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    <Icon icon="solar:bell-bold" size={16} />
                  </div>
                </div>
              </div>
            </div>

            <UrlInput
              value={bannerUrl}
              onChange={(value) =>
                updateField("bannerUrl", value, setBannerUrl)
              }
              disabled={isPending}
              placeholder="Dock banner image URL"
            />
          </div>

          {bannerUrl && (
            <BannerVerticalSlider
              value={currentY}
              disabled={isPending}
              onChange={(nextY) =>
                updateField(
                  "bannerPosition",
                  `center ${nextY}%`,
                  setBannerPosition,
                )
              }
            />
          )}
        </div>
      </MediaSection>

      <Button
        type="submit"
        form={formId}
        disabled={isPending}
        className={SUBMIT_BUTTON_CLASS}
      >
        {isPending ? <Loader /> : "Save changes"}
      </Button>
    </form>
  );
}

interface AccountEmailViewProps {
  account?: any;
  auth: any;
}

function AccountEmailView({ account, auth }: AccountEmailViewProps) {
  const SUBMIT_BUTTON_CLASS = useSubmitButtonClass();
  const toast = useToast();
  const [email, setEmail] = useState(account?.email || "");
  const [pending, setPending] = useState(false);
  const isCurrentEmail = email.trim() === (account?.email || "").trim();

  async function updateEmail() {
    setPending(true);
    try {
      const { error } = await auth.client.auth.updateUser({ email });
      if (error) throw error;
      toast("Check your inbox to confirm the new email");
    } catch (error: any) {
      toast(getAuthErrorMessage(error, "Couldn't update your email"));
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
        {pending ? <Loader /> : "Verify and update email"}
      </Button>
    </div>
  );
}

interface AccountProvidersViewProps {
  auth: any;
  identities?: any[];
  reloadSecurityAction?: () => Promise<void>;
  reloadSecurity?: () => Promise<void>;
  user?: any;
}

function AccountProvidersView({
  auth,
  identities,
  reloadSecurityAction,
  reloadSecurity,
  user,
}: AccountProvidersViewProps) {
  const toast = useToast();
  const handleReload = reloadSecurityAction ?? reloadSecurity;

  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(
    null,
  );
  const [unlinkedIds, setUnlinkedIds] = useState<Set<string>>(new Set());

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
      return toast(
        "Keep at least one sign-in method connected to this account",
      );

    setUnlinkingProvider(item.key);
    try {
      await unlinkIdentity(auth.client, item.identity);
      const targetId = item.identity?.id || item.identity?.identity_id;
      if (targetId) setUnlinkedIds((prev) => new Set([...prev, targetId]));
      toast(`${item.config.label} disconnected`);
      await handleReload?.();
      await auth.refresh?.();
    } catch (error: any) {
      toast(
        getAuthErrorMessage(error, `Couldn't disconnect ${item.config.label}`),
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
      toast(getAuthErrorMessage(error, `Couldn't connect ${config.label}`));
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {connectedList.map((item) => (
        <div
          key={item.key}
          className="flex h-11 w-full items-center justify-between rounded-[20px] bg-white/5 p-1 pl-4 text-white"
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
              "center h-9 rounded-[16px] px-3.5 py-1 text-xs font-semibold transition-colors duration-micro ease-out-quart cursor-pointer",
              ACTION_TONE_CLASS,
            )}
          >
            {unlinkingProvider === item.key ? (
              <Loader>Disconnect</Loader>
            ) : (
              "Disconnect"
            )}
          </Button>
        </div>
      ))}
      {availableList.map((config) => (
        <Button
          key={config.key}
          type="button"
          disabled={Boolean(linkingProvider)}
          onClick={() => handleLink(config)}
          className="flex h-11 w-full items-center justify-between rounded-[20px] bg-white/5 px-4 text-white/70 transition-colors duration-micro ease-out-quart hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex min-w-0 items-center gap-3">
            <Icon
              icon={config.icon}
              size={18}
              className="shrink-0 text-white/70"
            />
            <span className="truncate text-sm font-medium">
              {linkingProvider === config.key ? (
                <Loader />
              ) : (
                `Connect ${config.label}`
              )}
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

interface AccountSessionsViewProps {
  reloadSecurityAction?: () => Promise<void>;
  reloadSecurity?: () => Promise<void>;
  revokeOthersAction?: () => Promise<void>;
  revokeOthers?: () => Promise<void>;
  revokeSessionAction?: (sessionId: string) => Promise<void>;
  revokeSession?: (sessionId: string) => Promise<void>;
  securityLoading?: boolean;
  sessions?: any[];
}

function AccountSessionsView({
  reloadSecurityAction,
  reloadSecurity,
  revokeOthersAction,
  revokeOthers,
  revokeSessionAction,
  revokeSession,
  securityLoading,
  sessions = [],
}: AccountSessionsViewProps) {
  const SUBMIT_BUTTON_CLASS = useSubmitButtonClass();
  const handleReload = reloadSecurityAction ?? reloadSecurity;
  const handleRevokeOthers = revokeOthersAction ?? revokeOthers;
  const handleRevokeSession = revokeSessionAction ?? revokeSession;

  const runAction = useAsyncSecurityAction(handleReload);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [busyRevokingOthers, setBusyRevokingOthers] = useState(false);

  if (securityLoading && !sessions.length) {
    return (
      <div className="flex flex-col gap-2.5">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex w-full animate-pulse motion-reduce:animate-none items-center justify-between gap-2.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="size-10 shrink-0 rounded-[20px] bg-white/5" />
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
                "flex min-h-[52px] w-full items-center justify-between gap-3 rounded-[20px] py-2 pr-2 pl-3.5 transition-colors ease-out-quart duration-micro",
                s.is_current ? "bg-primary/10" : "bg-white/5 hover:bg-white/10",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Icon
                  icon={parsed.icon}
                  size={20}
                  className={cn(
                    "shrink-0 transition-colors duration-micro ease-out-quart",
                    s.is_current ? "text-primary" : "text-white/70",
                  )}
                />
                <div className="flex min-w-0 flex-col justify-center gap-0.5">
                  <span className="truncate text-sm font-semibold text-white leading-snug">
                    {parsed.title}
                  </span>
                  <span className="truncate text-xs text-white/50 leading-snug">
                    {metaText || "Active session"}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center">
                {s.is_current ? (
                  <span
                    className={cn(
                      "center h-9 rounded-[12px] px-3.5 text-xs font-semibold",
                      ACTION_TONE_CLASS,
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
                        async () => {
                          await handleRevokeSession?.(s.session_id);
                        },
                        (b) => setBusySessionId(b ? s.session_id : null),
                        "Device signed out",
                        "Couldn't sign out that device",
                      )
                    }
                    className={cn(
                      "center h-9 cursor-pointer rounded-[12px] px-3.5 text-xs font-semibold transition-[background-color,color,border-color,transform] duration-micro ease-out-quart motion-safe:active:scale-[0.97] motion-reduce:active:scale-100",
                      ACTION_TONE_CLASS,
                    )}
                  >
                    {busySessionId === s.session_id ? (
                      <Loader>Revoke</Loader>
                    ) : (
                      "Revoke"
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-[20px] bg-white/5 p-6 text-center">
          <Icon icon="solar:devices-bold" size={22} className="text-white/50" />
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
              async () => {
                await handleRevokeOthers?.();
              },
              setBusyRevokingOthers,
              "Signed out of your other devices",
              "Couldn't sign out your other devices",
            )
          }
          className={cn(
            SUBMIT_BUTTON_CLASS,
            "flex items-center justify-center gap-2 mt-0.5",
          )}
        >
          {busyRevokingOthers ? (
            <Loader />
          ) : (
            <>
              <Icon icon="solar:logout-2-bold" size={16} />
              <span>Sign out other sessions</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}

interface AccountPasskeysViewProps {
  auth?: any;
  passkeys?: any[];
  reloadSecurityAction?: () => Promise<void>;
  reloadSecurity?: () => Promise<void>;
  securityLoading?: boolean;
}

function AccountPasskeysView({
  auth,
  passkeys = [],
  reloadSecurityAction,
  reloadSecurity,
  securityLoading,
}: AccountPasskeysViewProps) {
  const SUBMIT_BUTTON_CLASS = useSubmitButtonClass();
  const handleReload = reloadSecurityAction ?? reloadSecurity;
  const runAction = useAsyncSecurityAction(handleReload);
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  if (securityLoading && !passkeys.length) {
    return (
      <div className="flex flex-col gap-2.5">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex h-11 w-full animate-pulse motion-reduce:animate-none items-center justify-between rounded-[20px] bg-white/5 px-4 ring-1 ring-inset ring-white/5"
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
                "w-full rounded-[20px] bg-white/5 text-white",
                isRenaming
                  ? "flex flex-col gap-2.5 p-0 bg-transparent"
                  : "flex h-11 items-center justify-between p-1 pl-4",
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
                          "Couldn't rename this passkey",
                        )
                      }
                      className={SUBMIT_BUTTON_CLASS}
                    >
                      {pending ? <Loader /> : "Save"}
                    </Button>
                    <Button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setEditingId(null);
                        setEditingName("");
                      }}
                      className="size-10 center shrink-0 rounded-[20px] bg-white/5 text-xs cursor-pointer text-white/70 transition-colors duration-micro ease-out-quart hover:bg-white/10 hover:text-white"
                    >
                      <Icon icon="solar:close-bold" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <span className="truncate text-sm font-medium">{pName}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setEditingId(pId);
                        setEditingName(pName);
                      }}
                      className="center h-9 rounded-[16px] px-3.5 text-xs font-semibold text-white/70 transition-colors ease-out-quart duration-micro hover:bg-white/10 hover:text-white disabled:opacity-50"
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
                          "Couldn't remove this passkey",
                        )
                      }
                      className={cn(
                        "center h-9 rounded-[16px] px-3.5 text-xs font-semibold cursor-pointer text-white/70 transition-colors ease-out-quart duration-micro hover:bg-white/10 disabled:opacity-50",
                        ACTION_TONE_CLASS,
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
        <div className="flex min-h-24 w-full items-center justify-center rounded-[20px] bg-white/5 p-4 text-center">
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
            "Passkey added",
            "Couldn't add a passkey",
          )
        }
        className={SUBMIT_BUTTON_CLASS}
      >
        {pending ? (
          <Loader />
        ) : (
          <>
            <Icon icon="solar:key-bold" size={16} />
            <span>Add passkey</span>
          </>
        )}
      </Button>
    </div>
  );
}

interface AccountDeleteViewProps {
  auth: any;
  deleteAccountAction?: (confirmation: any) => Promise<void>;
  deleteAccount?: (confirmation: any) => Promise<void>;
}

function AccountDeleteView({
  auth,
  deleteAccountAction,
  deleteAccount,
}: AccountDeleteViewProps) {
  const SUBMIT_BUTTON_CLASS = useSubmitButtonClass();
  const toast = useToast();
  const { openSurface } = useDockActions();
  const [confirmation, setConfirmation] = useState("");
  const [sending, setSending] = useState(false);

  const performDeleteAction = deleteAccountAction ?? deleteAccount;
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
          {
            email: userEmail,
            onVerified: () => performDeleteAction?.(confirmation),
          },
          { title: "Verify to delete" },
        ),
      );
    } catch (error: any) {
      toast(getAuthErrorMessage(error, "Couldn't send a verification code"));
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
        className={SUBMIT_BUTTON_CLASS}
      >
        {sending ? <Loader /> : "Send verification code"}
      </Button>
    </div>
  );
}

interface AccountSettingsFormProps {
  closeAction?: (result?: any) => void;
  close?: (result?: any) => void;
  section?: string;
  account?: any;
  onAccountUpdateAction?: (updated: any) => void;
  onAccountUpdate?: (updated: any) => void;
  [key: string]: unknown;
}

const AccountSettingsForm = (props: AccountSettingsFormProps) => {
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

interface AccountSettingsSecurityProps {
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

function AccountSettingsSecurity({
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
    width: isMedia ? 580 : config.width,
    icon: meta.icon,
    props: { settingKey, ...props },
    title: meta.title,
    ...config,
  };
}

interface AccountSettingsSurfaceProps {
  closeAction?: () => void;
  close?: () => void;
  settingKey?: string;
  account?: any;
  [key: string]: unknown;
}

function AccountSettingsSurface({
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
