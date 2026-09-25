import { useMemo, useState } from "react";
import { linkIdentity, unlinkIdentity } from "@/features/auth";
import { useToast } from "@/core/modules/notification";
import { Button, Icon, Loader } from "@/core/primitives";
import { ACTION_TONE_CLASS } from "@/core/tokens";
import { cn } from "@/core/utils";
import { OAUTH_PROVIDER_CONFIG, normalizeOAuthProviderKey } from "./index";

export interface AccountProvidersViewProps {
  auth: any;
  identities?: any[];
  reloadSecurityAction?: () => Promise<void>;
  reloadSecurity?: () => Promise<void>;
  user?: any;
}

export function AccountProvidersView({
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
        error.message?.toLowerCase().includes("manual linking")
          ? `${item.config.label} disconnecting is disabled in Supabase settings`
          : error.message || "Disconnect failed",
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
      toast(
        error.message?.toLowerCase().includes("manual linking")
          ? `${config.label} linking is disabled in Supabase settings`
          : error.message || "Connection failed",
      );
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
              "center h-9 rounded-[16px] px-3.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
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
          className="flex h-11 w-full items-center justify-between rounded-[20px] bg-white/5 px-4 text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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

export const ProvidersSection = AccountProvidersView;
