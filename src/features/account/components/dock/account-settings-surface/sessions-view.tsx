import { useState } from "react";
import { Button, Icon, Loader } from "@/core/primitives";
import { ACTION_TONE_CLASS } from "@/core/tokens";
import { cn } from "@/core/utils";
import {
  formatSessionActivity,
  formatSessionIp,
  parseUserAgent,
} from "../../../utils";
import { SUBMIT_BUTTON_CLASS, useAsyncSecurityAction } from "./index";

export interface AccountSessionsViewProps {
  reloadSecurityAction?: () => Promise<void>;
  reloadSecurity?: () => Promise<void>;
  revokeOthersAction?: () => Promise<void>;
  revokeOthers?: () => Promise<void>;
  revokeSessionAction?: (sessionId: string) => Promise<void>;
  revokeSession?: (sessionId: string) => Promise<void>;
  securityLoading?: boolean;
  sessions?: any[];
}

export function AccountSessionsView({
  reloadSecurityAction,
  reloadSecurity,
  revokeOthersAction,
  revokeOthers,
  revokeSessionAction,
  revokeSession,
  securityLoading,
  sessions = [],
}: AccountSessionsViewProps) {
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
            className="flex w-full animate-pulse items-center justify-between gap-2.5"
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
                "flex min-h-[52px] w-full items-center justify-between gap-3 rounded-[20px] py-2 pr-2 pl-3.5 transition-colors duration-200",
                s.is_current
                  ? "bg-primary/10"
                  : "bg-white/5 hover:bg-white/10",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Icon
                  icon={parsed.icon}
                  size={20}
                  className={cn(
                    "shrink-0 transition-colors",
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
                        "Session revoked",
                        "Failed to revoke session",
                      )
                    }
                    className={cn(
                      "center h-9 cursor-pointer rounded-[12px] px-3.5 text-xs font-semibold transition-colors duration-200 active:scale-96",
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
              "Other sessions revoked",
              "Failed to revoke sessions",
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

export const SessionsSection = AccountSessionsView;
