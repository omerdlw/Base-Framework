"use client";

import { motion } from "motion/react";
import {
  NAV_FADE_TRANSITION,
  textCrossfadeVariants,
  type SurfaceEntry,
} from "@/core/modules/nav";

const FALLBACK_BIO_TEXT = "No bio provided";
const DEFAULT_TITLE = "Account";

const BIO_CONTAINER_CLASS =
  "h-auto w-full overflow-y-auto rounded-[20px] bg-white/5 py-3 px-3.5 ring-1 ring-inset ring-white/5 scrollbar-none overscroll-contain";
const BIO_TEXT_CLASS =
  "select-text whitespace-pre-wrap break-words text-sm leading-relaxed text-justify text-white/70 sm:text-base";

export interface AccountBioData {
  account?: {
    username?: string;
    displayName?: string;
    display_name?: string;
    bio?: string | null;
    [key: string]: unknown;
  };
  profile?: {
    username?: string;
    displayName?: string;
    display_name?: string;
    bio?: string | null;
    [key: string]: unknown;
  };
  username?: string;
  displayName?: string;
  bio?: string | null;
  [key: string]: unknown;
}

export function createAccountBioSurfaceEntry(
  data: AccountBioData = {},
  config: Partial<SurfaceEntry> = {},
): SurfaceEntry {
  const account = data.account || data.profile || {};
  const username = data.username || account.username || "";

  const displayName = String(
    data.displayName ||
      account.displayName ||
      account.display_name ||
      username ||
      DEFAULT_TITLE,
  ).trim();

  const bio = data.bio ?? account.bio ?? "";

  return {
    component: AccountBioSurface,
    title: `${displayName} Bio`,
    props: { bio, data },
    ...config,
  };
}

export interface AccountBioSurfaceProps {
  bio?: string | null;
  data?: AccountBioData;
}

export function AccountBioSurface({ bio, data = {} }: AccountBioSurfaceProps) {
  const displayBio =
    bio ?? data.bio ?? (data.account || data.profile)?.bio ?? "";

  return (
    <motion.div
      animate="visible"
      className="flex flex-col gap-2.5"
      initial="hidden"
      transition={NAV_FADE_TRANSITION}
      variants={textCrossfadeVariants}
    >
      <div
        className={BIO_CONTAINER_CLASS}
        data-lenis-prevent
        data-lenis-prevent-wheel
      >
        <p className={BIO_TEXT_CLASS}>{displayBio || FALLBACK_BIO_TEXT}</p>
      </div>
    </motion.div>
  );
}

export default AccountBioSurface;
