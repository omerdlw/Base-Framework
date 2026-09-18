"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { motion } from "motion/react";

import { requestJson } from "@/infrastructure/http/client";
import {
  getAuthCallbackUrl,
  requestEmailAuth,
  sanitizeNextPath,
  useAuth,
  verifyEmailOtp,
} from "@/features/auth";
import {
  NAV_FADE_TRANSITION,
  NavSurfaceAction,
  NavSurfaceHeaderButton,
  textCrossfadeVariants,
  useNavigationActions,
  type SurfaceEntry,
} from "@/core/modules/nav";
import { useToast } from "@/core/modules/notification";
import { EVENT_TYPES, globalEvents } from "@/core/events";
import { Input } from "@/core/primitives";
import { cn } from "@/core/utils";
import { createAccountSetupSurfaceEntry } from "@/features/account";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const ERROR_RESET_DELAY_MS = 700;
const AUTO_FOCUS_DELAY_MS = 150;

const BOX_STYLES = {
  BASE: "center h-11 @[280px]:h-14 rounded-[14px] @[280px]:rounded-[20px] text-base @[280px]:text-lg font-semibold text-white/70 ring-1 ring-inset ring-white/5 transition-all duration-300 ease-in-out hover:text-white",
  ERROR:
    "bg-error/15 text-error ring-error/30 hover:bg-error/20 hover:ring-error/20",
  ACTIVE: "bg-white/5 text-white ring-white/10 hover:bg-white/10",
  SUCCESS:
    "bg-success/15 text-success ring-success/30 hover:bg-success/20 hover:ring-success/20",
};

export interface VerificationData {
  displayName?: string;
  email?: string;
  identifier?: string;
  next?: string | null;
  onVerified?: (code: string) => Promise<void> | void;
  [key: string]: unknown;
}

export function createVerificationSurfaceEntry(
  data: VerificationData = {},
  config: Partial<SurfaceEntry> = {},
): SurfaceEntry {
  return {
    component: VerificationSurface,
    props: { data },
    title: "Verify email",
    ...config,
  };
}

function normalizeOtpValue(value?: unknown): string {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, OTP_LENGTH);
}

function useResendTimer(cooldownSeconds: number) {
  const [resendAvailableAt, setResendAvailableAt] = useState(
    () => Date.now() + cooldownSeconds * 1000,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!resendAvailableAt) return;
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [resendAvailableAt]);

  const resendRemainingSeconds = Math.max(
    0,
    Math.ceil((resendAvailableAt - now) / 1000),
  );
  const canResend = resendRemainingSeconds === 0;

  const resetTimer = useCallback(() => {
    setResendAvailableAt(Date.now() + cooldownSeconds * 1000);
    setNow(Date.now());
  }, [cooldownSeconds]);

  return { resendRemainingSeconds, canResend, resetTimer };
}

interface OtpBoxesProps {
  code: string;
  disabled?: boolean;
  hasError?: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  isFocused: boolean;
  onCodeChange: (value?: string) => void;
  setIsFocused: (focused: boolean) => void;
}

