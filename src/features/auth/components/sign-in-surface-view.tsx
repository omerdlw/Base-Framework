"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "motion/react";

import {
  getAuthCallbackUrl,
  OAUTH_PROVIDERS,
  requestEmailAuth,
  sanitizeNextPath,
  signInWithOAuth,
  signInWithPasskey,
  useAuth,
} from "@/features/auth";
import {
  getNavActionClass,
  NAV_FADE_TRANSITION,
  navListItemVariants,
  textCrossfadeVariants,
  useNavigationActions,
  type SurfaceEntry,
} from "@/core/modules/nav";
import { INFO_ACTION_TONE_CLASS } from "@/core/tokens";
import { EVENT_TYPES, globalEvents } from "@/core/events";
import { useToast } from "@/core/modules/notification";
import { Button, Icon, Input } from "@/core/primitives";
import { createVerificationSurfaceEntry } from "./verification-surface";

const DEFAULT_SURFACE_WIDTH = 250;
const REDIRECT_TIMEOUT_MS = 12000;

const PROVIDER_CONFIG = Object.freeze({
  email: Object.freeze({ icon: "solar:letter-bold", label: "Email" }),
  github: Object.freeze({ icon: "mdi:github", label: "GitHub" }),
  google: Object.freeze({
    icon: "flat-color-icons:google",
    label: "Google",
  }),
  x: Object.freeze({ icon: "simple-icons:x", label: "Twitter" }),
  passkey: Object.freeze({ icon: "solar:key-bold", label: "Passkey" }),
} as Record<string, { icon: string; label: string }>);

export const AUTH_INPUT_CLASS =
  "h-10 w-full rounded-[20px] bg-white/5 px-4 text-sm text-white ring-1 ring-inset ring-white/5 placeholder:text-white/50 transition-all hover:bg-white/10 hover:ring-white/10 focus:bg-white/10 focus:ring-white/10";

const PROVIDER_BUTTON_CLASS =
  "group/btn center h-11 w-full cursor-pointer rounded-[20px] bg-white/5 px-3 @[280px]:px-4 text-xs @[280px]:text-sm text-white/70 ring-1 ring-inset ring-white/5 hover:bg-white hover:text-black hover:ring-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

const PROVIDER_GRID_BUTTON_CLASS =
  "group/btn center h-11 @[360px]:h-12 w-full cursor-pointer rounded-[20px] bg-white/5 text-white/70 ring-1 ring-inset ring-white/5 hover:bg-white hover:text-black hover:ring-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

export interface OAuthProviderButtonProps {
  disabled?: boolean;
  isBusy?: boolean;
  onClick?: () => void;
  provider: string;
}

export function OAuthProviderButton({
  disabled = false,
  isBusy = false,
  onClick,
  provider,
}: OAuthProviderButtonProps) {
  const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.email;

  return (
    <Button
      aria-label={`Continue with ${config.label}`}
      className={PROVIDER_BUTTON_CLASS}
      disabled={disabled || isBusy}
      onClick={onClick}
      type="button"
    >
      <span className="flex min-w-0 items-center justify-center gap-2 @[280px]:gap-2.5">
        <span className="center size-6 @[280px]:size-7 shrink-0 text-white/70 group-hover/btn:text-black transition-colors">
          <Icon icon={config.icon} size={18} />
        </span>
        <span className="truncate font-medium">
          Continue with {config.label}
        </span>
      </span>
    </Button>
  );
}

export function OAuthProviderGridButton({
  disabled = false,
  isBusy = false,
  onClick,
  provider,
}: OAuthProviderButtonProps) {
  const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.email;

  return (
    <Button
      aria-label={`Continue with ${config.label}`}
      className={PROVIDER_GRID_BUTTON_CLASS}
      disabled={disabled || isBusy}
      onClick={onClick}
      type="button"
    >
      <span className="center text-white/70 group-hover/btn:text-black transition-colors">
        <Icon icon={config.icon} size={20} />
      </span>
    </Button>
  );
}

export interface OAuthProviderListProps {
  activeProvider?: string | null;
  disabled?: boolean;
  includeEmail?: boolean;
  includePasskey?: boolean;
  onSelect?: (provider: string) => void;
}

