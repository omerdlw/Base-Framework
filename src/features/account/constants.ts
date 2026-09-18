import type { AccountState } from "./types";

export const INITIAL_ACCOUNT_STATE: AccountState = Object.freeze({
  account: null,
  error: null,
  isLoading: false,
  profile: null,
});

export const USERNAME_PATTERN: RegExp =
  /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/;

export const UUID_PATTERN: RegExp =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PUBLIC_ACCOUNT_FIELDS =
  "id,username,display_name,avatar_url,banner_url,bio,is_private,created_at,updated_at";

export const DEFAULT_ACCOUNT_ICON = "solar:user-circle-bold";
export const NOTIFICATIONS_ICON = "solar:bell-bold";
export const NOTIFICATIONS_TITLE = "Notifications";
export const NOTIFICATIONS_ACTION_KEY = "social.notifications";
export const NOTIFICATIONS_ACTION_ORDER = -10;
export const SIGN_OUT_ACTION_KEY = "auth.sign-out";
export const SIGN_OUT_ACTION_ORDER = 30;

export const SOCIAL_EVENTS = Object.freeze({
  FOLLOW_CHANGE: "social:follow-change",
  INBOX_CHANGE: "social:inbox-change",
  NOTIFICATION_CHANGE: "social:notification-change",
} as const);

export type SocialEventType =
  (typeof SOCIAL_EVENTS)[keyof typeof SOCIAL_EVENTS];
