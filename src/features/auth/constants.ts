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