export function OAuthProviderList({
  activeProvider = null,
  disabled = false,
  includeEmail = false,
  includePasskey = false,
  onSelect,
}: OAuthProviderListProps) {
  const gridProviders = [
    ...(includeEmail ? ["email"] : []),
    ...OAUTH_PROVIDERS,
  ];

  return (
    <div className="flex w-full flex-col gap-2 @[280px]:gap-2.5">
      {includePasskey && (
        <motion.div
          animate="visible"
          className="w-full"
          custom={0}
          exit="exit"
          initial="hidden"
          key="passkey"
          variants={navListItemVariants}
        >
          <OAuthProviderButton
            disabled={disabled || Boolean(activeProvider)}
            isBusy={activeProvider === "passkey"}
            onClick={() => onSelect?.("passkey")}
            provider="passkey"
          />
        </motion.div>
      )}

      {gridProviders.length > 0 && (
        <div className="grid w-full grid-cols-2 @[380px]:grid-cols-4 gap-2 @[280px]:gap-2.5">
          {gridProviders.map((provider, index) => (
            <motion.div
              animate="visible"
              className="w-full"
              custom={includePasskey ? index + 1 : index}
              exit="exit"
              initial="hidden"
              key={provider}
              variants={navListItemVariants}
            >
              <OAuthProviderGridButton
                disabled={disabled || Boolean(activeProvider)}
                isBusy={activeProvider === provider}
                onClick={() => onSelect?.(provider)}
                provider={provider}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function getCurrentPath(
  pathname?: string | null,
  searchParams?: URLSearchParams | null,
): string {
  const query = searchParams?.toString();
  return `${pathname || "/"}${query ? `?${query}` : ""}`;
}

function usePostAuthRedirect(nextPath?: string | null): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(
    () =>
      sanitizeNextPath(nextPath || getCurrentPath(pathname, searchParams), "/"),
    [nextPath, pathname, searchParams],
  );
}

export interface SignInData {
  email?: string;
  identifier?: string;
  next?: string | null;
  [key: string]: unknown;
}

function createSurfaceEntry(
  Component: ComponentType<any>,
  title: string,
  data: SignInData = {},
  config: Partial<SurfaceEntry> = {},
): SurfaceEntry {
  return {
    component: Component,
    title,
    props: { data },
    width: DEFAULT_SURFACE_WIDTH,
    ...config,
  };
}

export const createSignInSurfaceEntry = (
  data: SignInData = {},
  config: Partial<SurfaceEntry> = {},
) => createSurfaceEntry(SignInSurface, "Sign In", data, config);

export const createEmailSignInSurfaceEntry = (
  data: SignInData = {},
  config: Partial<SurfaceEntry> = {},
) => createSurfaceEntry(EmailSignInSurface, "Sign In", data, config);

export interface EmailSignInSurfaceProps {
  close?: (result?: { success?: boolean }) => void;
  data?: SignInData;
}

export function EmailSignInSurface({ data = {} }: EmailSignInSurfaceProps) {
  const auth = useAuth();
  const { openSurface } = useNavigationActions();
  const toast = useToast();

  const [email, setEmail] = useState(() =>
    String(data.email || data.identifier || "").trim(),
  );
  const postAuthRedirect = usePostAuthRedirect(data.next);

  const submitButtonClass = useMemo(
    () =>
      getNavActionClass({
        className:
          "h-10 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant: INFO_ACTION_TONE_CLASS,
      }),
    [],
  );

  const [emailAuthState, emailAuthAction, isEmailPending] = useActionState(
    async (_prev: any, formData: FormData) => {
      const targetEmail = ((formData?.get("email") as string) || email).trim();
      if (!targetEmail) return { error: "Email is required", success: false };
      try {
        await requestEmailAuth(auth.client, {
          createUser: true,
          email: targetEmail,
        });
        return { email: targetEmail, success: true };
      } catch (error: any) {
        return {
          error: error?.message || "Authentication failed",
          success: false,
        };
      }
    },
    null,
  );

  useEffect(() => {
    if (!emailAuthState) return;
    if (emailAuthState.success && emailAuthState.email) {
      openSurface(
        createVerificationSurfaceEntry({
          email: emailAuthState.email,
          next: postAuthRedirect,
        }),
      );
    } else if (emailAuthState.error) {
      toast.error(emailAuthState.error);
    }
  }, [emailAuthState, openSurface, postAuthRedirect, toast]);

  return (
    <motion.form
      action={emailAuthAction}
      animate="visible"
      className="flex flex-col gap-2.5"
      initial="hidden"
      transition={NAV_FADE_TRANSITION}
      variants={textCrossfadeVariants}
    >
      <Input
        name="email"
        aria-label="Email"
        autoComplete="email"
        autoFocus
        className={AUTH_INPUT_CLASS}
        disabled={isEmailPending}
        id="surface-email-sign-in-input"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email"
        required
        type="email"
        value={email}
      />
      <div className="flex w-full items-center gap-2 @[280px]:gap-2.5">
        <Button
          className={submitButtonClass}
          disabled={isEmailPending}
          type="submit"
        >
          <span className="truncate">
            {isEmailPending ? "Sending..." : "Continue with email"}
          </span>
        </Button>
      </div>
    </motion.form>
  );
}

export interface SignInSurfaceProps {
  close?: (result?: { success?: boolean }) => void;
  data?: SignInData;
}

export function SignInSurface({ close, data = {} }: SignInSurfaceProps) {
  const auth = useAuth();
  const { openSurface } = useNavigationActions();
  const toast = useToast();

  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const completionInFlight = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const postAuthRedirect = usePostAuthRedirect(data.next);
  const isBusy = Boolean(activeProvider);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const completeAuthentication = useCallback(async () => {
    if (completionInFlight.current) return;
    completionInFlight.current = true;

    try {
      const nextState = await auth.refresh();
      const user = nextState?.user || auth.user;
      const session =
        nextState?.session || auth.session || (user ? { user } : null);

      if (user) {
        globalEvents.emit(EVENT_TYPES.AUTH_SIGN_IN, {
          session,
          userId: user.id,
        });
      }

      close?.({ success: true });
      window.location.replace(postAuthRedirect);
    } catch (error) {
      completionInFlight.current = false;
      throw error;
    }
  }, [auth, close, postAuthRedirect]);

  async function handleProviderSignIn(provider: string) {
    if (isBusy) return;
    setActiveProvider(provider);

    const isPasskey = provider === "passkey";
    const providerName = isPasskey
      ? "passkey"
      : `${provider.charAt(0).toUpperCase() + provider.slice(1)}`;

    globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
      description: isPasskey
        ? "Preparing passkey sign-in"
        : `Redirecting to ${providerName} sign-in`,
      flow: "login",
      phase: "start",
      priority: 110,
      statusType: "LOGIN",
      themeType: "LOGIN",
      title: "Signing In",
    });

    let isRedirecting = false;
    try {
      if (isPasskey) {
        await signInWithPasskey(auth.client);
        await completeAuthentication();
        return;
      }

      await signInWithOAuth(auth.client, {
        provider,
        redirectTo: getAuthCallbackUrl(postAuthRedirect),
      });

      isRedirecting = true;

      timeoutRef.current = window.setTimeout(() => {
        globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
          flow: "login",
          phase: "clear",
          statusType: "LOGIN",
        });
      }, REDIRECT_TIMEOUT_MS);
    } catch (error: any) {
      globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
        flow: "login",
        phase: "failure",
        statusType: "LOGIN",
      });
      toast.error(error?.message || "Authentication failed");
    } finally {
      if (!isRedirecting) setActiveProvider(null);
    }
  }

  function handleMethodSelect(provider: string) {
    if (provider === "email") {
      openSurface(
        createEmailSignInSurfaceEntry({
          email: String(data.email || data.identifier || "").trim(),
          next: postAuthRedirect,
        }),
      );
      return;
    }
    handleProviderSignIn(provider);
  }

  if (!auth.isConfigured) {
    return (
      <p className="rounded-xl bg-white/5 px-4 py-3 text-sm text-white/70 ring-1 ring-inset ring-white/10">
        Configure the Supabase variables in .env.local first
      </p>
    );
  }

  return (
    <motion.div
      animate="visible"
      className="flex flex-col gap-2.5"
      initial="hidden"
      transition={NAV_FADE_TRANSITION}
      variants={textCrossfadeVariants}
    >
      <OAuthProviderList
        activeProvider={activeProvider}
        disabled={isBusy}
        includeEmail
        includePasskey
        onSelect={handleMethodSelect}
      />
    </motion.div>
  );
}