function OtpBoxes({
  code,
  disabled,
  hasError,
  inputRef,
  isFocused,
  onCodeChange,
  setIsFocused,
}: OtpBoxesProps) {
  const activeIndex = Math.min(code.length, OTP_LENGTH - 1);

  return (
    <div className="relative" onClick={() => inputRef.current?.focus?.()}>
      <Input
        ref={inputRef as any}
        aria-label="Verification code"
        autoComplete="one-time-code"
        className="absolute inset-0 z-10 size-full cursor-text rounded-none bg-transparent px-0 py-0 text-transparent opacity-0 outline-none ring-0 focus:bg-transparent focus:ring-0"
        disabled={disabled}
        inputMode="numeric"
        maxLength={OTP_LENGTH}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => onCodeChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onPaste={(event) => {
          event.preventDefault();
          onCodeChange(event.clipboardData?.getData("text"));
        }}
        type="text"
        value={code}
      />
      <div className="grid grid-cols-6 gap-1.5 @[280px]:gap-2.5 overflow-visible">
        {Array.from({ length: OTP_LENGTH }).map((_, index) => {
          const digit = code[index] || "";
          const isActive = isFocused && activeIndex === index;
          const isSuccess = digit && !hasError;
          const isError = hasError && digit;

          return (
            <div
              key={`otp-box-${index}`}
              className={cn(
                BOX_STYLES.BASE,
                isError && BOX_STYLES.ERROR,
                isActive && !digit && BOX_STYLES.ACTIVE,
                isSuccess && BOX_STYLES.SUCCESS,
              )}
            >
              {digit || <span className="invisible">0</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface VerificationSurfaceProps {
  close?: (result?: { success?: boolean }) => void;
  data?: VerificationData;
}

export function VerificationSurface({
  close,
  data = {},
}: VerificationSurfaceProps) {
  const auth = useAuth();
  const toast = useToast();
  const { openSurface } = useNavigationActions();

  const { email: rawEmail, identifier, next, onVerified, displayName } = data;
  const email = String(rawEmail || identifier || "").trim();
  const postAuthRedirect = sanitizeNextPath(next, "/account");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const submitInFlight = useRef(false);
  const lastSubmittedCode = useRef("");
  const resetErrorTimeout = useRef<number | null>(null);

  const [code, setCode] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [hasCodeError, setHasCodeError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const { resendRemainingSeconds, canResend, resetTimer } = useResendTimer(
    RESEND_COOLDOWN_SECONDS,
  );
  const isBusy = isSubmitting || isResending;

  useEffect(() => {
    const focusTimer = window.setTimeout(
      () => inputRef.current?.focus?.(),
      AUTO_FOCUS_DELAY_MS,
    );
    return () => {
      window.clearTimeout(focusTimer);
      if (resetErrorTimeout.current)
        window.clearTimeout(resetErrorTimeout.current);
    };
  }, []);

  const sendCode = useCallback(async () => {
    if (isBusy || !canResend) return;

    setIsResending(true);
    try {
      await requestEmailAuth(auth.client, {
        createUser: true,
        email,
        emailRedirectTo: getAuthCallbackUrl(postAuthRedirect),
      });
      setCode("");
      setHasCodeError(false);
      resetTimer();
    } catch (error: any) {
      toast.error(error?.message || "Verification code could not be sent");
    } finally {
      setIsResending(false);
    }
  }, [
    auth.client,
    canResend,
    email,
    isBusy,
    postAuthRedirect,
    resetTimer,
    toast,
  ]);

  const completeVerification = useCallback(
    async (value: string) => {
      const normalizedCode = normalizeOtpValue(value);

      if (
        normalizedCode.length !== OTP_LENGTH ||
        isBusy ||
        submitInFlight.current ||
        lastSubmittedCode.current === normalizedCode
      )
        return;

      lastSubmittedCode.current = normalizedCode;
      submitInFlight.current = true;
      setIsSubmitting(true);

      try {
        await verifyEmailOtp(auth.client, { email, token: normalizedCode });

        if (typeof onVerified === "function") {
          await onVerified(normalizedCode);
          close?.({ success: true });
          return;
        }

        const nextState = await auth.refresh();
        const user = nextState?.user || auth.user;
        const session =
          nextState?.session || auth.session || (user ? { user } : null);

        const meResult = await requestJson<{
          account?: { username?: string };
          profile?: { username?: string };
        }>("/api/account/me", {
          notifyOnError: false,
          notifyOnUnauthorized: false,
        }).catch(() => null);

        const hasUsername = Boolean(
          meResult?.account?.username || meResult?.profile?.username,
        );

        if (!hasUsername) {
          openSurface(
            createAccountSetupSurfaceEntry({
              displayName: displayName || "",
              next: postAuthRedirect,
            }),
          );
          return;
        }

        if (user) {
          globalEvents.emit(EVENT_TYPES.AUTH_SIGN_IN, {
            session,
            userId: user.id,
          });
        }

        close?.({ success: true });
        window.location.replace(postAuthRedirect);
      } catch (error: any) {
        lastSubmittedCode.current = "";
        setHasCodeError(true);
        toast.error(error?.message || "Email verification failed");

        if (resetErrorTimeout.current)
          window.clearTimeout(resetErrorTimeout.current);

        resetErrorTimeout.current = window.setTimeout(() => {
          setCode("");
          setHasCodeError(false);
          setIsFocused(false);
          inputRef.current?.focus?.();
          resetErrorTimeout.current = null;
        }, ERROR_RESET_DELAY_MS);
      } finally {
        submitInFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [
      auth,
      close,
      onVerified,
      displayName,
      email,
      isBusy,
      openSurface,
      postAuthRedirect,
      toast,
    ],
  );

  const handleCodeChange = useCallback(
    (value?: string) => {
      const normalizedValue = normalizeOtpValue(value);
      setCode(normalizedValue);
      if (normalizedValue.length === OTP_LENGTH) {
        completeVerification(normalizedValue);
      }
    },
    [completeVerification],
  );

  if (!auth.isConfigured) {
    return (
      <p className="rounded-xl bg-white/5 px-4 py-3 text-sm text-white/70 ring-1 ring-inset ring-white/10">
        Configure the Supabase variables in .env.local first
      </p>
    );
  }

  return (
    <>
      <NavSurfaceAction>
        <NavSurfaceHeaderButton
          disabled={isBusy || !canResend}
          onClick={sendCode}
        >
          {isResending
            ? "Sending..."
            : canResend
              ? "Resend"
              : `${resendRemainingSeconds}s`}
        </NavSurfaceHeaderButton>
      </NavSurfaceAction>

      <motion.form
        aria-busy={isBusy}
        className="flex flex-col gap-2.5"
        initial="hidden"
        onSubmit={(event) => {
          event.preventDefault();
          completeVerification(code);
        }}
        transition={NAV_FADE_TRANSITION}
        animate="visible"
        variants={textCrossfadeVariants}
      >
        <OtpBoxes
          code={code}
          disabled={isBusy}
          hasError={hasCodeError}
          inputRef={inputRef}
          isFocused={isFocused}
          onCodeChange={handleCodeChange}
          setIsFocused={setIsFocused}
        />
      </motion.form>
    </>
  );
}
