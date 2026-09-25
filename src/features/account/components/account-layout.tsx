"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEventHandler,
  type ReactNode,
} from "react";

import BackdropHero from "@/core/primitives/backdrop-hero";
import AdaptiveImage from "@/core/primitives/adaptive-image";
import { Button, Icon } from "@/core/primitives";
import {
  applyAvatarFallback,
  getInitial,
  getUserAvatarFallbackUrl,
} from "../utils";
import { SOCIAL_EVENTS } from "../constants";
import { useGlobalEvent } from "@/core/hooks";
import { useDockActions } from "@/core/modules/dock";
import { useAmbientTheme } from "@/core/modules/ambient";
import { createAccountSocialSurfaceEntry } from "./dock/account-social-surface";
import { createAccountBioSurfaceEntry } from "./dock/account-bio-surface";

const DEFAULT_DISPLAY_NAME = "Account";

const JOIN_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

const AVATAR_CLASSES =
  "flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/60 text-4xl font-semibold text-white shadow-2xl ring-2 ring-white/10 select-none sm:size-28 sm:text-5xl lg:size-32";

export interface AccountData {
  id?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  backgroundUrl?: string | null;
  bannerPosition?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  createdAt?: string;
  isPrivate?: boolean;
  [key: string]: unknown;
}

function formatJoinDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : JOIN_DATE_FORMATTER.format(date);
}

function resolveAccountBackdropUrl(
  profile?: AccountData | null,
): string | null {
  const background = String(
    profile?.backgroundUrl || (profile as any)?.background_url || "",
  ).trim();
  if (!background) return null;
  return /^(https?:\/\/|\/|data:image\/)/.test(background) ? background : null;
}

function getAccountDisplayName(account?: AccountData | null): string {
  return account?.displayName || account?.username || DEFAULT_DISPLAY_NAME;
}

export function useSocialFollowSync(
  accountId?: string | null,
  initialCount = 0,
  initialStatus = false,
) {
  const [delta, setDelta] = useState(0);
  const [status, setStatus] = useState(initialStatus);
  const [prevCount, setPrevCount] = useState(initialCount);
  const [prevStatus, setPrevStatus] = useState(initialStatus);

  if (initialCount !== prevCount) {
    setPrevCount(initialCount);
    setDelta(0);
  }
  if (initialStatus !== prevStatus) {
    setPrevStatus(initialStatus);
    setStatus(initialStatus);
  }

  useGlobalEvent(
    accountId ? SOCIAL_EVENTS.FOLLOW_CHANGE : null,
    (payload: any) => {
      if (payload?.followingId === accountId) {
        const isAccepted = payload.status === "accepted";
        setStatus(isAccepted);
        setDelta((prev) => (isAccepted ? prev + 1 : prev - 1));
      }
    },
  );

  return {
    followersCount: Math.max(0, initialCount + delta),
    isFollower: status,
  };
}

export interface AccountBackdropHeroProps {
  image?: string | null;
}

export function AccountBackdropHero({ image }: AccountBackdropHeroProps) {
  return (
    <BackdropHero
      image={image}
      position="center 25%"
      className="lg:h-[clamp(28rem,40vw,34rem)] xl:h-[clamp(30rem,42vw,36rem)]"
    />
  );
}

interface AccountHeroBioProps {
  bio?: string | null;
  onOpenBio: () => void;
}

function AccountHeroBio({ bio, onOpenBio }: AccountHeroBioProps) {
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const [hasTextOverflow, setHasTextOverflow] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element || !bio) return;

    const checkOverflow = () => {
      setHasTextOverflow(element.scrollWidth > element.clientWidth);
    };

    const frameId = requestAnimationFrame(checkOverflow);
    const resizeObserver = new ResizeObserver(checkOverflow);

    resizeObserver.observe(element);
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [bio]);

  if (!bio) return null;

  const isOverflowing = bio.includes("\n") || hasTextOverflow;

  return (
    <div className="mt-3 flex min-w-0 items-center gap-1.5 overflow-hidden text-xs text-white/70 sm:mt-3.5 sm:text-sm">
      <p
        ref={textRef}
        className={`min-w-0 truncate ${isOverflowing ? "cursor-pointer select-none transition-all hover:text-white" : ""}`}
        onClick={isOverflowing ? onOpenBio : undefined}
      >
        {bio}
      </p>
      {isOverflowing && (
        <Button
          className="shrink-0 cursor-pointer font-medium text-white underline underline-offset-2 transition-all hover:text-white"
          onClick={onOpenBio}
          type="button"
        >
          read more
        </Button>
      )}
    </div>
  );
}

interface SocialStatButtonProps {
  count: number;
  label: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
}

function SocialStatButton({ count, label, onClick }: SocialStatButtonProps) {
  return (
    <Button
      className="inline-flex cursor-pointer items-center gap-1.5 transition-all hover:text-white"
      onClick={onClick}
      type="button"
    >
      <span className="font-semibold text-white">{count}</span>
      <span>{label}</span>
    </Button>
  );
}

