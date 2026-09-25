import { useState } from "react";
import { useToast } from "@/core/modules/notification";
import { Button, Input, Loader } from "@/core/primitives";
import { INPUT_BASE_CLASSES, SUBMIT_BUTTON_CLASS } from "./index";

export interface AccountEmailViewProps {
  account?: any;
  auth: any;
}

export function AccountEmailView({ account, auth }: AccountEmailViewProps) {
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
      toast(error.message || "Email could not be updated");
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

export const EmailSection = AccountEmailView;
