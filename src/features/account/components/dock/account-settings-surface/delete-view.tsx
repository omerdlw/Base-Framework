import { useState } from "react";
import {
  createVerificationSurfaceEntry,
  getAuthCallbackUrl,
  requestEmailAuth,
} from "@/features/auth";
import { useDockActions, getDockActionClass } from "@/core/modules/dock";
import { useToast } from "@/core/modules/notification";
import { Button, Input, Loader } from "@/core/primitives";
import { ACTION_TONE_CLASS } from "@/core/tokens";
import { INPUT_BASE_CLASSES } from "./index";

export interface AccountDeleteViewProps {
  auth: any;
  deleteAccountAction?: (confirmation: any) => Promise<void>;
  deleteAccount?: (confirmation: any) => Promise<void>;
}

export function AccountDeleteView({
  auth,
  deleteAccountAction,
  deleteAccount,
}: AccountDeleteViewProps) {
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
      toast(error?.message || "Could not send verification code");
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
        className={getDockActionClass({
          className:
            "h-10 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          variant: ACTION_TONE_CLASS,
        })}
      >
        {sending ? <Loader /> : "Send verification code"}
      </Button>
    </div>
  );
}

export const DeleteSection = AccountDeleteView;