function PrivateLockedView() {
  return (
    <div className="flex min-h-[14rem] w-full flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="center size-12 rounded-2xl bg-white/5 text-white/50 ring-1 ring-white/10 ring-inset">
        <Icon icon="solar:lock-bold" size={24} />
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <h3 className="text-sm font-semibold text-white">
          This account is private
        </h3>
        <p className="text-xs text-white/50">
          Follow this account to see their activity
        </p>
      </div>
    </div>
  );
}

export interface AccountHeroProps {
  account?: AccountData | null;
  profile?: AccountData | null;
  followersCount?: number;
  followingCount?: number;
  enableSocial?: boolean;
}

export function AccountHero({
  account: accountProp,
  profile,
  followersCount: initialFollowersCount = 0,
  followingCount = 0,
  enableSocial = true,
}: AccountHeroProps) {
  const account = accountProp || profile;
  const { openSurface } = useDockActions();
  const { followersCount } = useSocialFollowSync(
    account?.id,
    initialFollowersCount,
  );

  const displayName = getAccountDisplayName(account);
  const backdropUrl = resolveAccountBackdropUrl(account);
  const joinDate = formatJoinDate(account?.createdAt) || "—";

  useAmbientTheme({
    image: backdropUrl || account?.avatarUrl || null,
  });

  const openSocial = (tab: "following" | "followers") => {
    if (!account?.id) return;
    openSurface(
      createAccountSocialSurfaceEntry({
        account,
        displayName,
        tab,
        userId: account.id,
        username: account.username,
      }),
    );
  };

  const openBio = () => {
    if (!account?.bio) return;
    openSurface(
      createAccountBioSurfaceEntry({
        account,
        bio: account.bio,
        displayName,
        username: account.username,
      }),
    );
  };

  const paddingClass = backdropUrl
    ? "-mt-20 pb-6 sm:-mt-28 sm:pb-8 lg:-mt-36 lg:pb-10"
    : "py-14 sm:py-20 lg:py-24";

  return (
    <>
      {backdropUrl && <AccountBackdropHero image={backdropUrl} />}

      <section className={`relative z-10 w-full ${paddingClass}`}>
        <div className="relative z-10 flex min-w-0 items-center gap-4 sm:gap-6 lg:gap-8">
          <div
            role="img"
            aria-label={`${displayName} avatar`}
            className={AVATAR_CLASSES}
          >
            {account?.avatarUrl ? (
              <AdaptiveImage
                alt=""
                className="size-full object-cover"
                onError={(e) =>
                  applyAvatarFallback(e, getUserAvatarFallbackUrl(account))
                }
                src={account.avatarUrl}
              />
            ) : (
              getInitial(displayName || account?.username)
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h1 className="font-zuume max-w-full text-4xl leading-none font-bold text-white uppercase [overflow-wrap:anywhere] sm:text-6xl lg:text-7xl">
              {displayName}
            </h1>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/50 sm:mt-2 sm:text-base">
              {enableSocial && (
                <>
                  <SocialStatButton
                    count={followingCount}
                    label="Following"
                    onClick={() => openSocial("following")}
                  />
                  <span className="text-white/50">•</span>
                  <SocialStatButton
                    count={followersCount}
                    label="Followers"
                    onClick={() => openSocial("followers")}
                  />
                  <span className="text-white/50">•</span>
                </>
              )}
              <span>Joined {joinDate}</span>

              {account?.isPrivate && (
                <>
                  <span className="text-white/50">•</span>
                  <span>Private</span>
                </>
              )}
            </div>

            <AccountHeroBio bio={account?.bio} onOpenBio={openBio} />
          </div>
        </div>
      </section>
    </>
  );
}

export interface AccountLayoutProps {
  account?: AccountData | null;
  profile?: AccountData | null;
  followersCount?: number;
  followingCount?: number;
  isFollower?: boolean;
  isOwner?: boolean;
  enableSocial?: boolean;
  tabsSlot?: ReactNode;
  children?: ReactNode;
}

export function AccountLayout({
  account,
  profile,
  followersCount = 0,
  followingCount = 0,
  isFollower: initialIsFollower = false,
  isOwner = false,
  enableSocial = true,
  tabsSlot,
  children,
}: AccountLayoutProps) {
  const accountData = account || profile;
  const { isFollower } = useSocialFollowSync(
    accountData?.id,
    0,
    initialIsFollower,
  );

  const isPrivateLocked =
    enableSocial && accountData?.isPrivate && !isOwner && !isFollower;

  return (
    <main className="min-h-screen">
      <div className="relative z-10 w-full [overflow-anchor:none]">
        <div className="mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
          <AccountHero
            account={accountData}
            enableSocial={enableSocial}
            followersCount={followersCount}
            followingCount={followingCount}
          />
        </div>

        {tabsSlot ? (
          <div className="w-full border-b border-white/10">{tabsSlot}</div>
        ) : (
          <div className="w-full border-b border-white/10" />
        )}

        <div className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 sm:px-6 lg:px-8">
          {isPrivateLocked ? (
            <PrivateLockedView />
          ) : (
            <section className="w-full pt-6 sm:pt-8">
              {children || (
                <div className="text-sm text-white/50">DATA SECTION</div>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

export const AccountProfileLayout = AccountLayout;
