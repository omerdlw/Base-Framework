"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";

import { completeSignUpAction } from "../../server/actions";
import { sanitizeNextPath, useAuth, AUTH_INPUT_CLASS } from "@/features/auth";
import { NAV_FADE_TRANSITION, textCrossfadeVariants } from "@/core/modules/nav";
import { EVENT_TYPES, globalEvents } from "@/core/events";
import { useToast } from "@/core/modules/notification";
import { Button, Input } from "@/core/primitives";

const DEFAULT_REDIRECT = "/account";

export const SUBMIT_BUTTON_CLASS =
  "h-11 w-full rounded-[20px] bg-white font-medium text-black transition-colors hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-50";

export interface AccountSetupData {
  displayName?: string;
  next?: string | null;
  username?: string;
  [key: string]: unknown;
}

function getAccountPath(
  username?: string | null,
  fallback = DEFAULT_REDIRECT,
): string {
  return username
    ? `/account/${encodeURIComponent(username)}`
    : sanitizeNextPath(fallback, DEFAULT_REDIRECT);
}

export interface AccountSetupSurfaceProps {
  close?: (result?: { success?: boolean }) => void;
  data?: AccountSetupData;
}

export function AccountSetupSurface({
  close,
  data = {},
}: AccountSetupSurfaceProps) {
  const auth = useAuth();
  const toast = useToast();

  const {
    username: initialUsername,
    displayName: initialDisplayName,
    next,
  } = data;

  const postAuthRedirect = useMemo(
    () => sanitizeNextPath(next, DEFAULT_REDIRECT),
    [next],
  );

  const [username, setUsername] = useState(() =>
    String(initialUsername || "").trim(),
  );
  const [displayName, setDisplayName] = useState(() =>
    String(
      initialDisplayName || auth.user?.user_metadata?.full_name || "",
    ).trim(),
  );

  const [setupState, formAction, isPending] = useActionState(
    async (_prev: any, formData: FormData) => {
      const formUsername = (
        (formData?.get("username") as string) || username
      ).trim();
      const formDisplayName = (
        (formData?.get("displayName") as string) || displayName
      ).trim();

      if (!formUsername) {
        return { error: "Username is required", success: false };
      }

      const result = await completeSignUpAction({
        displayName: formDisplayName || formUsername,
        username: formUsername,
      });

      if (!result.success) {
        return {
          error:
            result.error ||
            "Could not complete account setup — try a different username",
          success: false,
        };
      }

      const resolvedUsername = result.account?.username || formUsername;
      const nextState = await auth.refresh();
      const user = nextState?.user || auth.user;
      const session =
        nextState?.session || auth.session || (user ? { user } : null);

      if (user) {
        globalEvents.emit(EVENT_TYPES.AUTH_SIGN_IN, {
          account: result.account,
          session,
          userId: user.id,
        });
      }

      return {
        resolvedUsername,
        success: true,
      };
    },
    null,
  );

  useEffect(() => {
    if (!setupState) return;
    if (setupState.success && setupState.resolvedUsername) {
      close?.({ success: true });
      window.location.replace(
        getAccountPath(setupState.resolvedUsername, postAuthRedirect),
      );
    } else if (setupState.error) {
      toast.error(setupState.error);
    }
  }, [close, postAuthRedirect, setupState, toast]);

  return (
    <motion.form
      action={formAction}
      animate="visible"
      className="flex flex-col gap-2.5"
      initial="hidden"
      transition={NAV_FADE_TRANSITION}
      variants={textCrossfadeVariants}
    >
      <Input
        name="username"
        aria-label="Username"
        autoComplete="username"
        autoFocus
        className={AUTH_INPUT_CLASS}
        disabled={isPending}
        id="account-setup-username"
        onChange={(event) => setUsername(event.target.value)}
        placeholder="Username"
        required
        type="text"
        value={username}
      />
      <Input
        name="displayName"
        aria-label="Display name"
        autoComplete="name"
        className={AUTH_INPUT_CLASS}
        disabled={isPending}
        id="account-setup-display-name"
        onChange={(event) => setDisplayName(event.target.value)}
        placeholder="Display name (optional)"
        type="text"
        value={displayName}
      />
      <Button
        className={SUBMIT_BUTTON_CLASS}
        disabled={isPending || !username.trim()}
        type="submit"
      >
        {isPending ? "Setting up…" : "Continue"}
      </Button>
    </motion.form>
  );
}

export default AccountSetupSurface;
