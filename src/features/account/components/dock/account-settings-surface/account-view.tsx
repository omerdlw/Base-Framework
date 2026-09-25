import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "../../../provider";
import { updateAccountAction } from "../../../server/actions";
import { useToast } from "@/core/modules/notification";
import { Button, Input, Loader, Textarea } from "@/core/primitives";
import { cn } from "@/core/utils";
import {
  INPUT_BASE_CLASSES,
  SUBMIT_BUTTON_CLASS,
  TEXTAREA_BASE_CLASSES,
  USERNAME_ERROR,
  USERNAME_REGEX,
} from "./index";

export interface AccountInfoViewProps {
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

export function AccountInfoView({
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
      toast("Account info updated successfully");
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
        {isPending ? <Loader /> : "Save changes"}
      </Button>
    </form>
  );
}

export const SurfaceAccountInfoForm = AccountInfoView;
