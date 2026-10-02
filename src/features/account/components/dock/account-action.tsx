"use client";

import { memo, type MouseEvent } from "react";
import { Button, Icon } from "@/features/shell/primitives";
import { useDockActionClass } from "@omerdlw/base-framework/modules/dock";
import { ACTION_TONE_CLASS } from "@omerdlw/base-framework/tokens";

interface AccountInboxActionProps {
  canManageRequests?: boolean;
  inboxCount?: number;
  isOwner?: boolean;
  onOpenInbox?: (event: MouseEvent<HTMLButtonElement>) => void;
}

const AccountInboxAction = memo(function AccountInboxAction({
  canManageRequests = false,
  inboxCount = 0,
  isOwner = false,
  onOpenInbox,
}: AccountInboxActionProps) {
  const actionClass = useDockActionClass();
  if (!isOwner) return null;

  const shouldShowInboxAction =
    canManageRequests && inboxCount > 0 && typeof onOpenInbox === "function";

  if (!shouldShowInboxAction) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        aria-label={`Inbox with ${inboxCount} pending requests`}
        className={actionClass({
          className: "disabled:cursor-not-allowed disabled:opacity-50",
          variant: ACTION_TONE_CLASS,
        })}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onOpenInbox?.(event);
        }}
        type="button"
      >
        <Icon icon="solar:inbox-bold" size={16} />
        <span>Inbox {inboxCount}</span>
      </Button>
    </div>
  );
});

export const AccountAction = AccountInboxAction;
