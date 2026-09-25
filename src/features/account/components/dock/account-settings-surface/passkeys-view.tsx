import { useState } from "react";
import { deletePasskey, registerPasskey, renamePasskey } from "@/features/auth";
import { Button, Icon, Input, Loader } from "@/core/primitives";
import { ACTION_TONE_CLASS } from "@/core/tokens";
import { cn } from "@/core/utils";
import {
  INPUT_BASE_CLASSES,
  SUBMIT_BUTTON_CLASS,
  useAsyncSecurityAction,
} from "./index";

export interface AccountPasskeysViewProps {
  auth?: any;
  passkeys?: any[];
  reloadSecurityAction?: () => Promise<void>;
  reloadSecurity?: () => Promise<void>;
  securityLoading?: boolean;
}

export function AccountPasskeysView({
  auth,
  passkeys = [],
  reloadSecurityAction,
  reloadSecurity,
  securityLoading,
}: AccountPasskeysViewProps) {
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
                          "Failed to rename",
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
                      className="size-10 center shrink-0 rounded-[20px] bg-white/5 text-xs cursor-pointer text-white/70 transition-colors hover:bg-white/10 hover:text-white"
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
                      className="center h-9 rounded-[16px] px-3.5 text-xs font-semibold text-white/70 transition-colors duration-200 hover:bg-white/10 hover:text-white disabled:opacity-50"
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
                        "center h-9 rounded-[16px] px-3.5 text-xs font-semibold cursor-pointer text-white/70 transition-colors duration-200 hover:bg-white/10 disabled:opacity-50",
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
            "Passkey added successfully",
            "Failed to add passkey",
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

export const PasskeysSection = AccountPasskeysView;
