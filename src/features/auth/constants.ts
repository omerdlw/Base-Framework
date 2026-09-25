import type { AuthRoutes, AuthState, OAuthProvider } from "./types";

export const AUTH_ROUTES: AuthRoutes = Object.freeze({
  CALLBACK: "/auth/callback",
  SIGN_IN: "/auth/sign-in",
});

export const OAUTH_PROVIDERS: readonly OAuthProvider[] = Object.freeze([
  "google",
  "github",
  "x",
]);

export const DEFAULT_MAX_AUTH_AGE_SECONDS = 600;

export const INITIAL_AUTH_STATE: AuthState = Object.freeze({
  error: null,
  isAuthenticated: false,
  isConfigured: false,
  isReady: false,
  session: null,
  user: null,
});

export const AUTH_EVENTS = Object.freeze({
  AUTH_ACCOUNT_DELETE_END: "AUTH_ACCOUNT_DELETE_END",
  AUTH_ACCOUNT_DELETE_START: "AUTH_ACCOUNT_DELETE_START",
  AUTH_ERROR: "AUTH_ERROR",
  AUTH_FEEDBACK: "AUTH_FEEDBACK",
  AUTH_READY: "AUTH_READY",
  AUTH_REFRESH: "AUTH_REFRESH",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTH_SIGN_IN: "AUTH_SIGN_IN",
  AUTH_SIGN_OUT: "AUTH_SIGN_OUT",
  AUTH_SIGN_UP: "AUTH_SIGN_UP",
  AUTH_UPDATE: "AUTH_UPDATE",
} as const);

export type AuthEventType = (typeof AUTH_EVENTS)[keyof typeof AUTH_EVENTS];

export interface AuthPageConfig {
  enabled?: boolean;
  openSignIn?: boolean;
  redirectTo?: string;
  [key: string]: unknown;
}

export function resolvePageAuth(effectiveConfig: unknown): {
  enabled: boolean;
  openSignIn?: boolean;
  [key: string]: unknown;
} {
  if (!effectiveConfig || typeof effectiveConfig !== "object") {
    return { enabled: false };
  }
  const authConfig = (effectiveConfig as { auth?: boolean | AuthPageConfig })
    .auth;
  if (!authConfig) return { enabled: false };
  if (authConfig === true) return { enabled: true, openSignIn: true };
  if (typeof authConfig === "object") return { enabled: true, ...authConfig };
  return { enabled: false };
}

declare module "@/core/events" {
  interface FrameworkEventMap {
    [AUTH_EVENTS.AUTH_ERROR]: {
      error?: unknown;
      message?: string;
      [key: string]: unknown;
    };
    [AUTH_EVENTS.AUTH_READY]: {
      session?: unknown;
      user?: unknown;
      [key: string]: unknown;
    };
    [AUTH_EVENTS.AUTH_REFRESH]: { session?: unknown; [key: string]: unknown };
    [AUTH_EVENTS.AUTH_REQUIRED]: {
      next?: string;
      reason?: string;
      redirectTo?: string;
      returnUrl?: string;
      source?: string;
      [key: string]: unknown;
    };
    [AUTH_EVENTS.AUTH_SIGN_IN]: {
      session?: unknown;
      user?: unknown;
      [key: string]: unknown;
    };
    [AUTH_EVENTS.AUTH_SIGN_OUT]: { reason?: string; [key: string]: unknown };
    [AUTH_EVENTS.AUTH_SIGN_UP]: {
      session?: unknown;
      user?: unknown;
      [key: string]: unknown;
    };
    [AUTH_EVENTS.AUTH_FEEDBACK]: {
      message?: string;
      type?: string;
      [key: string]: unknown;
    };
    [AUTH_EVENTS.AUTH_UPDATE]: { user?: unknown; [key: string]: unknown };
    [AUTH_EVENTS.AUTH_ACCOUNT_DELETE_START]: {
      userId?: string;
      [key: string]: unknown;
    };
    [AUTH_EVENTS.AUTH_ACCOUNT_DELETE_END]: {
      error?: unknown;
      status?: "success" | "failure" | string;
      success?: boolean;
      [key: string]: unknown;
    };
  }
}

declare module "@/core/orchestration" {
  interface PageConfig {
    auth?: boolean | AuthPageConfig;
  }
}

